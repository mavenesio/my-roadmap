/**
 * Data Integrity Validation Utilities
 * 
 * Ensures referential integrity between tasks, team members, and configuration
 */

import type { RoadmapConfig, TeamMember } from '@/hooks/use-roadmap-config'
import type { Task } from '@/hooks/use-roadmap-tasks'

export interface IntegrityReport {
  isValid: boolean
  errors: string[]
  warnings: string[]
  fixed: string[]
}

/**
 * Validates and cleans a single task to ensure referential integrity
 * 
 * Checks:
 * - Track exists in config.tracks
 * - Assignees exist in config.teamMembers
 * - Priority exists in config.priorities
 * - Status exists in config.statuses
 * - Type exists in config.types
 * - Size exists in config.sizes
 * 
 * @param task - Task to validate
 * @param config - Current roadmap configuration
 * @returns Cleaned task and integrity report
 */
export function validateTaskIntegrity(
  task: Task,
  config: RoadmapConfig
): { task: Task; report: IntegrityReport } {
  const report: IntegrityReport = {
    isValid: true,
    errors: [],
    warnings: [],
    fixed: []
  }
  
  let cleanedTask = { ...task }
  
  // Validate track
  const validTracks = new Set(config.tracks.map(t => t.name))
  if (!validTracks.has(task.track)) {
    report.warnings.push(`Task "${task.name}": Invalid track "${task.track}"`)
    cleanedTask.track = config.tracks[0]?.name || 'Guardians'
    report.fixed.push(`Task "${task.name}": Changed track to "${cleanedTask.track}"`)
  }
  
  // Validate and clean assignees
  const validMembers = new Set(config.teamMembers.map(m => m.name))
  const cleanedAssignments = task.assignments.map(assignment => {
    const originalCount = assignment.assignees.length
    const validAssignees = assignment.assignees.filter(assignee => {
      if (!validMembers.has(assignee)) {
        report.warnings.push(`Task "${task.name}": Orphaned assignee "${assignee}"`)
        report.fixed.push(`Task "${task.name}": Removed assignee "${assignee}"`)
        return false
      }
      return true
    })
    
    return {
      ...assignment,
      assignees: validAssignees
    }
  })
  
  cleanedTask.assignments = cleanedAssignments
  
  // Validate priority
  const validPriorities = new Set(config.priorities.map(p => p.name))
  if (!validPriorities.has(task.priority)) {
    report.warnings.push(`Task "${task.name}": Invalid priority "${task.priority}"`)
    cleanedTask.priority = (config.defaults?.priority || "3") as any
    report.fixed.push(`Task "${task.name}": Changed priority to "${cleanedTask.priority}"`)
  }
  
  // Validate status
  const validStatuses = new Set(config.statuses.map(s => s.name))
  if (!validStatuses.has(task.status)) {
    report.warnings.push(`Task "${task.name}": Invalid status "${task.status}"`)
    cleanedTask.status = (config.defaults?.status || "TODO") as any
    report.fixed.push(`Task "${task.name}": Changed status to "${cleanedTask.status}"`)
  }
  
  // Validate type
  const validTypes = new Set(config.types.map(t => t.name))
  if (!validTypes.has(task.type)) {
    report.warnings.push(`Task "${task.name}": Invalid type "${task.type}"`)
    cleanedTask.type = (config.defaults?.type || "POROTO") as any
    report.fixed.push(`Task "${task.name}": Changed type to "${cleanedTask.type}"`)
  }
  
  // Validate size
  const validSizes = new Set(config.sizes)
  if (!validSizes.has(task.size)) {
    report.warnings.push(`Task "${task.name}": Invalid size "${task.size}"`)
    cleanedTask.size = (config.defaults?.size || "M") as any
    report.fixed.push(`Task "${task.name}": Changed size to "${cleanedTask.size}"`)
  }
  
  report.isValid = report.errors.length === 0
  
  return { task: cleanedTask, report }
}

/**
 * Validates all tasks and returns cleaned versions
 * 
 * @param tasks - Array of tasks to validate
 * @param config - Current roadmap configuration
 * @returns Cleaned tasks and aggregated integrity report
 */
export function validateAllTasks(
  tasks: Task[],
  config: RoadmapConfig
): { tasks: Task[]; report: IntegrityReport } {
  const aggregatedReport: IntegrityReport = {
    isValid: true,
    errors: [],
    warnings: [],
    fixed: []
  }
  
  const validatedTasks = tasks.map(task => {
    const { task: cleanedTask, report } = validateTaskIntegrity(task, config)
    
    aggregatedReport.errors.push(...report.errors)
    aggregatedReport.warnings.push(...report.warnings)
    aggregatedReport.fixed.push(...report.fixed)
    
    return cleanedTask
  })
  
  aggregatedReport.isValid = aggregatedReport.errors.length === 0
  
  if (aggregatedReport.warnings.length > 0) {
    console.warn(`⚠️ Data integrity check found ${aggregatedReport.warnings.length} warnings`)
  }
  
  if (aggregatedReport.fixed.length > 0) {
    console.log(`🔧 Fixed ${aggregatedReport.fixed.length} integrity issues`)
  }
  
  return { tasks: validatedTasks, report: aggregatedReport }
}

