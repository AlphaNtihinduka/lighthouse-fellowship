import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// findBy*/waitFor give up after 1 s by default. A sign-in plus redirect can take longer
// than that on a busy machine or CI runner, which made tests fail now and then.
configure({ asyncUtilTimeout: 5_000 })

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
