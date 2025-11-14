import { NextRequest, NextResponse } from 'next/server'
import { setJiraCredentialsCookie, getJiraCredentialsFromCookie, clearJiraCredentialsCookie, hasJiraCredentials } from '@/lib/server-auth'

/**
 * POST /api/auth/jira
 * Save Jira credentials to httpOnly cookies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token, rememberToken } = body

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      )
    }

    // Set credentials in httpOnly cookies
    await setJiraCredentialsCookie(email, token, rememberToken || false)

    return NextResponse.json({ 
      success: true,
      message: 'Credentials saved successfully'
    })
  } catch (error) {
    console.error('Error saving Jira credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/jira
 * Check if we have valid Jira credentials
 */
export async function GET() {
  try {
    const hasCredentials = await hasJiraCredentials()
    const credentials = hasCredentials ? await getJiraCredentialsFromCookie() : null

    return NextResponse.json({
      hasToken: hasCredentials,
      email: credentials?.email || null
    })
  } catch (error) {
    console.error('Error checking Jira credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth/jira
 * Clear Jira credentials from cookies
 */
export async function DELETE() {
  try {
    await clearJiraCredentialsCookie()

    return NextResponse.json({
      success: true,
      message: 'Credentials cleared successfully'
    })
  } catch (error) {
    console.error('Error clearing Jira credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