/**
 * Finds and reports duplicate team members
 * 
 * @param members - Array of team members
 * @returns Array of duplicate member names
 */
export function findDuplicateMembers(members: TeamMember[]): string[] {
  const seen = new Set<string>()
  const duplicates: string[] = []
  
  members.forEach(member => {
    const key = member.name.toLowerCase()
    if (seen.has(key)) {
      duplicates.push(member.name)
    } else {
      seen.add(key)
    }
  })
  
  return duplicates
}

/**
 * Finds and reports duplicate tasks
 * 
 * @param tasks - Array of tasks
 * @returns Object with arrays of duplicate IDs and Jira keys
 */
export function findDuplicateTasks(tasks: Task[]): { 
  byId: string[]
  byJiraKey: string[] 
} {
  const seenIds = new Set<string>()
  const seenJiraKeys = new Set<string>()
  const duplicateIds: string[] = []
  const duplicateJiraKeys: string[] = []
  
  tasks.forEach(task => {
    // Check ID
    if (seenIds.has(task.id)) {
      duplicateIds.push(task.id)
    } else {
      seenIds.add(task.id)
    }
    
    // Check Jira key
    if (task.jiraEpicKey) {
      if (seenJiraKeys.has(task.jiraEpicKey)) {
        duplicateJiraKeys.push(task.jiraEpicKey)
      } else {
        seenJiraKeys.add(task.jiraEpicKey)
      }
    }
  })
  
  return { byId: duplicateIds, byJiraKey: duplicateJiraKeys }
}

/**
 * Removes duplicate team members, keeping the first occurrence
 * 
 * @param members - Array of team members (potentially with duplicates)
 * @returns Array of unique team members
 */
export function deduplicateMembers(members: TeamMember[]): TeamMember[] {
  const seen = new Set<string>()
  const unique: TeamMember[] = []
  
  members.forEach(member => {
    const key = member.name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(member)
    }
  })
  
  const removed = members.length - unique.length
  if (removed > 0) {
    console.log(`🔧 Removed ${removed} duplicate team members`)
  }
  
  return unique
}

/**
 * Removes duplicate tasks, keeping the first occurrence
 * 
 * @param tasks - Array of tasks (potentially with duplicates)
 * @returns Array of unique tasks
 */
export function deduplicateTasks(tasks: Task[]): Task[] {
  const seenIds = new Set<string>()
  const seenJiraKeys = new Set<string>()
  const unique: Task[] = []
  
  tasks.forEach(task => {
    // Check if duplicate by ID
    if (seenIds.has(task.id)) {
      console.warn(`⚠️ Removing duplicate task ID: ${task.id}`)
      return
    }
    
    // Check if duplicate by Jira key
    if (task.jiraEpicKey && seenJiraKeys.has(task.jiraEpicKey)) {
      console.warn(`⚠️ Removing duplicate Jira key: ${task.jiraEpicKey}`)
      return
    }
    
    seenIds.add(task.id)
    if (task.jiraEpicKey) {
      seenJiraKeys.add(task.jiraEpicKey)
    }
    unique.push(task)
  })
  
  const removed = tasks.length - unique.length
  if (removed > 0) {
    console.log(`🔧 Removed ${removed} duplicate tasks`)
  }
  
  return unique
}

/**
 * Comprehensive validation of all data
 * 
 * @param tasks - Array of tasks
 * @param config - Current roadmap configuration
 * @returns Comprehensive integrity report
 */
export function validateAllData(
  tasks: Task[],
  config: RoadmapConfig
): IntegrityReport {
  const report: IntegrityReport = {
    isValid: true,
    errors: [],
    warnings: [],
    fixed: []
  }
  
  // Check for duplicate team members
  const duplicateMembers = findDuplicateMembers(config.teamMembers)
  if (duplicateMembers.length > 0) {
    report.warnings.push(`Found ${duplicateMembers.length} duplicate team members`)
    duplicateMembers.forEach(name => {
      report.warnings.push(`  - Duplicate: ${name}`)
    })
  }
  
  // Check for duplicate tasks
  const { byId, byJiraKey } = findDuplicateTasks(tasks)
  if (byId.length > 0) {
    report.warnings.push(`Found ${byId.length} duplicate task IDs`)
    byId.forEach(id => {
      report.warnings.push(`  - Duplicate ID: ${id}`)
    })
  }
  if (byJiraKey.length > 0) {
    report.warnings.push(`Found ${byJiraKey.length} duplicate Jira keys`)
    byJiraKey.forEach(key => {
      report.warnings.push(`  - Duplicate Jira key: ${key}`)
    })
  }
  
  // Validate task integrity
  const { report: taskReport } = validateAllTasks(tasks, config)
  report.warnings.push(...taskReport.warnings)
  report.errors.push(...taskReport.errors)
  report.fixed.push(...taskReport.fixed)
  
  report.isValid = report.errors.length === 0 && report.warnings.length === 0
  
  return report
}

