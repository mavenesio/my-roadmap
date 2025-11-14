/**
 * Credentials Manager
 * 
 * Centralized management of Jira credentials
 * - Email stored in localStorage
 * - Token stored in httpOnly cookie via API
 * - Boards configuration in localStorage
 */

// Hardcoded Jira configuration for Mercado Libre
const JIRA_CONFIG = {
  DOMAIN: 'https://mercadolibre.atlassian.net',
  BASE_PATH: '/jira/software/c/projects',
} as const

export interface JiraCredentials {
  email: string
  token: string
  rememberToken: boolean
}

export interface JiraBoard {
  id: string
  name: string
  projectKey: string // Now we store the project key instead of full URL
  url?: string // Optional, generated from projectKey
}

export interface SavedJiraBoards {
  email: string
  boards: JiraBoard[]
}

const STORAGE_KEYS = {
  EMAIL: 'jira-email',
  BOARDS: 'jira-boards',
} as const

/**
 * Build Jira board URL from project key
 */
export function buildBoardUrl(projectKey: string, boardId?: string): string {
  const basePath = `${JIRA_CONFIG.DOMAIN}${JIRA_CONFIG.BASE_PATH}/${projectKey}`
  
  if (boardId) {
    return `${basePath}/boards/${boardId}`
  }
  
  // Without boardId, return base project URL (JQL search will be used)
  return basePath
}

/**
 * Extract project key from a full Jira URL (for backwards compatibility)
 */
export function extractProjectKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const projectMatch = urlObj.pathname.match(/\/projects\/([A-Z0-9]+)/)
    return projectMatch ? projectMatch[1] : null
  } catch {
    return null
  }
}

/**
 * Get the configured Jira domain
 */
export function getJiraDomain(): string {
  return JIRA_CONFIG.DOMAIN
}

/**
 * Save Jira credentials
 * Email goes to localStorage, token goes to httpOnly cookie via API
 */
export async function saveJiraCredentials(credentials: JiraCredentials): Promise<void> {
  // Save email to localStorage
  localStorage.setItem(STORAGE_KEYS.EMAIL, credentials.email)
  
  // Save token to httpOnly cookie via API
  const response = await fetch('/api/auth/jira', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: credentials.email,
      token: credentials.token,
      rememberToken: credentials.rememberToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to save credentials')
  }
}

/**
 * Get saved email from localStorage
 */
export function getSavedEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEYS.EMAIL)
}

/**
 * Check if we have a valid token (by calling API)
 */
export async function hasValidToken(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/jira', {
      method: 'GET',
    })
    const data = await response.json()
    return data.hasToken === true
  } catch {
    return false
  }
}

/**
 * Clear all Jira credentials
 */
export async function clearJiraCredentials(): Promise<void> {
  // Clear email from localStorage
  localStorage.removeItem(STORAGE_KEYS.EMAIL)
  
  // Clear token cookie via API
  await fetch('/api/auth/jira', {
    method: 'DELETE',
  })
}

/**
 * Get saved boards from localStorage
 * Automatically migrates old boards that don't have projectKey
 */
export function getSavedBoards(): SavedJiraBoards {
  if (typeof window === 'undefined') {
    return { email: '', boards: [] }
  }
  
  const stored = localStorage.getItem(STORAGE_KEYS.BOARDS)
  if (!stored) {
    return { email: '', boards: [] }
  }
  
  try {
    const data = JSON.parse(stored)
    
    // Migrate old boards that don't have projectKey
    let needsMigration = false
    const migratedBoards = data.boards.map((board: any) => {
      if (!board.projectKey && board.url) {
        // Extract project key from URL
        const projectKey = extractProjectKeyFromUrl(board.url)
        if (projectKey) {
          needsMigration = true
          console.log(`🔄 Migrating board ${board.name}: extracted projectKey ${projectKey}`)
          return {
            ...board,
            projectKey,
            url: buildBoardUrl(projectKey),
          }
        }
      }
      
      // Ensure URL is set if projectKey exists
      if (board.projectKey && !board.url) {
        needsMigration = true
        return {
          ...board,
          url: buildBoardUrl(board.projectKey),
        }
      }
      
      return board
    })
    
    // Save migrated boards back to localStorage
    if (needsMigration) {
      const migrated = { ...data, boards: migratedBoards }
      localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(migrated))
      console.log('✅ Boards migrated successfully')
      return migrated
    }
    
    return data
  } catch (error) {
    console.error('Error reading/migrating boards:', error)
    return { email: '', boards: [] }
  }
}

/**
 * Save boards to localStorage
 */
export function saveBoards(boards: SavedJiraBoards): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(boards))
}

/**
 * Add a board to saved boards
 */
export function addBoard(board: JiraBoard, email: string): void {
  const current = getSavedBoards()
  
  // Ensure URL is generated if not provided
  const boardWithUrl = {
    ...board,
    url: board.url || buildBoardUrl(board.projectKey)
  }
  
  // Remove any existing board with the same project key
  const filtered = current.boards.filter(b => b.projectKey !== board.projectKey)
  
  saveBoards({
    email,
    boards: [...filtered, boardWithUrl]
  })
}

/**
 * Remove a board from saved boards
 */
export function removeBoard(boardId: string): void {
  const current = getSavedBoards()
  saveBoards({
    ...current,
    boards: current.boards.filter(b => b.id !== boardId)
  })
}

/**
 * Get a specific board by ID
 */
export function getBoardById(boardId: string): JiraBoard | undefined {
  const boards = getSavedBoards()
  return boards.boards.find(b => b.id === boardId)
}

/**
 * Validate Jira credentials by attempting to fetch epics
 * @param projectKey - The Jira project key (e.g., "TMSGWEBSEC")
 * @param email - User's Jira email
 * @param token - User's Jira API token
 */
export async function validateJiraCredentials(
  projectKey: string,
  email: string,
  token: string
): Promise<{ valid: boolean; error?: string; epicsCount?: number }> {
  try {
    // Temporarily save credentials for validation
    await saveJiraCredentials({ email, token, rememberToken: false })
    
    // Build the board URL from project key
    const boardUrl = buildBoardUrl(projectKey)
    
    // Try to fetch epics
    const { parseJiraBoardUrl } = await import('./jira-client')
    const { domain, projectKey: parsedKey, boardId } = parseJiraBoardUrl(boardUrl)
    
    const response = await fetch('/api/jira/epics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        projectKey: parsedKey || projectKey,
        boardId,
        // Email and token will be read from cookie by the API
      }),
    })
    
    if (!response.ok) {
      const data = await response.json()
      return {
        valid: false,
        error: data.error || 'Failed to validate credentials'
      }
    }
    
    const data = await response.json()
    return {
      valid: true,
      epicsCount: data.epics?.length || 0
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Legacy compatibility: Check if we have saved credentials
 * This checks both email and token
 */
export async function hasSavedCredentials(): Promise<{ hasEmail: boolean; hasToken: boolean }> {
  const email = getSavedEmail()
  const hasToken = await hasValidToken()
  
  return {
    hasEmail: !!email,
    hasToken
  }
}

