import { StyleSheet, Text, View } from 'react-native'
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { colors, fonts } from '../../theme'
import { pageBank, type Blank, type Chip } from './game'
import { useGame } from './GameProvider'

// The tray under each page (PLAN §7): only this page's answers, shuffled. Drag a chip
// onto a blank, or tap a chip and then a blank.
export const TRAY_HEIGHT = 112

export function WordBank({ noteId, pageIndex, pageBlanks }: { noteId: string; pageIndex: number; pageBlanks: Blank[] }) {
  const game = useGame()
  if (!game || game.mode !== 'play') return null

  const chips = pageBank(pageBlanks, game.placements, `${noteId}:${pageIndex}`)

  return (
    <View style={styles.tray}>
      {pageBlanks.length === 0 ? (
        <Text style={styles.hint}>No blanks on this page.</Text>
      ) : chips.length === 0 ? (
        <Text style={styles.hint}>All blanks on this page are filled. Tap a filled blank to change it.</Text>
      ) : (
        <>
          <Text style={styles.hint}>
            {game.selectedChip ? 'Now tap a blank.' : 'Drag a word onto a blank, or tap a word and then a blank.'}
          </Text>
          <View style={styles.chips}>
            {chips.map((chip) => (
              <DraggableChip key={chip.chipId} chip={chip} pageBlankIds={pageBlanks.map((blank) => blank.blankId)} />
            ))}
          </View>
        </>
      )}
    </View>
  )
}

function DraggableChip({ chip, pageBlankIds }: { chip: Chip; pageBlankIds: string[] }) {
  const game = useGame()!
  const selected = game.selectedChip === chip.chipId
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const lifted = useSharedValue(0)

  // JS-thread work happens only at the start and the end of a drag (mobile-app-builder:
  // no setState or measuring during the gesture itself).
  const onDragStart = () => {
    game.selectChip(null)
    game.measureBlanks(pageBlankIds)
  }
  const onDrop = (absoluteX: number, absoluteY: number) => {
    game.dropChip(chip.chipId, absoluteX, absoluteY)
  }
  const onTap = () => game.selectChip(selected ? null : chip.chipId)

  const pan = usePanGesture({
    minDistance: 6,
    onActivate: () => {
      'worklet'
      lifted.value = withSpring(1)
      scheduleOnRN(onDragStart)
    },
    onUpdate: (event) => {
      'worklet'
      x.value = event.translationX
      y.value = event.translationY
    },
    onDeactivate: (event) => {
      'worklet'
      scheduleOnRN(onDrop, event.absoluteX, event.absoluteY)
      // Back to the tray; if it landed, the chip leaves the tray on the next render.
      x.value = withSpring(0)
      y.value = withSpring(0)
      lifted.value = withSpring(0)
    },
  })
  const tap = useTapGesture({
    onDeactivate: (event) => {
      'worklet'
      if (!event.canceled) scheduleOnRN(onTap)
    },
  })
  const gesture = useExclusiveGestures(pan, tap)

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: 1 + lifted.value * 0.08 }],
    zIndex: lifted.value > 0 ? 10 : 0,
    shadowOpacity: lifted.value * 0.25,
    elevation: lifted.value * 6,
  }))

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`word ${chip.answer}${selected ? ', selected' : ''}`}
        accessibilityHint="Then tap a blank to place it"
        style={[styles.chip, selected && styles.chipSelected, animated]}
      >
        <Text style={styles.chipText}>{chip.answer}</Text>
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  tray: {
    height: TRAY_HEIGHT,
    paddingHorizontal: 12,
    paddingTop: 6,
    backgroundColor: colors.navy,
    // Lifted chips are drawn over the page above the tray.
    overflow: 'visible',
    zIndex: 5,
  },
  hint: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.sans, fontSize: 13, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, overflow: 'visible' },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.yellow,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  chipSelected: { borderWidth: 3, borderColor: colors.surface },
  chipText: { fontFamily: fonts.sans, fontSize: 16, fontWeight: '700', color: colors.navy },
})
