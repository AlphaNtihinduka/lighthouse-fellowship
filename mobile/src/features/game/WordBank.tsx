import { useRef, useState } from 'react'
import { StyleSheet, Text, View, type HostInstance } from 'react-native'
import { GestureDetector, ScrollView, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { colors, fonts } from '../../theme'
import { pageBank, type Blank, type Chip } from './game'
import { useGame } from './GameProvider'

// The tray under each page (PLAN §7): only this page's answers, shuffled.
//
// One row that scrolls sideways, so the tray keeps a fixed height however many blanks a
// page has (a page with 10 blanks used to wrap onto three rows and cover the controls).
// Swiping sideways scrolls the row; dragging a word upward lifts it onto the page.
// Because a scroll view clips its content, the lifted word is drawn as a "ghost" on the
// tray's root view, above the page, while the chip in the row is hidden.
export const TRAY_HEIGHT = 96

type Ghost = {
  x: SharedValue<number>
  y: SharedValue<number>
  // Window position of the tray, so window touch coordinates can place the ghost.
  originX: SharedValue<number>
  originY: SharedValue<number>
  // Where the finger is inside the chip, so the ghost doesn't jump under the finger.
  grabX: SharedValue<number>
  grabY: SharedValue<number>
  visible: SharedValue<number>
}

export function WordBank({ noteId, pageIndex, pageBlanks }: { noteId: string; pageIndex: number; pageBlanks: Blank[] }) {
  const game = useGame()
  const root = useRef<HostInstance>(null)
  const [lifted, setLifted] = useState<Chip | null>(null)
  const ghost: Ghost = {
    x: useSharedValue(0),
    y: useSharedValue(0),
    originX: useSharedValue(0),
    originY: useSharedValue(0),
    grabX: useSharedValue(0),
    grabY: useSharedValue(0),
    visible: useSharedValue(0),
  }
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghost.visible.get(),
    transform: [{ translateX: ghost.x.get() }, { translateY: ghost.y.get() }, { scale: 1.08 }],
  }))

  if (!game || game.mode !== 'play') return null
  const chips = pageBank(pageBlanks, game.placements, `${noteId}:${pageIndex}`)
  const measureTray = () =>
    root.current?.measureInWindow((x, y) => {
      ghost.originX.set(x)
      ghost.originY.set(y)
    })

  return (
    <View ref={root} style={styles.tray} onLayout={measureTray}>
      {pageBlanks.length === 0 ? (
        <Text style={styles.hint}>No blanks on this page.</Text>
      ) : chips.length === 0 ? (
        <Text style={styles.hint}>All blanks on this page are filled. Tap a filled blank to change it.</Text>
      ) : (
        <>
          <Text style={styles.hint} numberOfLines={1}>
            {game.selectedChip
              ? 'Now tap a blank.'
              : chips.length > 3
                ? `${chips.length} words: drag one up to a blank, or tap it. Swipe for more ›`
                : 'Drag a word up onto a blank, or tap it then a blank.'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {chips.map((chip) => (
              <DraggableChip
                key={chip.chipId}
                chip={chip}
                ghost={ghost}
                hidden={lifted?.chipId === chip.chipId}
                onLift={setLifted}
                pageBlankIds={pageBlanks.map((blank) => blank.blankId)}
                onBeforeLift={measureTray}
              />
            ))}
          </ScrollView>
        </>
      )}
      {lifted && (
        <Animated.View style={[styles.chip, styles.ghost, ghostStyle]} pointerEvents="none">
          <Text style={styles.chipText}>{lifted.answer}</Text>
        </Animated.View>
      )}
    </View>
  )
}

type ChipProps = {
  chip: Chip
  ghost: Ghost
  hidden: boolean
  onLift: (chip: Chip | null) => void
  onBeforeLift: () => void
  pageBlankIds: string[]
}

function DraggableChip({ chip, ghost, hidden, onLift, onBeforeLift, pageBlankIds }: ChipProps) {
  const game = useGame()!
  const selected = game.selectedChip === chip.chipId

  // JS-thread work only at the start and the end of a drag (mobile-app-builder: no
  // setState or measuring during the gesture itself).
  const onDragStart = () => {
    onBeforeLift()
    game.selectChip(null)
    game.measureBlanks(pageBlankIds)
    onLift(chip)
  }
  const onDrop = (absoluteX: number, absoluteY: number) => {
    game.dropChip(chip.chipId, absoluteX, absoluteY)
    onLift(null)
  }
  const onTap = () => game.selectChip(selected ? null : chip.chipId)

  const pan = usePanGesture({
    // Vertical movement lifts the word; a clearly sideways swipe fails this gesture so the
    // row can scroll. The sideways limit is generous: a tight one (14) cancelled real
    // upward drags that drift a little sideways in their first movement.
    activeOffsetY: [-8, 8],
    failOffsetX: [-30, 30],
    onActivate: (event) => {
      'worklet'
      ghost.grabX.set(event.x)
      ghost.grabY.set(event.y)
      ghost.x.set(event.absoluteX - event.x - ghost.originX.get())
      ghost.y.set(event.absoluteY - event.y - ghost.originY.get())
      ghost.visible.set(1)
      scheduleOnRN(onDragStart)
    },
    onUpdate: (event) => {
      'worklet'
      ghost.x.set(event.absoluteX - ghost.grabX.get() - ghost.originX.get())
      ghost.y.set(event.absoluteY - ghost.grabY.get() - ghost.originY.get())
    },
    onDeactivate: (event) => {
      'worklet'
      ghost.visible.set(0)
      scheduleOnRN(onDrop, event.absoluteX, event.absoluteY)
    },
  })
  const tap = useTapGesture({
    onDeactivate: (event) => {
      'worklet'
      if (!event.canceled) scheduleOnRN(onTap)
    },
  })
  const gesture = useExclusiveGestures(pan, tap)

  return (
    // touchAction (web only): the browser scrolls the row sideways itself and leaves
    // vertical movement to the drag; without it, the browser cancels the drag.
    <GestureDetector gesture={gesture} touchAction="pan-x">
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`word ${chip.answer}${selected ? ', selected' : ''}`}
        accessibilityHint="Then tap a blank to place it"
        style={[styles.chip, selected && styles.chipSelected, hidden && styles.chipHidden]}
      >
        <Text style={styles.chipText}>{chip.answer}</Text>
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  tray: {
    height: TRAY_HEIGHT,
    paddingTop: 8,
    backgroundColor: colors.navy,
    // The ghost is drawn over the page above the tray.
    overflow: 'visible',
    zIndex: 5,
  },
  hint: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.sans, fontSize: 13, marginBottom: 8, paddingHorizontal: 12 },
  row: { gap: 8, paddingHorizontal: 12, alignItems: 'center' },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.yellow,
  },
  chipSelected: { borderWidth: 3, borderColor: colors.surface },
  chipHidden: { opacity: 0 },
  chipText: { fontFamily: fonts.sans, fontSize: 16, fontWeight: '700', color: colors.navy },
  ghost: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
})
