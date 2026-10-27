import { useEffect, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { clampPosition, pageAngle, shadeOpacity, TURNED_ANGLE, turnTarget } from './pageTurn'

type Props = {
  width: number
  height: number
  pageCount: number
  // The page shown at rest. Changing it from outside (the ‹ › buttons) animates a turn.
  page: number
  onPageChange: (page: number) => void
  renderPage: (index: number) => ReactNode
}

const TURN_DURATION = 380

/**
 * Book-like page turn (PLAN §7): the page follows the finger, rotating in 3D around its
 * left edge, with a moving shadow on the page underneath. It snaps forward or back on
 * release depending on distance and speed.
 *
 * All pages stay mounted and stacked; one shared `position` drives every page's
 * rotation on the UI thread. Nothing re-renders or measures during a drag, and no page
 * is re-created when a turn completes, so there is no flicker (mobile-app-builder:
 * gestures stay on the UI thread, animate transform and opacity only).
 */
export function PageTurner({ width, height, pageCount, page, onPageChange, renderPage }: Props) {
  const position = useSharedValue(page)
  const start = useSharedValue(page)
  const reduceMotion = useReducedMotion()
  const duration = reduceMotion ? 0 : TURN_DURATION

  // Buttons (or a restored page) move `page` from outside: turn to it.
  useEffect(() => {
    if (Math.round(position.get()) !== page) position.set(withTiming(page, { duration }))
  }, [page, duration, position])

  const pan = usePanGesture({
    // Horizontal swipes only: taps on blanks and vertical movement pass through.
    activeOffsetX: [-12, 12],
    failOffsetY: [-24, 24],
    onActivate: () => {
      'worklet'
      start.set(Math.round(position.get()))
    },
    onUpdate: (event) => {
      'worklet'
      position.set(clampPosition(start.get() - event.translationX / width, pageCount))
    },
    onDeactivate: (event) => {
      'worklet'
      const target = turnTarget(start.get(), position.get(), event.velocityX, pageCount)
      position.set(
        withTiming(target, { duration }, (finished) => {
          if (finished) scheduleOnRN(onPageChange, target)
        }),
      )
    },
  })

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width, height }} accessibilityHint="Swipe left or right to turn the page">
        {Array.from({ length: pageCount }, (_, index) => (
          <TurningPage key={index} index={index} pageCount={pageCount} position={position} width={width} height={height}>
            {renderPage(index)}
          </TurningPage>
        ))}
      </View>
    </GestureDetector>
  )
}

function TurningPage({
  index,
  pageCount,
  position,
  width,
  height,
  children,
}: {
  index: number
  pageCount: number
  position: SharedValue<number>
  width: number
  height: number
  children: ReactNode
}) {
  const pageStyle = useAnimatedStyle(() => {
    const angle = pageAngle(index, position.get())
    return {
      transform: [{ perspective: 1400 }, { rotateY: `${angle}deg` }],
      // Edge-on pages are hidden so they never catch a touch or show a sliver.
      opacity: angle <= TURNED_ANGLE + 0.5 ? 0 : 1,
      // Earlier pages lie on top of later ones, like a stack of sheets.
      zIndex: pageCount - index,
    }
  })
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shadeOpacity(index, position.get()) }))

  return (
    <Animated.View style={[styles.page, { width, height }, pageStyle]}>
      {children}
      <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]} pointerEvents="none" />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    // The spine: pages rotate around their left edge.
    transformOrigin: 'left center',
    backfaceVisibility: 'hidden',
  },
  shade: { backgroundColor: '#000' },
})
