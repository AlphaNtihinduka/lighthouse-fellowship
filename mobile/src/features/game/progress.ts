import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { Attempt, Placements } from './game'

// Game progress lives on the phone first (PLAN §7): it works offline and survives
// restarts. Finished attempts carry a clientAttemptId so the phase 5 upload can be
// repeated safely.

const progressKey = (noteId: string, contentVersion: number) => `lighthouse.game.${noteId}.v${contentVersion}`
const ATTEMPTS_KEY = 'lighthouse.attempts'

export type SavedProgress = { placements: Placements; finished: boolean }

// Keyed by contentVersion: if the pastor edits the note, old placements are not
// applied to a different text.
export async function loadProgress(noteId: string, contentVersion: number): Promise<SavedProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(progressKey(noteId, contentVersion))
    return raw ? (JSON.parse(raw) as SavedProgress) : null
  } catch {
    return null
  }
}

export async function saveProgress(noteId: string, contentVersion: number, progress: SavedProgress) {
  try {
    await AsyncStorage.setItem(progressKey(noteId, contentVersion), JSON.stringify(progress))
  } catch {
    // Losing in-progress placements is annoying, not worth an error screen.
  }
}

export async function loadAttempts(): Promise<Attempt[]> {
  try {
    const raw = await AsyncStorage.getItem(ATTEMPTS_KEY)
    return raw ? (JSON.parse(raw) as Attempt[]) : []
  } catch {
    return []
  }
}

export async function recordAttempt(noteId: string, contentVersion: number, score: number, total: number): Promise<Attempt> {
  const attempt: Attempt = {
    clientAttemptId: randomUUID(),
    noteId,
    contentVersion,
    score,
    total,
    completedAt: new Date().toISOString(),
    synced: false,
  }
  const attempts = await loadAttempts()
  try {
    await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify([...attempts, attempt]))
  } catch {
    // Kept in memory for this result screen only.
  }
  return attempt
}
