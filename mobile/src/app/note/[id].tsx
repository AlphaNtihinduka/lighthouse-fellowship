import { useQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Pressable, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError, getNote, queryKeys } from '../../api/client'
import type { PublicNote } from '../../api/types'
import { StateMessage } from '../../components/StateMessage'
import { GameProvider, useGame } from '../../features/game/GameProvider'
import { Reader } from '../../features/reader/Reader'
import { colors } from '../../theme'

export default function NoteScreen() {
  const { id, page } = useLocalSearchParams<{ id: string; page?: string }>()
  const note = useQuery({ queryKey: queryKeys.note(id), queryFn: () => getNote(id) })

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: note.data?.title ?? 'Sermon Notes' }} />
      {note.isPending && <StateMessage loading />}
      {note.isError &&
        !note.data &&
        (note.error instanceof ApiError && note.error.status === 404 ? (
          <StateMessage title="Note not available" message="This note is not published (any more)." />
        ) : (
          <StateMessage
            title="You're offline"
            message="This note hasn't been opened on this phone before, so it isn't saved yet. Connect once and it will stay readable offline."
            onRetry={() => note.refetch()}
          />
        ))}
      {note.data && <NoteWithGame note={note.data} initialPage={Number(page) || 0} />}
    </SafeAreaView>
  )
}

// The game state belongs to one note, so the provider sits here, around the reader.
function NoteWithGame({ note, initialPage }: { note: PublicNote; initialPage: number }) {
  return (
    <GameProvider key={`${note.id}:${note.contentVersion}`} note={note}>
      <ModeToggle />
      <Reader note={note} initialPage={initialPage} />
    </GameProvider>
  )
}

// "Play" / "Read" in the top bar (PLAN §7: Read mode shows blanks as lines, Play adds the word bank).
function ModeToggle() {
  const game = useGame()
  if (!game?.hasBlanks) return null
  const reading = game.mode === 'read'
  const label = reading ? 'Play' : 'Read'
  return (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reading ? 'Play the fill-in-the-blank game' : 'Switch to reading'}
            onPress={() => game.setMode(reading ? 'play' : 'read')}
            hitSlop={10}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{label}</Text>
          </Pressable>
        ),
      }}
    />
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backdrop },
  toggle: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.yellow },
  toggleText: { color: colors.navy, fontWeight: '700', fontSize: 15 },
})
