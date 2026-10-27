import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import type { PublicNote } from '../../api/types'
import { NoGame } from '../game/GameProvider'
import { planPages, type LineInfo, type MeasuredUnit } from './paginate'
import { PaperFooter, PaperHeader, PaperItem } from './Paper'
import { splitItem, toRenderItems, type RenderItem } from './renderItems'

export const PAGE_PADDING = 18

// Splits needed for a normal note are a handful; this only stops a runaway loop if
// measurements ever disagree with themselves.
const MAX_SPLITS = 40

type Measure = { height?: number; lines?: LineInfo[] }

// onTextLayout does not exist on web; there scripture is measured but never split.
const needsLines = (item: RenderItem) => item.kind === 'scripture-part' && Platform.OS !== 'web'

function isMeasured(item: RenderItem, measures: Record<string, Measure>) {
  const measure = measures[item.key]
  return measure?.height !== undefined && (!needsLines(item) || measure.lines !== undefined)
}

export type PagesResult = { status: 'measuring' } | { status: 'ready'; pages: RenderItem[][] }

/**
 * Measures every item off-screen at the real page size and font scale, then packs them
 * with planPages. When a scripture must be split, the two parts are measured and the
 * plan runs again. The caller remounts this (React key) when the note, the page size or
 * the font scale changes, so old measurements are never reused.
 *
 * Returns the hidden measuring view to render, and the pages once they are known.
 */
export function usePages(note: PublicNote, pageWidth: number, pageHeight: number): [PagesResult, ReactNode] {
  const [items, setItems] = useState<RenderItem[]>(() => toRenderItems(note.blocks))
  const [measures, setMeasures] = useState<Record<string, Measure>>({})
  const [chrome, setChrome] = useState<{ header?: number; footer?: number }>({})
  const [splits, setSplits] = useState(0)

  const update = useCallback((key: string, patch: Measure) => {
    setMeasures((current) => ({ ...current, [key]: { ...current[key], ...patch } }))
  }, [])

  const result = useMemo<{ pages: RenderItem[][] } | { split: { key: string; at: number } } | null>(() => {
    if (chrome.header === undefined || chrome.footer === undefined || !items.every((item) => isMeasured(item, measures))) return null
    const contentHeight = pageHeight - 2 * PAGE_PADDING - chrome.header - chrome.footer
    const units: MeasuredUnit[] = items.map((item) => ({
      key: item.key,
      height: measures[item.key].height ?? 0,
      keepWithNext: item.kind === 'block' && item.block.type === 'HEADING',
      split:
        item.kind === 'scripture-part' && measures[item.key].lines
          ? { text: item.text, lines: measures[item.key].lines! }
          : undefined,
    }))
    const plan = planPages(units, contentHeight)
    if (plan.kind === 'split' && splits < MAX_SPLITS) return { split: { key: plan.key, at: plan.at } }
    if (plan.kind === 'split') return { pages: items.map((item) => [item]) }
    const byKey = new Map(items.map((item) => [item.key, item]))
    return { pages: plan.pages.map((keys) => keys.map((key) => byKey.get(key)!)) }
  }, [items, measures, chrome, pageHeight, splits])

  // A split replaces one part by two, which then get measured. Updating state during
  // render is React's pattern for state derived from the previous render; it can't loop,
  // because the two new parts are unmeasured, so the next render plans nothing.
  if (result && 'split' in result) {
    const next = splitItem(items, result.split.key, result.split.at)
    if (next.length !== items.length) {
      setItems(next)
      setSplits((count) => count + 1)
    }
  }

  const pending = items.filter((item) => !isMeasured(item, measures))
  // NoGame: blanks are measured as plain lines and never register as drop targets.
  const measurer = (
    <NoGame>
    <View style={[styles.measurer, { width: pageWidth - 2 * PAGE_PADDING }]} pointerEvents="none" aria-hidden>
      {chrome.header === undefined && (
        <View onLayout={(event) => setChrome((c) => ({ ...c, header: height(event) }))}>
          <PaperHeader title={note.title} coverImageUrl={note.coverImageUrl} continued />
        </View>
      )}
      {chrome.footer === undefined && (
        <View onLayout={(event) => setChrome((c) => ({ ...c, footer: height(event) }))}>
          <PaperFooter preacherName={note.preacherName} sermonDate={note.sermonDate} showOver />
        </View>
      )}
      {pending.map((item) => (
        <View key={item.key} onLayout={(event) => update(item.key, { height: height(event) })}>
          <PaperItem item={item} onScriptureLines={needsLines(item) ? (lines) => update(item.key, { lines }) : undefined} />
        </View>
      ))}
    </View>
    </NoGame>
  )

  const pagesResult: PagesResult =
    result && 'pages' in result ? { status: 'ready', pages: result.pages } : { status: 'measuring' }
  return [pagesResult, measurer]
}

const height = (event: LayoutChangeEvent) => event.nativeEvent.layout.height

const styles = StyleSheet.create({
  // Laid out normally (so text wraps at the real width) but invisible and off to the side.
  measurer: { position: 'absolute', left: -10000, top: 0, opacity: 0 },
})
