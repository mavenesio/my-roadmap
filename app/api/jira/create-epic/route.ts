import { NextRequest, NextResponse } from 'next/server'
import { getJiraCredentialsFromCookie } from '@/lib/server-auth'
import { getJiraDomain } from '@/lib/credentials-manager'

/**
 * POST /api/jira/create-epic
 * Creates a new epic in Jira
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 Create Epic API - Full body:', body)
    
    const { projectKey, summary, description } = body

    console.log('📥 Create Epic API - Params:', { 
      projectKey: projectKey || 'MISSING',
      summary: summary || 'MISSING',
      description: description || 'MISSING',
      projectKeyType: typeof projectKey,
      summaryType: typeof summary,
    })

    if (!projectKey || !summary) {
      console.error('❌ Missing required parameters:', {
        hasProjectKey: !!projectKey,
        hasSummary: !!summary,
        projectKeyValue: projectKey,
        summaryValue: summary,
      })
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: projectKey y summary' },
        { status: 400 }
      )
    }

    // Get credentials from httpOnly cookie
    const { email, token } = await getJiraCredentialsFromCookie()

    if (!email || !token) {
      console.error('❌ Missing credentials in cookies')
      return NextResponse.json(
        { error: 'No hay credenciales guardadas. Por favor, configura tus credenciales de Jira primero.' },
        { status: 401 }
      )
    }

    // Create Basic Auth header
    const credentials = Buffer.from(`${email}:${token}`).toString('base64')
    const domain = getJiraDomain()

    // Get project details to find the epic issue type ID
    console.log('🔍 Getting project details...')
    const projectUrl = `${domain}/rest/api/3/project/${projectKey}`
    const projectResponse = await fetch(projectUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
    })

    if (!projectResponse.ok) {
      const errorText = await projectResponse.text()
      console.error('❌ Project API error:', projectResponse.status, errorText)
      return NextResponse.json(
        { error: `Error al obtener proyecto: ${projectResponse.status}` },
        { status: projectResponse.status }
      )
    }

    const projectData = await projectResponse.json()
    console.log('✅ Project found:', projectData.key)

    // Get create meta to find epic issue type ID
    console.log('🔍 Getting create metadata...')
    const metaUrl = `${domain}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes.fields`
    const metaResponse = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
    })

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text()
      console.error('❌ Meta API error:', metaResponse.status, errorText)
      return NextResponse.json(
        { error: `Error al obtener metadatos: ${metaResponse.status}` },
        { status: metaResponse.status }
      )
    }

    const metaData = await metaResponse.json()
    const project = metaData.projects?.[0]
    
    if (!project) {
      return NextResponse.json(
        { error: 'No se encontró el proyecto en Jira' },
        { status: 404 }
      )
    }

    // Find Epic issue type
    const epicType = project.issuetypes.find((type: any) => 
      type.name.toLowerCase() === 'epic' || type.name.toLowerCase() === 'épica'
    )

    if (!epicType) {
      console.error('❌ Epic issue type not found')
      return NextResponse.json(
        { error: 'No se encontró el tipo de issue "Epic" en este proyecto' },
        { status: 400 }
      )
    }

    console.log('✅ Epic type found:', epicType.id)

    // Create the epic
    console.log('🚀 Creating epic...')
    const createUrl = `${domain}/rest/api/3/issue`
    
    const createData = {
      fields: {
        project: {
          key: projectKey
        },
        summary: summary,
        description: description ? {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description
                }
              ]
            }
          ]
        } : undefined,
        issuetype: {
          id: epicType.id
        }
      }
    }

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createData),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('❌ Create epic error:', createResponse.status, errorText)
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      
      return NextResponse.json(
        { error: `Error al crear épica: ${errorData.errorMessages?.join(', ') || errorText}` },
        { status: createResponse.status }
      )
    }

    const createdEpic = await createResponse.json()
    console.log('✅ Epic created:', createdEpic.key)

    return NextResponse.json({
      success: true,
      epic: {
        id: createdEpic.id,
        key: createdEpic.key,
        self: createdEpic.self,
        url: `${domain}/browse/${createdEpic.key}`
      }
    })
  } catch (error) {
    console.error('❌ Error in create-epic API route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

