import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { bestScores } from './game'
import { loadAttempts } from './progress'

// Best score per note from the attempts saved on this phone; refreshed whenever the
// screen comes back into view (e.g. after finishing a note).
export function useBestScores() {
  const [best, setBest] = useState<ReturnType<typeof bestScores>>({})
  useFocusEffect(
    useCallback(() => {
      loadAttempts().then((attempts) => setBest(bestScores(attempts)))
    }, []),
  )
  return best
}
