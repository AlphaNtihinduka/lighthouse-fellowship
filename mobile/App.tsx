import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Phase 0 placeholder. Home, archive and the reader arrive in phase 3 (docs/PLAN.md §7).
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lighthouse Fellowship</Text>
      <Text style={styles.subtitle}>Sermon Notes</Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF8F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#1F2A4A',
    fontSize: 28,
    fontFamily: 'serif',
  },
  subtitle: {
    color: '#C62828',
    fontSize: 18,
    marginTop: 8,
  },
});
