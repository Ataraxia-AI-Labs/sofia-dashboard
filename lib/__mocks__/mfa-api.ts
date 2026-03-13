// lib/__mocks__/mfa-api.ts
// ---------------------------------------------------------------------------
// Manual mock for @/lib/mfa-api
// ---------------------------------------------------------------------------

export const enrollMFA = jest.fn().mockResolvedValue({
  factorId: 'factor-uuid-123',
  qrCode: 'data:image/svg+xml;base64,mock-qr-code',
  secret: 'MOCK_SECRET_KEY',
  uri: 'otpauth://totp/SofIA?secret=MOCK_SECRET_KEY',
})

export const verifyMFA = jest.fn().mockResolvedValue(undefined)

export const unenrollMFA = jest.fn().mockResolvedValue(undefined)

export const getMFAStatus = jest.fn().mockResolvedValue({
  enabled: false,
  factors: [],
})

export const mfaChallengeRequired = jest.fn().mockResolvedValue(false)
