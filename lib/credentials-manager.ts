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
  TOKEN: 'jira-token',
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
 * Save Jira credentials to localStorage
 * Both email and token are stored in localStorage
 * Note: rememberToken parameter is kept for backwards compatibility but not used
 */
export function saveJiraCredentials(credentials: JiraCredentials): void {
  if (typeof window === 'undefined') return
  
  // Save email to localStorage
  localStorage.setItem(STORAGE_KEYS.EMAIL, credentials.email)
  
  // Save token to localStorage (only if rememberToken is true, otherwise sessionStorage)
  if (credentials.rememberToken) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, credentials.token)
    // Clear from sessionStorage if it was there
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN)
  } else {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, credentials.token)
    // Clear from localStorage if it was there
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
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
 * Get saved token from localStorage or sessionStorage
 */
export function getSavedToken(): string | null {
  if (typeof window === 'undefined') return null
  
  // Check localStorage first (persistent)
  const tokenFromLocal = localStorage.getItem(STORAGE_KEYS.TOKEN)
  if (tokenFromLocal) return tokenFromLocal
  
  // Check sessionStorage (session only)
  const tokenFromSession = sessionStorage.getItem(STORAGE_KEYS.TOKEN)
  if (tokenFromSession) return tokenFromSession
  
  return null
}

/**
 * Check if we have a valid token in storage
 */
export function hasValidToken(): boolean {
  const token = getSavedToken()
  return !!token && token.length > 0
}

/**
 * Get saved credentials (email and token)
 */
export function getSavedCredentials(): { email: string | null; token: string | null } {
  return {
    email: getSavedEmail(),
    token: getSavedToken(),
  }
}

/**
 * Clear all Jira credentials from localStorage and sessionStorage
 */
export function clearJiraCredentials(): void {
  if (typeof window === 'undefined') return
  
  // Clear email from localStorage
  localStorage.removeItem(STORAGE_KEYS.EMAIL)
  
  // Clear token from both storages
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
  sessionStorage.removeItem(STORAGE_KEYS.TOKEN)
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
    // Build the board URL from project key
    const boardUrl = buildBoardUrl(projectKey)
    
    // Try to fetch epics
    const { parseJiraBoardUrl } = await import('./jira-client')
    const { domain, projectKey: parsedKey, boardId } = parseJiraBoardUrl(boardUrl)
    
    const response = await fetch('/api/jira/epics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Jira-Email': email,
        'X-Jira-Token': token,
      },
      body: JSON.stringify({
        domain,
        projectKey: parsedKey || projectKey,
        boardId,
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
export function hasSavedCredentials(): { hasEmail: boolean; hasToken: boolean } {
  const email = getSavedEmail()
  const token = getSavedToken()
  
  return {
    hasEmail: !!email,
    hasToken: !!token
  }
}

