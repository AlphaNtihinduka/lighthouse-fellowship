import { createContext, useCallback, useContext } from 'react'
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type HostInstance } from 'react-native'
import type { BlankSegment } from '../../api/types'
import { colors, fonts } from '../../theme'
import { useGame } from './GameProvider'

// The same width for every blank of a note (game.ts blankWidth), set by the reader.
// The off-screen measuring pass uses the same value, so pages are packed with the
// blanks exactly as they will be drawn.
export const BlankWidthContext = createContext(80)

const LINE = 20

/**
 * A blank inside the running text. An inline view (allowed inside <Text>), so it can
 * be measured as a drop target and tapped. Its width never depends on its own answer.
 */
export function Blank({ segment }: { segment: BlankSegment }) {
  const game = useGame()
  const width = useContext(BlankWidthContext)
  const { fontScale } = useWindowDimensions()
  const height = Math.round(LINE * fontScale)

  // registerBlank is stable, so the ref is re-attached only if the blank itself changes.
  const registerBlank = game?.registerBlank
  const register = useCallback((view: HostInstance | null) => registerBlank?.(segment.blankId, view), [segment.blankId, registerBlank])

  // Reading, or the measuring pass: an empty line, like the paper.
  if (!game || game.mode === 'read') {
    return <View style={[styles.box, styles.empty, { width, height }]} accessible accessibilityLabel="blank" />
  }

  const chipId = game.placements[segment.blankId]
  const placed = chipId ? game.answerOfChip(chipId) : undefined
  const number = game.blankNumber(segment.blankId)
  const result = game.mode === 'review' ? game.score?.results.find((r) => r.blankId === segment.blankId) : undefined

  let label = placed ?? ''
  let tone: 'empty' | 'filled' | 'correct' | 'wrong' | 'answer' = placed ? 'filled' : 'empty'
  if (result) {
    if (game.showAnswers) {
      label = result.answer
      tone = 'answer'
    } else {
      tone = result.correct ? 'correct' : 'wrong'
      label = `${result.correct ? '✓' : '✗'} ${placed ?? ''}`.trim()
    }
  }
  const inviting = game.mode === 'play' && !placed && game.selectedChip !== null

  const description = result
    ? `${result.correct ? 'correct' : 'wrong'}${placed ? `, ${placed}` : ', empty'}${result.correct ? '' : `, answer ${result.answer}`}`
    : placed ?? 'empty'

  return (
    <Pressable
      ref={register}
      onPress={() => game.tapBlank(segment.blankId)}
      disabled={game.mode !== 'play'}
      accessibilityRole="button"
      accessibilityLabel={`blank ${number} of ${game.blanks.length}, ${description}`}
      hitSlop={6}
      style={[styles.box, styles[tone], inviting && styles.inviting, { width, height }]}
    >
      <Text style={[styles.text, tone === 'wrong' && styles.wrongText]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  box: {
    borderBottomWidth: 1.5,
    borderColor: colors.ink,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginHorizontal: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  empty: {},
  filled: { backgroundColor: '#FDF3D3' },
  inviting: { backgroundColor: '#FFF8E3', borderColor: colors.yellow, borderBottomWidth: 2.5 },
  correct: { backgroundColor: '#E3F1E4', borderColor: '#2E7D32' },
  wrong: { backgroundColor: '#FBE4E4', borderColor: colors.red },
  answer: { backgroundColor: '#E5EEF9', borderColor: '#1F5FA8' },
  text: { fontFamily: fonts.sans, fontSize: 14, fontWeight: '700', color: colors.ink, paddingHorizontal: 3 },
  wrongText: { color: colors.red },
})
