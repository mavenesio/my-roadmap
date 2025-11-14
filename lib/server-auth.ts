/**
 * Server-side Authentication Utilities
 * 
 * Handles httpOnly cookies for secure token storage
 */

import { cookies } from 'next/headers'

const COOKIE_NAMES = {
  JIRA_TOKEN: 'jira_token',
  JIRA_EMAIL: 'jira_email',
} as const

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

/**
 * Set Jira credentials in httpOnly cookies
 * If rememberToken is false, cookie expires when browser closes (session cookie)
 * If rememberToken is true, cookie lasts 30 days
 */
export async function setJiraCredentialsCookie(
  email: string,
  token: string,
  rememberToken: boolean = false
): Promise<void> {
  const cookieStore = await cookies()
  
  const maxAge = rememberToken ? 60 * 60 * 24 * 30 : undefined // 30 days or session
  
  cookieStore.set(COOKIE_NAMES.JIRA_EMAIL, email, {
    ...COOKIE_OPTIONS,
    maxAge,
  })
  
  cookieStore.set(COOKIE_NAMES.JIRA_TOKEN, token, {
    ...COOKIE_OPTIONS,
    maxAge,
  })
}

/**
 * Get Jira credentials from httpOnly cookies
 */
export async function getJiraCredentialsFromCookie(): Promise<{
  email: string | null
  token: string | null
}> {
  const cookieStore = await cookies()
  
  const email = cookieStore.get(COOKIE_NAMES.JIRA_EMAIL)?.value || null
  const token = cookieStore.get(COOKIE_NAMES.JIRA_TOKEN)?.value || null
  
  return { email, token }
}

/**
 * Clear Jira credentials cookies
 */
export async function clearJiraCredentialsCookie(): Promise<void> {
  const cookieStore = await cookies()
  
  cookieStore.delete(COOKIE_NAMES.JIRA_EMAIL)
  cookieStore.delete(COOKIE_NAMES.JIRA_TOKEN)
}

/**
 * Check if we have valid Jira credentials in cookies
 */
export async function hasJiraCredentials(): Promise<boolean> {
  const { email, token } = await getJiraCredentialsFromCookie()
  return !!(email && token)
}

