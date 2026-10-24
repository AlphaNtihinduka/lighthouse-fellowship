// Same rules as the backend's ChangePasswordRequestDTO.
export const MIN_PASSWORD = 12
const MAX_PASSWORD_BYTES = 72

export function passwordProblem(newPassword: string, confirmation: string): string | null {
  if (newPassword.length < MIN_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters.`
  }
  // The backend refuses more than 72 bytes (BCrypt's limit) rather than truncate.
  if (new TextEncoder().encode(newPassword).length > MAX_PASSWORD_BYTES) {
    return 'That password is too long (72 bytes at most).'
  }
  if (newPassword !== confirmation) {
    return 'The two new passwords do not match.'
  }
  return null
}
