import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CACHE_BUSTER, PERSIST_MAX_AGE, persister, queryClient } from '../api/queryClient'
import { colors, fonts } from '../theme'

// Providers: the query cache is restored from the phone on start, so notes opened
// before can be read with no network (PLAN §7).
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, buster: CACHE_BUSTER, maxAge: PERSIST_MAX_AGE }}
      >
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.navy },
            headerTintColor: colors.surface,
            headerTitleStyle: { fontFamily: fonts.serif },
            contentStyle: { backgroundColor: colors.paper },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Lighthouse Fellowship' }} />
          <Stack.Screen name="archive" options={{ title: 'All sermon notes' }} />
          <Stack.Screen name="note/[id]" options={{ title: 'Sermon Notes' }} />
        </Stack>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  )
}
