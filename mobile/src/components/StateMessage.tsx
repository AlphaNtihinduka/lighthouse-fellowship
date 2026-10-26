import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '../theme'

type Props = { loading?: boolean; title?: string; message?: string; onRetry?: () => void }

// Loading, offline and empty states, so no screen is ever just blank.
export function StateMessage({ loading, title, message, onRetry }: Props) {
  return (
    <View style={styles.box}>
      {loading && <ActivityIndicator color={colors.navy} />}
      {title && <Text style={styles.title}>{title}</Text>}
      {message && <Text style={styles.message}>{message}</Text>}
      {onRetry && (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { padding: 32, alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.serif, fontSize: 20, color: colors.navy, textAlign: 'center' },
  message: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  button: { marginTop: 6, backgroundColor: colors.red, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
})
