import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 Epics API - Full body received:', { 
      keys: Object.keys(body),
      bodyType: typeof body,
      bodyIsNull: body === null
    })
    
    const { domain, projectKey, email, token } = body

    console.log('📥 Epics API - Extracted params:', { 
      domain: domain || 'MISSING', 
      projectKey: projectKey || 'MISSING', 
      email: email ? '***' : 'MISSING', 
      token: token ? '***' : 'MISSING',
      domainType: typeof domain,
      projectKeyType: typeof projectKey,
      emailType: typeof email,
      tokenType: typeof token
    })

    if (!domain || !projectKey || !email || !token) {
      const missing = []
      if (!domain) missing.push('domain')
      if (!projectKey) missing.push('projectKey')
      if (!email) missing.push('email')
      if (!token) missing.push('token')
      
      console.error('❌ Missing parameters:', missing)
      return NextResponse.json(
        { error: `Faltan parámetros requeridos: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Create Basic Auth header
    const credentials = Buffer.from(`${email}:${token}`).toString('base64')
    
    // JQL query to get all epics from the project
    const jql = `project = ${projectKey} AND type = Epic ORDER BY created DESC`
    const searchUrl = `${domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,status`
    
    const response = await fetch(searchUrl, {
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
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Credenciales de Jira inválidas. Verifica tu email y token.' },
          { status: 401 }
        )
      }
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'No tienes permisos para acceder a este proyecto' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: `Error al obtener épicas: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    const epics = data.issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
    }))

    return NextResponse.json({ epics })
  } catch (error) {
    console.error('❌ Error in epics API route:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

