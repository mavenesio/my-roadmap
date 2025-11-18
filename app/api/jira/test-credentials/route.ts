import { NextRequest, NextResponse } from 'next/server'
import { getJiraCredentialsFromHeaders } from '@/lib/server-auth'

/**
 * Test endpoint to diagnose Jira credentials issues
 * POST /api/jira/test-credentials (changed from GET to POST to receive headers)
 */
export async function POST(request: NextRequest) {
  try {
    const { email, token } = getJiraCredentialsFromHeaders(request)

    if (!email || !token) {
      return NextResponse.json({
        success: false,
        error: 'No credentials found in headers',
        hasEmail: !!email,
        hasToken: !!token,
      })
    }

    const domain = 'https://mercadolibre.atlassian.net'
    const credentials = Buffer.from(`${email}:${token}`).toString('base64')

    // Test with /myself endpoint (simplest test)
    console.log('🧪 Testing Jira credentials from Vercel...')
    
    const testUrl = `${domain}/rest/api/3/myself`
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
    })

    console.log('📥 Jira response:', response.status, response.statusText)

    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      hasCredentials: true,
      emailDomain: email.split('@')[1],
      response: responseData,
      headers: Object.fromEntries(response.headers.entries()),
      environment: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
    })
  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

