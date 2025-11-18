/**
 * Server-side Authentication Utilities
 * 
 * Handles reading Jira credentials from request headers
 * The client sends credentials in custom headers (X-Jira-Email and X-Jira-Token)
 */

import { NextRequest } from 'next/server'

const HEADER_NAMES = {
  JIRA_EMAIL: 'x-jira-email',
  JIRA_TOKEN: 'x-jira-token',
} as const

/**
 * Get Jira credentials from request headers
 * The client sends credentials in X-Jira-Email and X-Jira-Token headers
 */
export function getJiraCredentialsFromHeaders(request: NextRequest): {
  email: string | null
  token: string | null
} {
  const email = request.headers.get(HEADER_NAMES.JIRA_EMAIL)
  const token = request.headers.get(HEADER_NAMES.JIRA_TOKEN)
  
  return { email, token }
}

/**
 * Check if we have valid Jira credentials in headers
 */
export function hasJiraCredentialsInHeaders(request: NextRequest): boolean {
  const { email, token } = getJiraCredentialsFromHeaders(request)
  return !!(email && token)
}

/**
 * Legacy function for backwards compatibility
 * Now reads from headers instead of cookies
 */
export function getJiraCredentialsFromCookie(request: NextRequest): {
  email: string | null
  token: string | null
} {
  return getJiraCredentialsFromHeaders(request)
}

