import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { domain, projectKey, email, token } = await request.json()

    if (!domain || !projectKey || !email || !token) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // Create Basic Auth header
    const credentials = Buffer.from(`${email}:${token}`).toString('base64')
    
    const usersUrl = `${domain}/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=100`
    
    const response = await fetch(usersUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Jira API error:', response.status, errorText)
      
      return NextResponse.json(
        { error: `Error al obtener usuarios: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    const users = data.map((user: any) => ({
      accountId: user.accountId,
      displayName: user.displayName,
      emailAddress: user.emailAddress,
      avatarUrls: user.avatarUrls,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in users API route:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

