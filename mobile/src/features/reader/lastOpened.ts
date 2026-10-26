import AsyncStorage from '@react-native-async-storage/async-storage'

// "Continue" on the home screen: the last note opened and the page it was on.
const KEY = 'lighthouse.last-opened'

export type LastOpened = { noteId: string; title: string; page: number }

export async function loadLastOpened(): Promise<LastOpened | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LastOpened) : null
  } catch {
    return null
  }
}

export async function saveLastOpened(value: LastOpened): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Not being able to remember the page is never worth an error.
  }
}
