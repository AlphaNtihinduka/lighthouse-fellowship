// Page-turn maths for PageTurner (PLAN §7). `position` is a float page index: 2.3 means
// page 2 is turned 30% of the way, showing page 3 underneath. Pure functions marked as
// worklets so they run on the UI thread during the gesture and in Jest unchanged.

// A page turned this far is edge-on: invisible, out of the way.
export const TURNED_ANGLE = -90

// Eased so the page swings away quickly at first and the next page shows early in the
// drag; a straight line looked like the page only tilting.
export function turnEase(progress: number): number {
  'worklet'
  return 1 - Math.pow(1 - progress, 1.6)
}

// Rotation of page `index` around its left edge, in degrees.
export function pageAngle(index: number, position: number): number {
  'worklet'
  const turning = Math.floor(position)
  if (index < turning) return TURNED_ANGLE
  // Written so a page at rest is exactly 0, not -0.
  if (index === turning && position > turning) return TURNED_ANGLE * turnEase(position - turning)
  return 0
}

// Darkening: the page underneath sits in the shadow of the turning page, and the
// turning page itself darkens as it tilts away from the light.
export function shadeOpacity(index: number, position: number): number {
  'worklet'
  const turning = Math.floor(position)
  const progress = position - turning
  if (progress === 0) return 0
  if (index === turning + 1) return 0.35 * (1 - progress)
  if (index === turning) return 0.25 * progress
  return 0
}

const DISTANCE_THRESHOLD = 0.25 // a quarter of the page width
const VELOCITY_THRESHOLD = 600 // points per second: a quick flick turns the page

// Where a released drag settles: the next or previous page if dragged far enough or
// flicked, otherwise back where it started.
export function turnTarget(start: number, position: number, velocityX: number, pageCount: number): number {
  'worklet'
  const moved = position - start
  let target = start
  if (moved > DISTANCE_THRESHOLD || velocityX < -VELOCITY_THRESHOLD) target = start + 1
  else if (moved < -DISTANCE_THRESHOLD || velocityX > VELOCITY_THRESHOLD) target = start - 1
  return Math.max(0, Math.min(pageCount - 1, target))
}

export function clampPosition(value: number, pageCount: number): number {
  'worklet'
  return Math.max(0, Math.min(Math.max(0, pageCount - 1), value))
}
