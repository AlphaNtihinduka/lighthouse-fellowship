import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native'
import type { PublicNote } from '../../api/types'
import { colors, fonts } from '../../theme'
import { BlankWidthContext } from '../game/Blank'
import { blankWidth, blanksOf } from '../game/game'
import { useGame } from '../game/GameProvider'
import { ResultsSheet } from '../game/ResultsSheet'
import { TRAY_HEIGHT, WordBank } from '../game/WordBank'
import { saveLastOpened } from './lastOpened'
import { PaperFooter, PaperHeader, PaperItem } from './Paper'
import { toRenderItems, type RenderItem } from './renderItems'
import { PAGE_PADDING, usePages } from './usePages'

type Size = { width: number; height: number }

// Reader (PLAN §7): the note as pages that fit the screen, swiped left like a book.
// In Play and Review the word-bank tray sits under the page, so the page is shorter
// and the note is paginated for that height. The 3D page turn comes in phase 3b.
export function Reader({ note, initialPage = 0 }: { note: PublicNote; initialPage?: number }) {
  const [size, setSize] = useState<Size | null>(null)
  const { fontScale } = useWindowDimensions()
  const game = useGame()
  const withTray = Boolean(game && game.hasBlanks && game.mode !== 'read')
  // Survives the remount when the layout changes (e.g. Read ↔ Play): open near the same page.
  const [currentPage, setCurrentPage] = useState(initialPage)

  const width = useMemo(() => blankWidth(blanksOf(toRenderItems(note.blocks)), fontScale), [note.blocks, fontScale])

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout
    setSize((current) => (current && current.width === w && current.height === h ? current : { width: w, height: h }))
  }

  return (
    <BlankWidthContext.Provider value={width}>
      <View style={styles.area} onLayout={onLayout}>
        {size && (
          // Remount on anything that changes the layout: pages are measured from scratch.
          <PagedNote
            key={`${note.id}:${note.contentVersion}:${Math.round(size.width)}x${Math.round(size.height)}:${fontScale}:${withTray}`}
            note={note}
            size={size}
            withTray={withTray}
            initialPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </View>
      <ResultsSheet />
    </BlankWidthContext.Provider>
  )
}

type PagedNoteProps = {
  note: PublicNote
  size: Size
  withTray: boolean
  initialPage: number
  onPageChange: (page: number) => void
}

function PagedNote({ note, size, withTray, initialPage, onPageChange }: PagedNoteProps) {
  const pageHeight = size.height - CONTROLS_HEIGHT - (withTray ? TRAY_HEIGHT : 0)
  const [result, measurer] = usePages(note, size.width, pageHeight)
  const [page, setPage] = useState(0)
  const scroller = useRef<ScrollViewInstance>(null)
  const game = useGame()
  const pages = useMemo(() => (result.status === 'ready' ? result.pages : []), [result])
  const pageCount = pages.length
  const pageBlanks = useMemo(() => pages.map((items) => blanksOf(items)), [pages])

  // Open on the remembered page (or the last one, if the layout now has fewer). Once only:
  // after that the reader's own swipes decide the page.
  const positioned = useRef(false)
  useEffect(() => {
    if (pageCount === 0 || positioned.current) return
    positioned.current = true
    const start = Math.min(initialPage, pageCount - 1)
    setPage(start)
    requestAnimationFrame(() => scroller.current?.scrollTo({ x: start * size.width, animated: false }))
  }, [pageCount, initialPage, size.width])

  useEffect(() => {
    if (pageCount === 0) return
    onPageChange(page)
    saveLastOpened({ noteId: note.id, title: note.title, page })
  }, [note.id, note.title, page, pageCount, onPageChange])

  const goTo = (target: number) => {
    const clamped = Math.max(0, Math.min(pageCount - 1, target))
    scroller.current?.scrollTo({ x: clamped * size.width, animated: true })
    setPage(clamped)
  }

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / size.width))
    game?.selectChip(null)
  }

  const lastPage = page >= pageCount - 1
  const mode = game?.hasBlanks ? game.mode : 'read'

  return (
    <View style={styles.fill}>
      {measurer}
      {result.status === 'measuring' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={styles.fill}
          >
            {pages.map((items, index) => (
              <View key={index} style={{ width: size.width, height: pageHeight }}>
                <Page note={note} items={items} index={index} count={pageCount} />
              </View>
            ))}
          </ScrollView>

          {withTray && mode === 'play' && <WordBank noteId={note.id} pageIndex={page} pageBlanks={pageBlanks[page] ?? []} />}
          {withTray && mode === 'review' && game?.score && (
            <View style={styles.reviewBar}>
              <Text style={styles.reviewText}>
                {game.showAnswers
                  ? 'Showing the answers.'
                  : `${game.score.correct} of ${game.score.total} correct: right in green ✓, wrong in red ✗.`}
              </Text>
              <View style={styles.reviewButtons}>
                <SmallButton label={game.showAnswers ? 'Hide answers' : 'Show answers'} onPress={() => game.setShowAnswers(!game.showAnswers)} />
                <SmallButton label="Try again" onPress={game.tryAgain} />
              </View>
            </View>
          )}

          <View style={styles.controls}>
            <PageButton label="‹" accessibilityLabel="Previous page" disabled={page === 0} onPress={() => goTo(page - 1)} />
            <View style={styles.status}>
              <Text style={styles.pageCount} accessibilityLiveRegion="polite">
                {pageCount === 0 ? 'Empty note' : `Page ${page + 1} of ${pageCount}`}
              </Text>
              {mode === 'play' && game && (
                <Text style={styles.progress}>
                  {game.filledCount} of {game.blanks.length} blanks filled
                </Text>
              )}
            </View>
            {mode === 'play' && lastPage && game ? (
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Scores the whole note"
                onPress={game.finish}
                style={({ pressed }) => [styles.finish, pressed && styles.pressed]}
              >
                <Text style={styles.finishText}>Finish</Text>
              </Pressable>
            ) : (
              <PageButton label="›" accessibilityLabel="Next page" disabled={lastPage} onPress={() => goTo(page + 1)} />
            )}
          </View>
        </>
      )}
    </View>
  )
}

