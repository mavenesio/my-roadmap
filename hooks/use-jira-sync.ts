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

export interface JiraBoard {
  id: string
  name: string
  url: string
}

export interface SavedJiraBoards {
  email: string
  boards: JiraBoard[]
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
  const [savedCredentials, setSavedCredentials] = useLocalStorage<SavedJiraCredentials | null>('jira-credentials', null)
  const [savedBoards, setSavedBoards] = useLocalStorage<SavedJiraBoards>('jira-boards', { email: '', boards: [] })
  const [userMappings, setUserMappings] = useLocalStorage<JiraUserMapping[]>('jira-user-mappings', [])
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<SyncProgress | null>(null)

  const saveCredentials = useCallback((credentials: SavedJiraCredentials | null) => {
    setSavedCredentials(credentials)
  }, [setSavedCredentials])

  const getCredentials = useCallback(() => {
    return savedCredentials
  }, [savedCredentials])

  // Backwards compatibility: getToken
  const getToken = useCallback(() => {
    return savedCredentials?.token || null
  }, [savedCredentials])
  
  // New: Boards management
  const addBoard = useCallback((board: JiraBoard, email: string) => {
    setSavedBoards(prev => {
      // Remove any existing board with the same URL
      const filtered = prev.boards.filter(b => b.url !== board.url)
      return {
        email,
        boards: [...filtered, board]
      }
    })
  }, [setSavedBoards])
  
  const getBoards = useCallback(() => {
    return savedBoards
  }, [savedBoards])
  
  const getBoardById = useCallback((id: string): JiraBoard | undefined => {
    return savedBoards.boards.find(b => b.id === id)
  }, [savedBoards])
  
  const removeBoard = useCallback((id: string) => {
    setSavedBoards(prev => ({
      ...prev,
      boards: prev.boards.filter(b => b.id !== id)
    }))
  }, [setSavedBoards])

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

  // Step 1: Fetch only epics
  const fetchEpicsOnly = useCallback(async (credentials: JiraCredentials) => {
    setIsLoading(true)
    setError(null)
    setProgress({ current: 20, total: 100, message: 'Obteniendo épicas...' })

    try {
      // Save credentials if requested
      if (credentials.rememberToken) {
        saveCredentials({
          boardUrl: credentials.boardUrl,
          email: credentials.email,
          token: credentials.token,
        })
      } else {
        saveCredentials(null)
      }

      const epics = await fetchEpicsFromBoard(credentials.boardUrl, credentials.email, credentials.token)
      
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
  }, [saveCredentials])

  // Step 2: Fetch stories for selected epics
  const fetchStoriesForSelectedEpics = useCallback(async (
    selectedEpics: JiraEpic[],
    credentials: JiraCredentials
  ) => {
    setIsLoading(true)
    setError(null)
    setProgress({ current: 0, total: 100, message: 'Obteniendo stories...' })

    try {
      const { domain } = parseJiraBoardUrl(credentials.boardUrl)
      const allStories: { epicKey: string; stories: JiraStory[] }[] = []

      for (let i = 0; i < selectedEpics.length; i++) {
        const epic = selectedEpics[i]
        setProgress({
          current: ((i + 1) / selectedEpics.length) * 70,
          total: 100,
          message: `Obteniendo stories de ${epic.key}... (${i + 1}/${selectedEpics.length})`,
        })

        const stories = await fetchStoriesFromEpic(epic.key, domain, credentials.email, credentials.token)
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

  // Step 3: Fetch users
  const fetchUsersOnly = useCallback(async (credentials: JiraCredentials) => {
    setProgress({ current: 80, total: 100, message: 'Obteniendo usuarios...' })

    try {
      const users = await fetchJiraUsers(credentials.boardUrl, credentials.email, credentials.token)
      
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
  const syncFromJira = useCallback(async (
    credentials: JiraCredentials,
    onEpicsLoaded?: (epics: JiraEpic[]) => void,
    onStoriesLoaded?: (epicKey: string, stories: JiraStory[]) => void,
    onUsersLoaded?: (users: JiraUser[]) => void,
  ) => {
    setIsLoading(true)
    setError(null)
    setProgress({ current: 0, total: 100, message: 'Iniciando sincronización...' })

    try {
      const { domain } = parseJiraBoardUrl(credentials.boardUrl)

      // Save credentials if requested
      if (credentials.rememberToken) {
        saveCredentials({
          boardUrl: credentials.boardUrl,
          email: credentials.email,
          token: credentials.token,
        })
      } else {
        saveCredentials(null)
      }

      // Step 1: Fetch epics
      setProgress({ current: 10, total: 100, message: 'Obteniendo épicas...' })
      const epics = await fetchEpicsFromBoard(credentials.boardUrl, credentials.email, credentials.token)
      
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

        const stories = await fetchStoriesFromEpic(epic.key, domain, credentials.email, credentials.token)
        allStories.push({ epicKey: epic.key, stories })
        
        if (onStoriesLoaded) {
          onStoriesLoaded(epic.key, stories)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Step 3: Fetch users
      setProgress({ current: 80, total: 100, message: 'Obteniendo usuarios...' })
      const users = await fetchJiraUsers(credentials.boardUrl, credentials.email, credentials.token)
      
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
  }, [saveCredentials])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    isLoading,
    error,
    progress,
    savedCredentials,
    savedToken: savedCredentials?.token || null, // Backwards compatibility
    userMappings,
    savedBoards,
    
    // Actions - New Flow
    fetchEpicsOnly,
    fetchStoriesForSelectedEpics,
    fetchUsersOnly,
    
    // Actions - Legacy
    syncFromJira,
    
    // Credentials
    saveCredentials,
    getCredentials,
    getToken, // Backwards compatibility
    
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

