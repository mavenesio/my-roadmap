"use client"

import { useCallback } from 'react'
import { useLocalStorage } from './use-local-storage'

// Types
export type Priority = "Milestone" | "1" | "2" | "3"
export type Track = string
export type Status =
  | "TODO"
  | "PREWORK"
  | "WIP"
  | "TESTING"
  | "LAST LAP"
  | "DONE"
  | "ROLLOUT"
  | "DISMISSED"
  | "ON HOLD"
export type Size = "XS" | "S" | "M" | "L" | "XL"
export type TaskType =
  | "DEUDA TECNICA"
  | "CARRY OVER"
  | "EXTRA MILE"
  | "OVNI"
  | "POROTO"

export interface WeekAssignment {
  weekId: string
  assignees: string[]
}

export interface Comment {
  id: string
  text: string
  createdAt: number
}

export interface JiraSubtask {
  id: string
  key: string
  title: string
  status: string
  assignee?: {
    id: string
    displayName: string
    avatarUrl: string
  }
  startDate?: string
  endDate?: string
  createdAt?: string
  updatedAt?: string
  description?: string
}

export interface Task {
  id: string
  name: string
  priority: Priority
  track: Track
  status: Status
  size: Size
  type: TaskType
  order: number
  weeks: string[]
  assignments: WeekAssignment[]
  createdAt: number
  comments?: Comment[]
  jiraEpicKey?: string
  jiraEpicId?: string
  jiraEpicUrl?: string
  jiraSubtasks?: JiraSubtask[]
  jiraBoardId?: string
  jiraBoardName?: string
}

export interface AddTasksResult {
  added: number
  skipped: number
  errors: string[]
}

/**
 * Custom hook for managing roadmap tasks with validation
 * 
 * Features:
 * - Validates unique task IDs
 * - Validates unique Jira epic keys
 * - Prevents duplicates on bulk operations
 * - Provides detailed logging
 * - Returns operation results
 */
