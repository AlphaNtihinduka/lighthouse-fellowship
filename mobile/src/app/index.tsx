import { useQuery } from '@tanstack/react-query'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { listNotes, queryKeys } from '../api/client'
import { NoteCard } from '../components/NoteCard'
import { StateMessage } from '../components/StateMessage'
import { loadLastOpened, type LastOpened } from '../features/reader/lastOpened'
import { colors, fonts } from '../theme'

// Home (PLAN §7): this Sunday's note large, "Continue" for the last note opened, and
// the way into the archive. Works offline from the cached list.
export default function HomeScreen() {
  const notes = useQuery({ queryKey: queryKeys.notes, queryFn: listNotes })
  const [last, setLast] = useState<LastOpened | null>(null)

  useFocusEffect(
    useCallback(() => {
      loadLastOpened().then(setLast)
    }, []),
  )

  const latest = notes.data?.[0]
  const continueNote = last && last.noteId !== latest?.id ? notes.data?.find((note) => note.id === last.noteId) : undefined
  const continueLatest = last && latest && last.noteId === latest.id && last.page > 0

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={notes.isRefetching} onRefresh={() => void notes.refetch()} />}
      >
        {notes.isPending && <StateMessage loading message="Loading this Sunday's notes…" />}

        {notes.isError && !notes.data && (
          <StateMessage
            title="You're offline"
            message="Connect to the internet once to download this Sunday's notes. Notes you have opened stay readable offline."
            onRetry={() => notes.refetch()}
          />
        )}

        {notes.data && notes.data.length === 0 && (
          <StateMessage title="No notes yet" message="This Sunday's sermon notes will appear here." />
        )}

        {latest && (
          <>
            <Text style={styles.heading}>This Sunday</Text>
            <NoteCard
              note={latest}
              size="large"
              caption={continueLatest ? `Continue on page ${last.page + 1}` : undefined}
              page={continueLatest ? last.page : undefined}
            />
          </>
        )}

        {continueNote && last && (
          <>
            <Text style={styles.heading}>Continue reading</Text>
            <NoteCard note={continueNote} caption={`Page ${last.page + 1}`} page={last.page} />
          </>
        )}

        {notes.data && notes.data.length > 0 && (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/archive')}
            style={({ pressed }) => [styles.archive, pressed && styles.pressed]}
          >
            <Text style={styles.archiveText}>All sermon notes ›</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12 },
  heading: { fontFamily: fonts.serif, fontSize: 18, color: colors.maroon, marginTop: 8 },
  archive: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveText: { color: colors.navy, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.8 },
})
