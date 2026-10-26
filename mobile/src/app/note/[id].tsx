import { useQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError, getNote, queryKeys } from '../../api/client'
import { StateMessage } from '../../components/StateMessage'
import { Reader } from '../../features/reader/Reader'
import { colors } from '../../theme'

export default function NoteScreen() {
  const { id, page } = useLocalSearchParams<{ id: string; page?: string }>()
  const note = useQuery({ queryKey: queryKeys.note(id), queryFn: () => getNote(id) })

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: note.data?.title ?? 'Sermon Notes' }} />
      {note.isPending && <StateMessage loading />}
      {note.isError && !note.data && (
        note.error instanceof ApiError && note.error.status === 404 ? (
          <StateMessage title="Note not available" message="This note is not published (any more)." />
        ) : (
          <StateMessage
            title="You're offline"
            message="This note hasn't been opened on this phone before, so it isn't saved yet. Connect once and it will stay readable offline."
            onRetry={() => note.refetch()}
          />
        )
      )}
      {note.data && <Reader note={note.data} initialPage={Number(page) || 0} />}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backdrop },
})
