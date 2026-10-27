import { describe, expect, it } from '@jest/globals'
import { clampPosition, pageAngle, shadeOpacity, turnEase, turnTarget, TURNED_ANGLE } from './pageTurn'

describe('pageAngle', () => {
  it('at rest, pages before the current one are turned away and the rest lie flat', () => {
    expect([0, 1, 2, 3].map((i) => pageAngle(i, 2))).toEqual([TURNED_ANGLE, TURNED_ANGLE, 0, 0])
  })

  it('the current page rotates with the drag, eased to swing away early', () => {
    expect(pageAngle(2, 2.5)).toBeCloseTo(-90 * turnEase(0.5))
    expect(pageAngle(2, 2.5)).toBeLessThan(-55)
    expect(pageAngle(3, 2.5)).toBe(0)
  })

  it('the easing starts at 0, ends at a full turn and never goes backwards', () => {
    expect(turnEase(0)).toBe(0)
    expect(turnEase(1)).toBe(1)
    const samples = Array.from({ length: 11 }, (_, i) => turnEase(i / 10))
    expect(samples.every((value, i) => i === 0 || value >= samples[i - 1])).toBe(true)
  })

  it('turning back brings the previous page in from edge-on', () => {
    // From page 2 dragged back 30%: position 1.7, page 1 is 70% turned.
    expect(pageAngle(1, 1.7)).toBeCloseTo(-90 * turnEase(0.7))
    expect(pageAngle(2, 1.7)).toBe(0)
  })
})

describe('shadeOpacity', () => {
  it('is off at rest', () => {
    expect(shadeOpacity(3, 2)).toBe(0)
    expect(shadeOpacity(2, 2)).toBe(0)
  })

  it('shadows the page underneath most at the start of a turn', () => {
    expect(shadeOpacity(3, 2.1)).toBeCloseTo(0.315)
    expect(shadeOpacity(3, 2.9)).toBeCloseTo(0.035)
    expect(shadeOpacity(2, 2.9)).toBeCloseTo(0.225)
  })
})

describe('turnTarget', () => {
  it('turns forward when dragged past a quarter of the page or flicked left', () => {
    expect(turnTarget(1, 1.3, 0, 4)).toBe(2)
    expect(turnTarget(1, 1.05, -900, 4)).toBe(2)
  })

  it('turns back when dragged the other way or flicked right', () => {
    expect(turnTarget(2, 1.7, 0, 4)).toBe(1)
    expect(turnTarget(2, 1.95, 900, 4)).toBe(1)
  })

  it('springs back on a small, slow drag', () => {
    expect(turnTarget(1, 1.15, -100, 4)).toBe(1)
    expect(turnTarget(1, 0.9, 100, 4)).toBe(1)
  })

  it('stays within the note', () => {
    expect(turnTarget(3, 3.4, -900, 4)).toBe(3)
    expect(turnTarget(0, 0, 900, 4)).toBe(0)
  })
})

describe('clampPosition', () => {
  it('keeps the drag inside the first and last page', () => {
    expect(clampPosition(-0.4, 4)).toBe(0)
    expect(clampPosition(3.6, 4)).toBe(3)
    expect(clampPosition(1.5, 4)).toBe(1.5)
    expect(clampPosition(2, 0)).toBe(0)
  })
})
