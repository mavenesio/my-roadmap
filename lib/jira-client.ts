/**
 * Jira API Client
 * 
 * Functions to interact with Jira Cloud REST API
 * Documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
 */

export interface JiraEpic {
  id: string
  key: string
  summary: string
  status: string
}

export interface JiraStory {
  id: string
  key: string
  summary: string
  status: string
  assignee?: {
    accountId: string
    displayName: string
    avatarUrls: {
      '48x48': string
    }
  }
  startDate?: string
  dueDate?: string
  created: string
  updated: string
  description?: string
}

export interface JiraUser {
  accountId: string
  displayName: string
  emailAddress?: string
  avatarUrls: {
    '48x48': string
  }
}

export interface ParsedJiraUrl {
  domain: string
  boardId?: string
  projectKey?: string
}

/**
 * Parse a Jira board URL to extract domain and board/project information
 * Supports formats like:
 * - https://company.atlassian.net/jira/software/projects/PROJ/boards/123
 * - https://company.atlassian.net/browse/PROJ-123
 */
export function parseJiraBoardUrl(url: string): ParsedJiraUrl {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.origin
    const pathname = urlObj.pathname

    // Extract board ID from path like /jira/software/projects/PROJ/boards/123
    // Also supports /jira/software/c/projects/PROJ/boards/123
    const boardMatch = pathname.match(/\/boards\/(\d+)/)
    const boardId = boardMatch ? boardMatch[1] : undefined

    // Extract project key from path - more flexible regex
    // Supports: /projects/PROJ, /c/projects/PROJ, /browse/PROJ-123
    const projectMatch = pathname.match(/\/projects\/([A-Z0-9]+)/) || pathname.match(/\/browse\/([A-Z0-9]+)/)
    const projectKey = projectMatch ? projectMatch[1] : undefined

    if (!projectKey) {
      throw new Error('No se pudo extraer el código del proyecto de la URL. Asegúrate de que la URL contiene el código del proyecto.')
    }

    return { domain, boardId, projectKey }
  } catch (error) {
    if (error instanceof Error && error.message.includes('proyecto')) {
      throw error
    }
    throw new Error('URL de Jira inválida. Asegúrate de usar una URL completa como https://company.atlassian.net/jira/software/projects/PROJ/boards/123 o https://company.atlassian.net/jira/software/c/projects/PROJ/boards/123')
  }
}

/**
 * Fetch epics from a Jira project
 * Note: Email and token are now read from httpOnly cookies by the API
 */
export async function fetchEpicsFromBoard(
  boardUrl: string
): Promise<JiraEpic[]> {
  const { domain, projectKey } = parseJiraBoardUrl(boardUrl)
  
  console.log('🔍 Parsed Jira URL:', { domain, projectKey, boardUrl })
  
  if (!projectKey) {
    throw new Error('No se pudo extraer la clave del proyecto de la URL')
  }

  try {
    // Try to extract board ID from URL
    const boardIdMatch = boardUrl.match(/boards\/(\d+)/)
    const boardId = boardIdMatch ? boardIdMatch[1] : undefined
    
    const payload = {
      domain,
      projectKey,
      boardId,
    }
    
    console.log('📤 Sending to API:', { 
      domain, 
      projectKey,
      boardId,
    })

    // Call our API route (credentials are read from httpOnly cookies)
    const response = await fetch('/api/jira/epics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch((fetchError) => {
      console.error('❌ Fetch error:', fetchError)
      throw new Error(`Error de red: ${fetchError.message || 'No se pudo conectar con el servidor'}`)
    })

    console.log('📥 Response status:', response.status, response.statusText)

    if (!response.ok) {
      const responseText = await response.text()
      console.error('❌ API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      })
      
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { error: responseText || `Error ${response.status}: ${response.statusText}` }
      }
      
      throw new Error(errorData.error || `Error al obtener épicas: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ Epics received:', data.epics?.length || 0)
    return data.epics
  } catch (error) {
    console.error('❌ fetchEpicsFromBoard error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error de red al conectar con el servidor')
  }
}

/**
 * Fetch stories (issues) associated with an epic
 * Note: Email and token are now read from httpOnly cookies by the API
 */
export async function fetchStoriesFromEpic(
  epicKey: string,
  domain: string
): Promise<JiraStory[]> {
  try {
    // Call our API route (credentials are read from httpOnly cookies)
    const response = await fetch('/api/jira/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        epicKey,
      }),
    })

    console.log('📥 Stories response status:', response.status, response.statusText)

    if (!response.ok) {
      const responseText = await response.text()
      console.error('❌ Stories API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      })
      
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { error: responseText || `Error ${response.status}: ${response.statusText}` }
      }
      
      throw new Error(errorData.error || `Error al obtener stories: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.stories
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al obtener stories del épica')
  }
}

/**
 * Fetch users from a Jira project
 * Note: Email and token are now read from httpOnly cookies by the API
 */
export async function fetchJiraUsers(
  boardUrl: string
): Promise<JiraUser[]> {
  const { domain, projectKey } = parseJiraBoardUrl(boardUrl)
  
  console.log('👥 Fetching users for:', { domain, projectKey, boardUrl })
  
  if (!projectKey) {
    throw new Error('No se pudo extraer la clave del proyecto de la URL')
  }

  try {
    // Call our API route (credentials are read from httpOnly cookies)
    const response = await fetch('/api/jira/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        projectKey,
      }),
    }).catch((fetchError) => {
      console.error('❌ Fetch error:', fetchError)
      throw new Error(`Error de red: ${fetchError.message || 'No se pudo conectar con el servidor'}`)
    })

    console.log('📥 Users response status:', response.status, response.statusText)

    if (!response.ok) {
      const responseText = await response.text()
      console.error('❌ Users API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      })
      
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { error: responseText || `Error ${response.status}: ${response.statusText}` }
      }
      
      throw new Error(errorData.error || `Error al obtener usuarios: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ Users received:', data.users?.length || 0)
    return data.users
  } catch (error) {
    console.error('❌ fetchJiraUsers error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al obtener usuarios de Jira')
  }
}

/**
 * Test Jira connection with the saved credentials
 * Note: Credentials are read from httpOnly cookies by the API
 */
export async function testJiraConnection(
  boardUrl: string
): Promise<boolean> {
  try {
    // Try to fetch epics as a connection test
    await fetchEpicsFromBoard(boardUrl)
    return true
  } catch (error) {
    return false
  }
}