export function useRoadmapTasks(initialTasks: Task[] = []) {
  const [tasks, setTasks] = useLocalStorage<Task[]>('roadmap-tasks', initialTasks)
  
  /**
   * Validates if a task ID is unique
   */
  const validateUniqueId = useCallback((id: string, existingTasks: Task[]): boolean => {
    const exists = existingTasks.some(t => t.id === id)
    if (exists) {
      console.warn(`⚠️ Task with ID "${id}" already exists`)
    }
    return !exists
  }, [])
  
  /**
   * Validates if a Jira epic key is unique
   */
  const validateUniqueJiraKey = useCallback((jiraKey: string | undefined, existingTasks: Task[]): boolean => {
    if (!jiraKey) return true
    
    const exists = existingTasks.some(t => t.jiraEpicKey === jiraKey)
    if (exists) {
      console.warn(`⚠️ Task with Jira key "${jiraKey}" already exists`)
    }
    return !exists
  }, [])
  
  /**
   * Adds a single task with validation
   * @returns true if successful, false if duplicate found
   */
  const addTask = useCallback((newTask: Task): boolean => {
    let success = false
    
    setTasks(prevTasks => {
      // Validate unique ID
      if (!validateUniqueId(newTask.id, prevTasks)) {
        success = false
        return prevTasks
      }
      
      // Validate unique Jira key (if applicable)
      if (newTask.jiraEpicKey && !validateUniqueJiraKey(newTask.jiraEpicKey, prevTasks)) {
        success = false
        return prevTasks
      }
      
      console.log(`➕ Adding task: ${newTask.name}`)
      success = true
      return [...prevTasks, newTask]
    })
    
    return success
  }, [validateUniqueId, validateUniqueJiraKey])
  
  /**
   * Adds multiple tasks with validation
   * @returns Object with added count, skipped count, and error details
   */
  const addTasks = useCallback((newTasks: Task[]): AddTasksResult => {
    const result: AddTasksResult = { added: 0, skipped: 0, errors: [] }
    
    setTasks(prevTasks => {
      const existingIds = new Set(prevTasks.map(t => t.id))
      const existingJiraKeys = new Set(
        prevTasks.filter(t => t.jiraEpicKey).map(t => t.jiraEpicKey)
      )
      
      // Filter out duplicates
      const uniqueTasks = newTasks.filter(task => {
        // Validate ID
        if (existingIds.has(task.id)) {
          console.warn(`⚠️ Skipping duplicate task ID: ${task.id}`)
          result.errors.push(`Duplicate ID: ${task.id}`)
          result.skipped++
          return false
        }
        
        // Validate Jira key
        if (task.jiraEpicKey && existingJiraKeys.has(task.jiraEpicKey)) {
          console.warn(`⚠️ Skipping duplicate Jira key: ${task.jiraEpicKey}`)
          result.errors.push(`Duplicate Jira key: ${task.jiraEpicKey}`)
          result.skipped++
          return false
        }
        
        // Add to sets to prevent duplicates within newTasks array
        existingIds.add(task.id)
        if (task.jiraEpicKey) {
          existingJiraKeys.add(task.jiraEpicKey)
        }
        
        return true
      })
      
      result.added = uniqueTasks.length
      
      if (result.skipped > 0) {
        console.warn(`⚠️ Skipped ${result.skipped} duplicate tasks`)
      }
      
      if (result.added > 0) {
        console.log(`➕ Adding ${result.added} tasks`)
      }
      
      return [...prevTasks, ...uniqueTasks]
    })
    
    return result
  }, [])
  
  /**
   * Updates a single task
   * @returns true if successful, false if task not found
   */
  const updateTask = useCallback((taskId: string, updates: Partial<Task>): boolean => {
    let success = false
    
    setTasks(prevTasks => {
      const taskExists = prevTasks.some(t => t.id === taskId)
      
      if (!taskExists) {
        console.warn(`⚠️ Task "${taskId}" not found`)
        success = false
        return prevTasks
      }
      
      console.log(`🔄 Updating task: ${taskId}`)
      success = true
      
      return prevTasks.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      )
    })
    
    return success
  }, [])
  
  /**
   * Updates multiple tasks in a single operation
   * @returns number of tasks updated
   */
  const updateTasks = useCallback((updates: Array<{ id: string; updates: Partial<Task> }>): number => {
    let updatedCount = 0
    
    setTasks(prevTasks => {
      const updatesMap = new Map(updates.map(u => [u.id, u.updates]))
      
      return prevTasks.map(task => {
        if (updatesMap.has(task.id)) {
          updatedCount++
          return { ...task, ...updatesMap.get(task.id) }
        }
        return task
      })
    })
    
    if (updatedCount > 0) {
      console.log(`🔄 Updated ${updatedCount} tasks`)
    }
    
    return updatedCount
  }, [])
  
  /**
   * Removes a single task
   * @returns true if successful, false if task not found
   */
  const removeTask = useCallback((taskId: string): boolean => {
    let success = false
    
    setTasks(prevTasks => {
      const taskExists = prevTasks.some(t => t.id === taskId)
      
      if (!taskExists) {
        console.warn(`⚠️ Task "${taskId}" not found`)
        success = false
        return prevTasks
      }
      
      console.log(`🗑️ Removing task: ${taskId}`)
      success = true
      
      return prevTasks.filter(t => t.id !== taskId)
    })
    
    return success
  }, [])
  
  /**
   * Removes multiple tasks
   * @returns number of tasks removed
   */
  const removeTasks = useCallback((taskIds: string[]): number => {
    let removedCount = 0
    
    setTasks(prevTasks => {
      const idsToRemove = new Set(taskIds)
      const filtered = prevTasks.filter(t => {
        if (idsToRemove.has(t.id)) {
          removedCount++
          return false
        }
        return true
      })
      
      if (removedCount > 0) {
        console.log(`🗑️ Removed ${removedCount} tasks`)
      }
      
      return filtered
    })
    
    return removedCount
  }, [])
  
  /**
   * Replaces all tasks (useful for import)
   */
  const replaceTasks = useCallback((newTasks: Task[]) => {
    console.log(`🔄 Replacing all tasks with ${newTasks.length} new tasks`)
    setTasks(newTasks)
  }, [setTasks])
  
  /**
   * Finds a task by ID
   */
  const getTaskById = useCallback((taskId: string): Task | undefined => {
    return tasks.find(t => t.id === taskId)
  }, [tasks])
  
  /**
   * Finds a task by Jira epic key
   */
  const getTaskByJiraKey = useCallback((jiraKey: string): Task | undefined => {
    return tasks.find(t => t.jiraEpicKey === jiraKey)
  }, [tasks])
  
  return {
    tasks,
    addTask,
    addTasks,
    updateTask,
    updateTasks,
    removeTask,
    removeTasks,
    replaceTasks,
    getTaskById,
    getTaskByJiraKey,
  }
}

