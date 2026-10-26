import { Platform } from 'react-native'

// Brand tokens (PLAN §11). Components use these, never raw colours.
export const colors = {
  navy: '#1F2A4A',
  red: '#C62828',
  yellow: '#F4C542',
  paper: '#FBF8F1',
  // "Sermon Notes" and the header rule on the printed sheet (docs/brand/sample-notes/).
  maroon: '#7A3328',
  ink: '#222222',
  muted: '#6B7083',
  border: '#E4DED0',
  surface: '#FFFFFF',
  backdrop: '#EAE4D6',
} as const

// System fonts, so nothing has to load before the first note can be read offline.
// Serif for the sheet's titles and footer, the platform sans for body text.
export const fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui, sans-serif' }),
} as const

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const
