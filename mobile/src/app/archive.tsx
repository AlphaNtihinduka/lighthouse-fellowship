import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { listNotes, queryKeys } from '../api/client'
import { NoteCard } from '../components/NoteCard'
import { StateMessage } from '../components/StateMessage'
import { groupByYearAndMonth } from '../features/archive/groupNotes'
import { colors, fonts } from '../theme'

// Archive (PLAN §7): pick a year, then the months and Sundays in it, newest first.
export default function ArchiveScreen() {
  const notes = useQuery({ queryKey: queryKeys.notes, queryFn: listNotes })
  const years = groupByYearAndMonth(notes.data ?? [])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const year = years.find((group) => group.year === selectedYear) ?? years[0]

  if (notes.isPending) return <StateMessage loading />
  if (notes.isError && !notes.data) {
    return <StateMessage title="You're offline" message="The list of notes could not be loaded." onRetry={() => notes.refetch()} />
  }
  if (!year) return <StateMessage title="No notes yet" />

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {years.length > 1 && (
        <ScrollView horizontal style={styles.yearBar} contentContainerStyle={styles.years} showsHorizontalScrollIndicator={false}>
          {years.map((group) => {
            const active = group.year === year.year
            return (
              <Pressable
                key={group.year}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedYear(group.year)}
                style={[styles.yearChip, active && styles.yearChipActive]}
              >
                <Text style={[styles.yearText, active && styles.yearTextActive]}>{group.year}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {years.length === 1 && <Text style={styles.yearTitle}>{year.year}</Text>}
        {year.months.map((month) => (
          <View key={month.month} style={styles.month}>
            <Text style={styles.monthTitle}>{month.label}</Text>
            {month.notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  yearBar: { flexGrow: 0, borderBottomWidth: 1, borderColor: colors.border },
  years: { padding: 12, gap: 8 },
  yearChip: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.navy, justifyContent: 'center' },
  yearChipActive: { backgroundColor: colors.navy },
  yearText: { color: colors.navy, fontSize: 16, fontWeight: '600' },
  yearTextActive: { color: colors.surface },
  content: { padding: 16, gap: 20 },
  yearTitle: { fontFamily: fonts.serif, fontSize: 24, color: colors.navy },
  month: { gap: 10 },
  monthTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.maroon },
})
