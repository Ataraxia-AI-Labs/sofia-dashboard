'use client'

// ============================================================
// MFA API — TOTP two-factor authentication helpers
// Uses Supabase Auth MFA methods (supabase.auth.mfa.*)
// ============================================================

import { supabase } from './supabase'

// ── Types ────────────────────────────────────────────────────

export interface MFAEnrollResult {
  factorId: string
  /** SVG data URL for the QR code */
  qrCode: string
  /** Manual entry secret */
  secret: string
  /** TOTP URI (for manual entry) */
  uri: string
}

export interface TOTPFactor {
  id: string
  friendlyName?: string
  status: 'verified' | 'unverified'
}

export interface MFAStatus {
  enabled: boolean
  factors: TOTPFactor[]
}

// ── Enroll ───────────────────────────────────────────────────

/**
 * Start TOTP enrollment. Returns QR code data URL, secret, and factorId.
 * The user must verify the code to complete enrollment.
 */
export async function enrollMFA(): Promise<MFAEnrollResult> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'SofIA Authenticator',
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error('No enroll data returned')

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  }
}

// ── Verify / Challenge ────────────────────────────────────────

/**
 * Verify a TOTP code to complete enrollment or MFA challenge.
 * Uses challengeAndVerify for a single-step flow.
 */
export async function verifyMFA(factorId: string, code: string): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  })
  if (error) throw new Error(error.message)
}

// ── Unenroll ──────────────────────────────────────────────────

/**
 * Disable 2FA by unenrolling the given factor.
 */
export async function unenrollMFA(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw new Error(error.message)
}

// ── Status ────────────────────────────────────────────────────

/**
 * Get the current MFA status for the signed-in user.
 * Returns whether 2FA is enabled and the list of enrolled TOTP factors.
 */
export async function getMFAStatus(): Promise<MFAStatus> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw new Error(error.message)

  const factors: TOTPFactor[] = (data?.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name,
    status: f.status as 'verified' | 'unverified',
  }))
  const verified = factors.filter((f) => f.status === 'verified')

  return {
    enabled: verified.length > 0,
    factors,
  }
}

// ── AAL check (used in login flow) ───────────────────────────

/**
 * Returns true if the current session requires an MFA upgrade (aal1 → aal2).
 * Call this right after signInWithPassword to decide whether to redirect to /mfa.
 */
export async function mfaChallengeRequired(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) return false
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
}
