import { NextRequest, NextResponse } from 'next/server'
import { getJiraCredentialsFromCookie } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 Epics API - Full body received:', { 
      keys: Object.keys(body),
      bodyType: typeof body,
      bodyIsNull: body === null
    })
    
    const { domain, projectKey, boardId } = body

    // Get credentials from httpOnly cookie
    const { email, token } = await getJiraCredentialsFromCookie()

    console.log('📥 Epics API - Extracted params:', { 
      domain: domain || 'MISSING', 
      projectKey: projectKey || 'MISSING',
      boardId: boardId || 'MISSING', 
      email: email ? '***' : 'MISSING', 
      token: token ? '***' : 'MISSING',
    })

    if (!domain) {
      console.error('❌ Missing domain parameter')
      return NextResponse.json(
        { error: 'Falta el parámetro domain' },
        { status: 400 }
      )
    }

    if (!email || !token) {
      console.error('❌ Missing credentials in cookies')
      return NextResponse.json(
        { error: 'No hay credenciales guardadas. Por favor, configura tus credenciales de Jira primero.' },
        { status: 401 }
      )
    }

    // Trim and clean credentials
    const cleanEmail = email.trim()
    const cleanToken = token.trim()
    
    console.log('🔑 Credentials check:', {
      emailLength: cleanEmail.length,
      tokenLength: cleanToken.length,
      emailHasSpaces: cleanEmail !== email,
      tokenHasSpaces: cleanToken !== token,
      emailEmpty: cleanEmail === '',
      tokenEmpty: cleanToken === ''
    })
    
    // Create Basic Auth header
    const credentials = Buffer.from(`${cleanEmail}:${cleanToken}`).toString('base64')
    
    // First, test credentials with a simple endpoint
    console.log('🧪 Testing credentials with /myself endpoint')
    const testUrl = `${domain}/rest/api/3/myself`
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
    })
    
    console.log('🧪 Test response:', testResponse.status, testResponse.statusText)
    
    if (!testResponse.ok) {
      const testError = await testResponse.text()
      console.error('❌ Credentials test failed:', {
        status: testResponse.status,
        body: testError
      })
      
      if (testResponse.status === 401) {
        return NextResponse.json(
          { 
            error: 'Credenciales de Jira inválidas.\n\nPosibles causas:\n• El token está expirado o es inválido\n• El email no es correcto\n• El token no tiene permisos suficientes\n\nAsegúrate de:\n1. Generar un nuevo token en https://id.atlassian.com/manage-profile/security/api-tokens\n2. Usar el email con el que inicias sesión en Jira\n3. Copiar el token completo sin espacios' 
          },
          { status: 401 }
        )
      }
    }
    
    console.log('✅ Credentials validated successfully')
    
    // Try to use Board API first if boardId is provided
    let searchUrl: string
    let usesBoardApi = false
    
    if (boardId) {
      // Use Board API to get epics from the board
      searchUrl = `${domain}/rest/agile/1.0/board/${boardId}/epic?maxResults=100`
      usesBoardApi = true
      console.log('🔗 Using Board API:', searchUrl)
    } else if (projectKey) {
      // Fallback to JQL search if no boardId
      const jql = `project = ${projectKey} AND type = Epic ORDER BY created DESC`
      searchUrl = `${domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,status`
      console.log('🔗 Using Search API with JQL:', searchUrl)
    } else {
      return NextResponse.json(
        { error: 'Se requiere boardId o projectKey' },
        { status: 400 }
      )
    }
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    console.log('📥 Jira API response:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Jira API error:', {
        status: response.status,
        statusText: response.statusText,
        url: searchUrl.replace(/\/rest\/api.*/, '/rest/api/...'), // Hide query params
        errorBody: errorText
      })
      
      // Try to parse Jira error message
      let jiraErrorMessage = errorText
      try {
        const errorJson = JSON.parse(errorText)
        jiraErrorMessage = errorJson.errorMessages?.join(', ') || errorJson.message || errorText
      } catch {
        // Keep errorText as is
      }

      if (response.status === 401) {
        console.error('🔐 Authentication failed. Possible causes:')
        console.error('  - Token expired or invalid')
        console.error('  - Email incorrect')
        console.error('  - Token does not have required permissions')
        console.error('  - Corporate Jira may require different auth method')
        
        return NextResponse.json(
          { 
            error: 'Credenciales de Jira inválidas.\n\nPosibles causas:\n• El token está expirado o es inválido\n• El email no es correcto\n• El token no tiene permisos suficientes\n• Esta instancia de Jira puede requerir autenticación especial\n\nPara instancias corporativas, verifica que tu token tenga permisos de "Read" en Jira Software.' 
          },
          { status: 401 }
        )
      }
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'No tienes permisos para acceder a este proyecto' },
          { status: 403 }
        )
      }
      if (response.status === 400) {
        return NextResponse.json(
          { error: `Error de Jira: ${jiraErrorMessage}` },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `Error al obtener épicas (${response.status}): ${jiraErrorMessage}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    let epics: any[]
    
    if (usesBoardApi) {
      // Board API returns epics in 'values' array
      console.log('✅ Board API success:', {
        totalValues: data.total,
        valuesReturned: data.values?.length || 0,
        maxResults: data.maxResults
      })
      
      if (!data.values || data.values.length === 0) {
        console.log('⚠️ No epics found in board:', boardId)
        return NextResponse.json({ 
          epics: [],
          message: `No se encontraron épicas en el board ${boardId}`
        })
      }
      
      epics = data.values.map((epic: any) => ({
        id: epic.id,
        key: epic.key,
        summary: epic.summary || epic.name,
        status: epic.done ? 'Done' : 'In Progress', // Board API has limited status info
      }))
    } else {
      // Search API returns issues in 'issues' array
      console.log('✅ Search API success:', {
        totalIssues: data.total,
        issuesReturned: data.issues?.length || 0,
        maxResults: data.maxResults
      })
      
      if (!data.issues || data.issues.length === 0) {
        console.log('⚠️ No epics found for project:', projectKey)
        return NextResponse.json({ 
          epics: [],
          message: `No se encontraron épicas en el proyecto ${projectKey}`
        })
      }
      
      epics = data.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
      }))
    }

    console.log('✅ Returning epics:', epics.length)
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

