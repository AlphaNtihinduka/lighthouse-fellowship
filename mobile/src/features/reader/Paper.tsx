import { Image } from 'expo-image'
import { memo } from 'react'
import { StyleSheet, Text, View, type TextLayoutEvent } from 'react-native'
import type { Segment } from '../../api/types'
import { colors, fonts } from '../../theme'
import { paperDateLabel } from '../archive/groupNotes'
import { Blank } from '../game/Blank'
import type { LineInfo } from './paginate'
import { scriptureText, type RenderItem } from './renderItems'

// The printed sheet, matched to docs/brand/sample-notes/ and to the dashboard's
// PaperFrame.tsx: same header, footer and block styles.

// Vertical padding inside every item. It is part of the measured height, so the
// spacing between blocks is the same in the measuring pass and on the page.
export const ITEM_PADDING = 6

export function PaperHeader({ title, coverImageUrl, continued }: { title: string; coverImageUrl: string | null; continued: boolean }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {coverImageUrl ? (
          <Image style={styles.cover} source={coverImageUrl} contentFit="cover" cachePolicy="disk" />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]} />
        )}
        <View style={styles.headerRight}>
          <Text style={styles.kicker}>Sermon Notes</Text>
          <View style={styles.rule} />
        </View>
      </View>
      <Text style={styles.title}>
        {title}
        {continued && <Text style={styles.continued}>{" (con't)"}</Text>}
      </Text>
    </View>
  )
}

export function PaperFooter({ preacherName, sermonDate, showOver }: { preacherName: string; sermonDate: string; showOver: boolean }) {
  return (
    <View style={styles.footer}>
      {/* Kept in the layout on the last page too (empty), so every page has the same height. */}
      <Text style={styles.over}>{showOver ? '(over)' : ' '}</Text>
      <View style={styles.doubleRule} />
      <View style={styles.footerText}>
        <Text style={styles.footerLeft}>
          {preacherName}
          {'\n'}Lighthouse Fellowship Napoli
        </Text>
        <Text style={styles.footerRight}>{paperDateLabel(sermonDate)}</Text>
      </View>
    </View>
  )
}

// Blanks are inline boxes inside the running text: an empty line when reading, a drop
// target in the game. The text around a blank already carries its own spaces.
function Line({ segments }: { segments: Segment[] }) {
  return segments.map((segment, index) =>
    'blankId' in segment ? <Blank key={segment.blankId} segment={segment} /> : <Text key={index}>{segment.text}</Text>,
  )
}

type ItemProps = {
  item: RenderItem
  // Only the measuring pass passes this: where each line of a scripture part ends.
  onScriptureLines?: (lines: LineInfo[]) => void
}

export const PaperItem = memo(function PaperItem({ item, onScriptureLines }: ItemProps) {
  if (item.kind === 'scripture-part') {
    const printed = scriptureText(item)
    const prefix = item.isFirst ? 1 : 0 // the opening quote is not part of item.text
    const handleTextLayout = onScriptureLines
      ? (event: TextLayoutEvent) => {
          let end = 0
          onScriptureLines(
            event.nativeEvent.lines.map((line) => {
              end += line.text.length
              return {
                end: Math.max(0, Math.min(item.text.length, end - prefix)),
                bottom: ITEM_PADDING + line.y + line.height,
              }
            }),
          )
        }
      : undefined
    return (
      <View style={styles.item}>
        <Text style={styles.scripture} onTextLayout={handleTextLayout}>
          {printed}
        </Text>
        {item.isLast && <Text style={styles.reference}>– {item.reference}</Text>}
      </View>
    )
  }

  const { block } = item
  switch (block.type) {
    case 'HEADING':
      return (
        <View style={[styles.item, styles.headingRow]}>
          {item.headingNumber && <Text style={styles.heading}>{item.headingNumber}. </Text>}
          <Text style={[styles.heading, styles.headingText]}>
            <Line segments={block.segments} />
          </Text>
        </View>
      )
    case 'PARAGRAPH':
      return (
        <View style={styles.item}>
          <Text style={[styles.body, block.align === 'CENTER' && styles.center]}>
            <Line segments={block.segments} />
          </Text>
        </View>
      )
    case 'LIST':
      return (
        <View style={styles.item}>
          {block.items.map((line, index) => (
            <View key={index} style={styles.listRow}>
              <Text style={[styles.body, styles.listNumber]}>{index + 1}.</Text>
              <Text style={[styles.body, styles.listText]}>
                <Line segments={line} />
              </Text>
            </View>
          ))}
        </View>
      )
    case 'REFLECTION':
      return (
        <View style={styles.item}>
          <Text style={[styles.body, styles.bold]}>{block.prompt}</Text>
          <Text style={[styles.body, styles.italic]}>Notes:</Text>
          <View style={styles.notesLine} />
          <View style={styles.notesLine} />
          <View style={styles.notesLine} />
        </View>
      )
    default:
      return null
  }
})

const styles = StyleSheet.create({
  header: { marginBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-end' },
  cover: { width: '22%', aspectRatio: 3 / 2 },
  coverEmpty: { backgroundColor: colors.border },
  headerRight: { flex: 1, justifyContent: 'flex-end' },
  // Centred on the whole page as on the sheet: shift left by the picture's width.
  kicker: {
    fontFamily: fonts.serif,
    fontWeight: '700',
    fontSize: 21,
    color: colors.maroon,
    textAlign: 'center',
    marginLeft: '-28%',
    marginBottom: 4,
  },
  rule: { height: 1.5, backgroundColor: colors.maroon },
  title: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, textAlign: 'center', marginTop: 4 },
  continued: { fontSize: 11 },

  footer: { marginTop: 6 },
  over: { fontFamily: fonts.serif, fontSize: 12, color: colors.ink, textAlign: 'right', marginBottom: 2 },
  doubleRule: { borderTopWidth: 3.5, borderBottomWidth: 1, borderColor: '#333333', height: 7 },
  footerText: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5 },
  footerLeft: { fontFamily: fonts.serif, fontSize: 12, color: colors.ink, lineHeight: 16 },
  footerRight: { fontFamily: fonts.serif, fontSize: 12, color: colors.ink },

  item: { paddingVertical: ITEM_PADDING },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: colors.ink },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  center: { textAlign: 'center' },
  headingRow: { flexDirection: 'row', paddingTop: 10 },
  heading: { fontFamily: fonts.sans, fontWeight: '700', fontSize: 16, lineHeight: 22, color: colors.ink },
  headingText: { flex: 1 },
  scripture: { fontFamily: fonts.sans, fontStyle: 'italic', fontWeight: '700', fontSize: 15, lineHeight: 21, color: colors.ink },
  reference: { fontFamily: fonts.sans, fontWeight: '700', fontSize: 15, lineHeight: 21, color: colors.ink, textAlign: 'right' },
  listRow: { flexDirection: 'row', marginVertical: 2 },
  listNumber: { width: 24 },
  listText: { flex: 1 },
  notesLine: { height: 22, borderBottomWidth: 1, borderColor: colors.border },
})
