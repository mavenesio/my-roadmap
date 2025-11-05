import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { domain, epicKey, email, token } = await request.json()

    if (!domain || !epicKey || !email || !token) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // Create Basic Auth header
    const credentials = Buffer.from(`${email}:${token}`).toString('base64')
    
    // JQL query to get all stories linked to the epic
    const jql = `"Epic Link" = ${epicKey} OR parent = ${epicKey} ORDER BY created ASC`
    const searchUrl = `${domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=200&fields=summary,status,assignee,created,updated,description,customfield_10015,customfield_10016,duedate`
    
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
      
      return NextResponse.json(
        { error: `Error al obtener stories: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    const stories = data.issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee ? {
        accountId: issue.fields.assignee.accountId,
        displayName: issue.fields.assignee.displayName,
        avatarUrls: issue.fields.assignee.avatarUrls,
      } : undefined,
      startDate: issue.fields.customfield_10015,
      dueDate: issue.fields.duedate,
      created: issue.fields.created,
      updated: issue.fields.updated,
      description: issue.fields.description,
    }))

    return NextResponse.json({ stories })
  } catch (error) {
    console.error('Error in stories API route:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