const Page = memo(function Page({ note, items, index, count }: { note: PublicNote; items: RenderItem[]; index: number; count: number }) {
  return (
    <View style={styles.sheet} accessibilityLabel={`Page ${index + 1} of ${count}`}>
      <PaperHeader title={note.title} coverImageUrl={note.coverImageUrl} continued={index > 0} />
      {/* Clipped: a block that could not be split (no line measurements) must never draw over the footer. */}
      <View style={styles.pageBody}>
        {items.map((item) => (
          <PaperItem key={item.key} item={item} />
        ))}
      </View>
      <PaperFooter preacherName={note.preacherName} sermonDate={note.sermonDate} showOver={index < count - 1} />
    </View>
  )
})

function PageButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string
  accessibilityLabel: string
  disabled: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.pageButton, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text style={styles.pageButtonText}>{label}</Text>
    </Pressable>
  )
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  )
}

const CONTROLS_HEIGHT = 60

const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: colors.backdrop },
  fill: { flex: 1 },
  pageBody: { flex: 1, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheet: { flex: 1, padding: PAGE_PADDING, backgroundColor: colors.paper },
  controls: {
    height: CONTROLS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.backdrop,
  },
  status: { alignItems: 'center' },
  pageCount: { fontFamily: fonts.sans, fontSize: 15, color: colors.navy },
  progress: { fontFamily: fonts.sans, fontSize: 13, color: colors.red, fontWeight: '600' },
  pageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  pageButtonText: { color: colors.surface, fontSize: 24, lineHeight: 26 },
  finish: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.red, justifyContent: 'center' },
  finishText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.7 },
  reviewBar: { height: TRAY_HEIGHT, backgroundColor: colors.navy, padding: 12, gap: 10, justifyContent: 'center' },
  reviewText: { color: colors.surface, fontFamily: fonts.sans, fontSize: 14 },
  reviewButtons: { flexDirection: 'row', gap: 10 },
  smallButton: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.yellow, justifyContent: 'center' },
  smallButtonText: { color: colors.navy, fontWeight: '700', fontSize: 14 },
})
