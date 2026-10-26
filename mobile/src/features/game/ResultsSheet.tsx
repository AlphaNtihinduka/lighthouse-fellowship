import { useEffect } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { colors, fonts } from '../../theme'
import { useGame } from './GameProvider'

// One score for the whole note, shown once after "Finish" (PLAN §7), with a small
// celebration for a high score.
export function ResultsSheet() {
  const game = useGame()
  const pop = useSharedValue(0)
  const open = Boolean(game?.resultsOpen && game.score)

  useEffect(() => {
    if (open) pop.value = withSequence(withTiming(0, { duration: 0 }), withSpring(1, { damping: 9 }))
  }, [open, pop])

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + pop.value * 0.4 }], opacity: pop.value }))

  if (!game || !game.score) return null
  const { correct, total, results } = game.score
  const ratio = total === 0 ? 0 : correct / total
  const missed = results.filter((result) => !result.correct)
  const message =
    ratio === 1 ? 'Perfect! Every blank is right.' : ratio >= 0.8 ? 'Well done!' : ratio >= 0.5 ? 'Good effort!' : 'Keep going, try again!'

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={game.closeResults}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <Animated.View style={[styles.badge, ratio >= 0.8 && styles.badgeHigh, popStyle]}>
            <Text style={[styles.score, ratio >= 0.8 && styles.scoreHigh]} accessibilityLabel={`${correct} out of ${total} correct`}>
              {correct} / {total}
            </Text>
          </Animated.View>
          <Text style={styles.message}>{message}</Text>

          {missed.length > 0 && (
            <ScrollView style={styles.missed} contentContainerStyle={{ gap: 6 }}>
              <Text style={styles.missedTitle}>Answers you missed</Text>
              {missed.map((result) => (
                <Text key={result.blankId} style={styles.missedRow}>
                  <Text style={styles.answer}>{result.answer}</Text>
                  {result.placed ? <Text style={styles.yours}>  (you put “{result.placed}”)</Text> : <Text style={styles.yours}>  (left empty)</Text>}
                </Text>
              ))}
            </ScrollView>
          )}

          <SheetButton
            label="Review on the pages"
            onPress={() => {
              game.setShowAnswers(false)
              game.closeResults()
            }}
          />
          <SheetButton
            label="Show all answers"
            secondary
            onPress={() => {
              game.setShowAnswers(true)
              game.closeResults()
            }}
          />
          <SheetButton label="Try again" secondary onPress={game.tryAgain} />
        </View>
      </View>
    </Modal>
  )
}

function SheetButton({ label, onPress, secondary }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, pressed && { opacity: 0.8 }]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,42,74,0.45)' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
    alignItems: 'stretch',
    maxHeight: '85%',
  },
  badge: {
    alignSelf: 'center',
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  badgeHigh: { backgroundColor: colors.yellow },
  score: { fontFamily: fonts.serif, fontSize: 36, fontWeight: '700', color: colors.paper },
  scoreHigh: { color: colors.navy },
  message: { fontFamily: fonts.serif, fontSize: 22, color: colors.navy, textAlign: 'center' },
  missed: { maxHeight: 180 },
  missedTitle: { fontFamily: fonts.sans, fontSize: 14, fontWeight: '700', color: colors.muted },
  missedRow: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  answer: { fontWeight: '700', color: colors.ink },
  yours: { color: colors.muted },
  button: { minHeight: 48, borderRadius: 10, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.navy },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  buttonTextSecondary: { color: colors.navy },
})
