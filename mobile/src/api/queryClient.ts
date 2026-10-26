import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

// Offline (PLAN §7): every note opened and the archive list are kept on the phone and
// survive restarts, so they open with no network. Online, they refresh in the
// background (cheap: the API answers 304 when nothing changed).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: THIRTY_DAYS,
      staleTime: 60 * 1000,
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
})

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'lighthouse.query-cache',
  throttleTime: 1000,
})

// Bump when the cached data shape changes, so old caches are dropped instead of misread.
export const CACHE_BUSTER = 'v1'
export const PERSIST_MAX_AGE = THIRTY_DAYS
