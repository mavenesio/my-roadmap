"use client"

import { useState, useCallback } from 'react'
import { useLocalStorage } from './use-local-storage'
import {
  fetchEpicsFromBoard,
  fetchStoriesFromEpic,
  fetchJiraUsers,
  parseJiraBoardUrl,
  type JiraEpic,
  type JiraStory,
  type JiraUser,
} from '@/lib/jira-client'
import {
  getSavedEmail,
  getSavedBoards,
  saveBoards,
  addBoard as addBoardToStorage,
  removeBoard as removeBoardFromStorage,
  getBoardById as getBoardByIdFromStorage,
  hasValidToken,
  type JiraBoard,
  type SavedJiraBoards,
} from '@/lib/credentials-manager'

export interface JiraCredentials {
  boardUrl: string
  email: string
  token: string
  rememberToken: boolean
}

export interface SavedJiraCredentials {
  boardUrl: string
  email: string
  token: string
}

export interface JiraUserMapping {
  jiraAccountId: string
  jiraDisplayName: string
  jiraAvatarUrl: string
  systemUserName: string // Name of the user in the system
}

export interface SyncProgress {
  current: number
  total: number
  message: string
}

export function useJiraSync() {
  // User mappings still stored in localStorage (not sensitive data)
  const [userMappings, setUserMappings] = useLocalStorage<JiraUserMapping[]>('jira-user-mappings', [])
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<SyncProgress | null>(null)

  // Get saved credentials (from cookies + localStorage)
  const getCredentials = useCallback(async () => {
    const email = getSavedEmail()
    const hasToken = await hasValidToken()
    
    if (!email || !hasToken) {
      return null
    }
    
    return {
      email,
      hasToken,
    }
  }, [])

  // Legacy: getToken - now checks if token exists in cookie
  const getToken = useCallback(async () => {
    const hasToken = await hasValidToken()
    return hasToken ? 'exists' : null
  }, [])
  
  // Boards Management
  const addBoard = useCallback((board: JiraBoard, email: string) => {
    addBoardToStorage(board, email)
  }, [])
  
  const getBoards = useCallback((): SavedJiraBoards => {
    return getSavedBoards()
  }, [])
  
  const getBoardById = useCallback((id: string): JiraBoard | undefined => {
    return getBoardByIdFromStorage(id)
  }, [])
  
  const removeBoard = useCallback((id: string) => {
    removeBoardFromStorage(id)
  }, [])

  // User Mappings
  const addUserMapping = useCallback((mapping: JiraUserMapping) => {
    setUserMappings(prev => {
      // Remove any existing mapping for this Jira user
      const filtered = prev.filter(m => m.jiraAccountId !== mapping.jiraAccountId)
      return [...filtered, mapping]
    })
  }, [setUserMappings])

  const addUserMappings = useCallback((mappings: JiraUserMapping[]) => {
    setUserMappings(prev => {
      const jiraAccountIds = new Set(mappings.map(m => m.jiraAccountId))
      // Remove existing mappings for these Jira users
      const filtered = prev.filter(m => !jiraAccountIds.has(m.jiraAccountId))
      return [...filtered, ...mappings]
    })
  }, [setUserMappings])

  const getUserMapping = useCallback((jiraAccountId: string): JiraUserMapping | undefined => {
    return userMappings.find(m => m.jiraAccountId === jiraAccountId)
  }, [userMappings])

  const getUnmappedUsers = useCallback((jiraUsers: JiraUser[]): JiraUser[] => {
    const mappedIds = new Set(userMappings.map(m => m.jiraAccountId))
    return jiraUsers.filter(user => !mappedIds.has(user.accountId))
  }, [userMappings])

  // Fetch only epics (credentials read from cookies)
  const fetchEpicsOnly = useCallback(async (boardUrl: string) => {
    setIsLoading(true)
    setError(null)
    setProgress({ current: 20, total: 100, message: 'Obteniendo épicas...' })

    try {
      const epics = await fetchEpicsFromBoard(boardUrl)
      
      setProgress({ current: 100, total: 100, message: 'Épicas obtenidas' })
      setIsLoading(false)

      return epics
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener épicas'
      setError(errorMessage)
      setIsLoading(false)
      setProgress(null)
      throw err
    }
  }, [])

  // Fetch stories for selected epics (credentials read from cookies)
  const fetchStoriesForSelectedEpics = useCallback(async (
    selectedEpics: JiraEpic[],
    boardUrl: string
  ) => {
    setIsLoading(true)
    setError(null)
    setProgress({ current: 0, total: 100, message: 'Obteniendo stories...' })

    try {
      const { domain } = parseJiraBoardUrl(boardUrl)
      const allStories: { epicKey: string; stories: JiraStory[] }[] = []

      for (let i = 0; i < selectedEpics.length; i++) {
        const epic = selectedEpics[i]
        setProgress({
          current: ((i + 1) / selectedEpics.length) * 70,
          total: 100,
          message: `Obteniendo stories de ${epic.key}... (${i + 1}/${selectedEpics.length})`,
        })

        const stories = await fetchStoriesFromEpic(epic.key, domain)
        allStories.push({ epicKey: epic.key, stories })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      setProgress({ current: 70, total: 100, message: 'Stories obtenidas' })
      
      return allStories
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener stories'
      setError(errorMessage)
      setIsLoading(false)
      setProgress(null)
      throw err
    }
  }, [])

  // Fetch users (credentials read from cookies)
  const fetchUsersOnly = useCallback(async (boardUrl: string) => {
    setProgress({ current: 80, total: 100, message: 'Obteniendo usuarios...' })

    try {
      const users = await fetchJiraUsers(boardUrl)
      
      setProgress({ current: 100, total: 100, message: 'Sincronización completada' })
      setIsLoading(false)

      return users
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener usuarios'
      setError(errorMessage)
      setIsLoading(false)
      setProgress(null)
      throw err
    }
  }, [])

  // Legacy: Complete sync (for backwards compatibility)
  // Note: Credentials must be saved in cookies before calling this
  const syncFromJira = useCallback(async (
    boardUrl: string,
    onEpicsLoaded?: (epics: JiraEpic[]) => void,
    onStoriesLoaded?: (epicKey: string, stories: JiraStory[]) => void,
    onUsersLoaded?: (users: JiraUser[]) => void,
  ) => {
    setIsLoading(true)
    setError(null)
    setProgress({ current: 0, total: 100, message: 'Iniciando sincronización...' })

    try {
      const { domain } = parseJiraBoardUrl(boardUrl)

      // Step 1: Fetch epics
      setProgress({ current: 10, total: 100, message: 'Obteniendo épicas...' })
      const epics = await fetchEpicsFromBoard(boardUrl)
      
      if (onEpicsLoaded) {
        onEpicsLoaded(epics)
      }

      // Step 2: Fetch stories for each epic
      const allStories: { epicKey: string; stories: JiraStory[] }[] = []
      for (let i = 0; i < epics.length; i++) {
        const epic = epics[i]
        setProgress({
          current: 10 + ((i + 1) / epics.length) * 60,
          total: 100,
          message: `Obteniendo stories de ${epic.key}... (${i + 1}/${epics.length})`,
        })

        const stories = await fetchStoriesFromEpic(epic.key, domain)
        allStories.push({ epicKey: epic.key, stories })
        
        if (onStoriesLoaded) {
          onStoriesLoaded(epic.key, stories)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Step 3: Fetch users
      setProgress({ current: 80, total: 100, message: 'Obteniendo usuarios...' })
      const users = await fetchJiraUsers(boardUrl)
      
      if (onUsersLoaded) {
        onUsersLoaded(users)
      }

      setProgress({ current: 100, total: 100, message: 'Sincronización completada' })
      setIsLoading(false)

      return { epics, allStories, users }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al sincronizar con Jira'
      setError(errorMessage)
      setIsLoading(false)
      setProgress(null)
      throw err
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    isLoading,
    error,
    progress,
    savedBoards: getBoards(),
    userMappings,
    
    // Actions - New Flow
    fetchEpicsOnly,
    fetchStoriesForSelectedEpics,
    fetchUsersOnly,
    
    // Actions - Legacy
    syncFromJira,
    
    // Credentials (now async because they check cookies)
    getCredentials,
    getToken, // Returns 'exists' or null
    
    // Boards Management
    addBoard,
    getBoards,
    getBoardById,
    removeBoard,
    
    // User Mappings
    addUserMapping,
    addUserMappings,
    getUserMapping,
    getUnmappedUsers,
    
    // Utils
    clearError,
  }
}
