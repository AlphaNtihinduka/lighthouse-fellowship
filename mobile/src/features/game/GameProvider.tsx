import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { HostInstance } from 'react-native'
import type { PublicNote } from '../../api/types'
import { toRenderItems } from '../reader/renderItems'
import { blanksOf, place, removeFromBlank, scoreNote, type Blank, type Placements, type Score } from './game'
import { loadProgress, recordAttempt, saveProgress } from './progress'

export type GameMode = 'read' | 'play' | 'review'

type Rect = { x: number; y: number; width: number; height: number }

export type GameValue = {
  mode: GameMode
  setMode: (mode: GameMode) => void
  hasBlanks: boolean
  blanks: Blank[]
  placements: Placements
  answerOfChip: (chipId: string) => string | undefined
  // Tap chip, then tap blank (always available, alongside drag-and-drop).
  selectedChip: string | null
  selectChip: (chipId: string | null) => void
  tapBlank: (blankId: string) => void
  // Drag-and-drop: blank positions are measured when a drag starts, then the drop
  // point is hit-tested against them.
  registerBlank: (blankId: string, view: HostInstance | null) => void
  measureBlanks: (blankIds: string[]) => void
  dropChip: (chipId: string, x: number, y: number) => boolean
  filledCount: number
  score: Score | null
  showAnswers: boolean
  setShowAnswers: (show: boolean) => void
  finish: () => void
  tryAgain: () => void
  resultsOpen: boolean
  closeResults: () => void
  blankNumber: (blankId: string) => number
}

const GameContext = createContext<GameValue | null>(null)

// Null inside the off-screen measuring pass and in plain reading: blanks are then drawn
// as empty, non-interactive lines.
export function useGame() {
  return useContext(GameContext)
}

// Lets the measuring pass switch interactivity off for its subtree.
export function NoGame({ children }: { children: ReactNode }) {
  return <GameContext.Provider value={null}>{children}</GameContext.Provider>
}

// Drop tolerance: a chip released near a blank, not exactly on it, still lands.
const DROP_SLOP = 16

export function GameProvider({ note, children }: { note: PublicNote; children: ReactNode }) {
  const blanks = useMemo(() => blanksOf(toRenderItems(note.blocks)), [note.blocks])
  const hasBlanks = blanks.length > 0

  const [mode, setMode] = useState<GameMode>(hasBlanks ? 'play' : 'read')
  const [placements, setPlacements] = useState<Placements>({})
  const [selectedChip, setSelectedChip] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const loaded = useRef(false)

  // Pick up where the visitor left off (placements, or the finished review).
  useEffect(() => {
    let cancelled = false
    loadProgress(note.id, note.contentVersion).then((saved) => {
      if (cancelled) return
      if (saved) {
        setPlacements(saved.placements)
        setFinished(saved.finished)
        if (saved.finished && hasBlanks) setMode('review')
      }
      loaded.current = true
    })
    return () => {
      cancelled = true
    }
  }, [note.id, note.contentVersion, hasBlanks])

  useEffect(() => {
    if (loaded.current) saveProgress(note.id, note.contentVersion, { placements, finished })
  }, [note.id, note.contentVersion, placements, finished])

  const answers = useMemo(() => new Map(blanks.map((blank) => [blank.blankId, blank.answer])), [blanks])
  const numbers = useMemo(() => new Map(blanks.map((blank, index) => [blank.blankId, index + 1])), [blanks])
  const score = useMemo(() => (finished ? scoreNote(blanks, placements) : null), [finished, blanks, placements])

  const blankViews = useRef(new Map<string, HostInstance>())
  const blankRects = useRef(new Map<string, Rect>())

  const tapBlank = useCallback(
    (blankId: string) => {
      if (mode !== 'play') return
      if (selectedChip) {
        setPlacements((current) => place(current, selectedChip, blankId))
        setSelectedChip(null)
      } else if (placements[blankId]) {
        // Tapping a filled blank sends its word back to the tray.
        setPlacements((current) => removeFromBlank(current, blankId))
      }
    },
    [mode, selectedChip, placements],
  )

  const registerBlank = useCallback((blankId: string, view: HostInstance | null) => {
    if (view) blankViews.current.set(blankId, view)
    else blankViews.current.delete(blankId)
  }, [])

  const measureBlanks = useCallback((blankIds: string[]) => {
    blankRects.current.clear()
    for (const blankId of blankIds) {
      blankViews.current.get(blankId)?.measureInWindow((x, y, width, height) => {
        blankRects.current.set(blankId, { x, y, width, height })
      })
    }
  }, [])

  const dropChip = useCallback((chipId: string, x: number, y: number) => {
    let target: string | null = null
    let bestDistance = Infinity
    for (const [blankId, rect] of blankRects.current) {
      const inside =
        x >= rect.x - DROP_SLOP && x <= rect.x + rect.width + DROP_SLOP && y >= rect.y - DROP_SLOP && y <= rect.y + rect.height + DROP_SLOP
      if (!inside) continue
      const distance = Math.hypot(x - (rect.x + rect.width / 2), y - (rect.y + rect.height / 2))
      if (distance < bestDistance) {
        bestDistance = distance
        target = blankId
      }
    }
    if (!target) return false
    const blankId = target
    setPlacements((current) => place(current, chipId, blankId))
    setSelectedChip(null)
    return true
  }, [])

  const finish = useCallback(() => {
    const result = scoreNote(blanks, placements)
    setFinished(true)
    setMode('review')
    setShowAnswers(false)
    setSelectedChip(null)
    setResultsOpen(true)
    recordAttempt(note.id, note.contentVersion, result.correct, result.total)
  }, [blanks, placements, note.id, note.contentVersion])

  const tryAgain = useCallback(() => {
    setPlacements({})
    setFinished(false)
    setShowAnswers(false)
    setResultsOpen(false)
    setMode('play')
  }, [])

  const value = useMemo<GameValue>(
    () => ({
      mode,
      setMode: (next) => {
        setSelectedChip(null)
        setMode(next === 'play' && finished ? 'review' : next)
      },
      hasBlanks,
      blanks,
      placements,
      answerOfChip: (chipId) => answers.get(chipId),
      selectedChip,
      selectChip: setSelectedChip,
      tapBlank,
      registerBlank,
      measureBlanks,
      dropChip,
      filledCount: Object.keys(placements).length,
      score,
      showAnswers,
      setShowAnswers,
      finish,
      tryAgain,
      resultsOpen,
      closeResults: () => setResultsOpen(false),
      blankNumber: (blankId) => numbers.get(blankId) ?? 0,
    }),
    [mode, finished, hasBlanks, blanks, placements, answers, selectedChip, tapBlank, registerBlank, measureBlanks, dropChip, score, showAnswers, finish, tryAgain, resultsOpen, numbers],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
