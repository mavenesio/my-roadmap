import { NextRequest, NextResponse } from 'next/server'

/**
 * This route is deprecated and kept for backwards compatibility only.
 * Credentials are now stored in localStorage on the client side
 * and sent in headers with each request.
 * 
 * You can safely remove this file if no code is using these endpoints.
 */

/**
 * POST /api/auth/jira
 * Deprecated: Credentials are now stored in client localStorage
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Credentials are now stored in localStorage.',
      deprecated: true
    },
    { status: 410 } // 410 Gone
  )
}

/**
 * GET /api/auth/jira
 * Deprecated: Credentials are now stored in client localStorage
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Check credentials in localStorage.',
      deprecated: true
    },
    { status: 410 } // 410 Gone
  )
}

/**
 * DELETE /api/auth/jira
 * Deprecated: Credentials are now stored in client localStorage
 */
export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Clear credentials from localStorage.',
      deprecated: true
    },
    { status: 410 } // 410 Gone
  )
}

