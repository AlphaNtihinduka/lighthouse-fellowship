import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { PublicNoteSummary } from '../api/types'
import { sundayLabel } from '../features/archive/groupNotes'
import { colors, fonts } from '../theme'

type Props = {
  note: PublicNoteSummary
  size?: 'large' | 'row'
  // e.g. "Continue on page 3"
  caption?: string
  page?: number
}

export function NoteCard({ note, size = 'row', caption, page }: Props) {
  const large = size === 'large'
  return (
    // A plain Pressable that navigates: wrapped in <Link asChild>, a style function is
    // dropped and the card loses its background and border.
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${note.title}, ${sundayLabel(note.sermonDate)}`}
      onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id, ...(page ? { page: String(page) } : {}) } })}
      style={({ pressed }) => [styles.card, large && styles.large, pressed && styles.pressed]}
    >
      {note.coverImageUrl ? (
        <Image source={note.coverImageUrl} style={large ? styles.coverLarge : styles.cover} contentFit="cover" cachePolicy="disk" />
      ) : (
        <View style={[large ? styles.coverLarge : styles.cover, styles.coverEmpty]} />
      )}
      <View style={[styles.text, large && styles.textLarge]}>
        <Text style={styles.date}>{sundayLabel(note.sermonDate)}</Text>
        <Text style={[styles.title, large && styles.titleLarge]} numberOfLines={2}>
          {note.title}
        </Text>
        {caption && <Text style={styles.caption}>{caption}</Text>}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 72,
  },
  large: { flexDirection: 'column', alignItems: 'stretch', padding: 0, overflow: 'hidden' },
  pressed: { opacity: 0.8 },
  cover: { width: 64, height: 48, borderRadius: 4 },
  coverLarge: { width: '100%', aspectRatio: 2 },
  coverEmpty: { backgroundColor: colors.backdrop },
  text: { flex: 1, padding: 2, gap: 2 },
  textLarge: { padding: 14 },
  date: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  title: { fontFamily: fonts.serif, fontSize: 18, color: colors.navy },
  titleLarge: { fontSize: 24 },
  caption: { fontSize: 13, color: colors.red, fontWeight: '600' },
})
