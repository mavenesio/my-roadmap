/**
 * Storage Validation Script
 * 
 * This script validates and analyzes localStorage data structure
 * to find duplicates, inconsistencies, and potential improvements.
 */

interface ValidationReport {
  summary: {
    totalKeys: number
    totalSize: string
    issues: number
    warnings: number
  }
  keys: {
    [key: string]: {
      exists: boolean
      size: string
      itemCount?: number
      issues: string[]
      warnings: string[]
      data?: any
    }
  }
  recommendations: string[]
}

export function validateLocalStorage(): ValidationReport {
  const report: ValidationReport = {
    summary: {
      totalKeys: 0,
      totalSize: '0 KB',
      issues: 0,
      warnings: 0
    },
    keys: {},
    recommendations: []
  }

  const expectedKeys = [
    'roadmap-config',
    'roadmap-tasks',
    'jira-credentials',
    'jira-user-mappings',
    'todo-lists',
    'todos'
  ]

  let totalSize = 0

  // Validate each expected key
  expectedKeys.forEach(key => {
    const value = localStorage.getItem(key)
    const exists = value !== null
    
    if (!exists) {
      report.keys[key] = {
        exists: false,
        size: '0 KB',
        issues: ['Key does not exist in localStorage'],
        warnings: []
      }
      report.summary.issues++
      return
    }

    const size = new Blob([value]).size
    totalSize += size
    
    report.keys[key] = {
      exists: true,
      size: `${(size / 1024).toFixed(2)} KB`,
      issues: [],
      warnings: []
    }

    try {
      const data = JSON.parse(value)
      report.keys[key].data = data

      // Validate specific keys
      switch(key) {
        case 'roadmap-config':
          validateRoadmapConfig(data, report.keys[key])
          break
        case 'roadmap-tasks':
          validateRoadmapTasks(data, report.keys[key])
          break
        case 'jira-user-mappings':
          validateJiraUserMappings(data, report.keys[key])
          break
        case 'todo-lists':
        case 'todos':
          validateTodos(key, data, report.keys[key])
          break
      }
    } catch (error) {
      report.keys[key].issues.push(`Invalid JSON: ${error}`)
      report.summary.issues++
    }
  })

  report.summary.totalKeys = expectedKeys.length
  report.summary.totalSize = `${(totalSize / 1024).toFixed(2)} KB`
  report.summary.issues = Object.values(report.keys).reduce((sum, k) => sum + k.issues.length, 0)
  report.summary.warnings = Object.values(report.keys).reduce((sum, k) => sum + k.warnings.length, 0)

  // Generate recommendations
  generateRecommendations(report)

  return report
}

function validateRoadmapConfig(data: any, keyReport: any) {
  if (!data) {
    keyReport.issues.push('Config is null or undefined')
    return
  }

  // Check required fields
  const requiredFields = ['quarter', 'year', 'weeks', 'teamMembers', 'tracks', 'priorities', 'statuses', 'types', 'sizes']
  requiredFields.forEach(field => {
    if (!data[field]) {
      keyReport.issues.push(`Missing required field: ${field}`)
    }
  })

  // Check for duplicate team members
  if (data.teamMembers && Array.isArray(data.teamMembers)) {
    keyReport.itemCount = data.teamMembers.length
    const names = data.teamMembers.map((m: any) => m.name)
    const duplicates = names.filter((name: string, index: number) => names.indexOf(name) !== index)
    
    if (duplicates.length > 0) {
      keyReport.issues.push(`Duplicate team members found: ${[...new Set(duplicates)].join(', ')}`)
    }

    // Check for members without colors
    const withoutColor = data.teamMembers.filter((m: any) => !m.color)
    if (withoutColor.length > 0) {
      keyReport.warnings.push(`${withoutColor.length} team members without color`)
    }

    // Check for members with avatarUrl
    const withAvatar = data.teamMembers.filter((m: any) => m.avatarUrl)
    if (withAvatar.length > 0) {
      keyReport.warnings.push(`${withAvatar.length} team members have avatar URLs (good!)`)
    }
  }

  // Check for duplicate tracks
  if (data.tracks && Array.isArray(data.tracks)) {
    const trackNames = data.tracks.map((t: any) => t.name)
    const duplicateTracks = trackNames.filter((name: string, index: number) => trackNames.indexOf(name) !== index)
    
    if (duplicateTracks.length > 0) {
      keyReport.issues.push(`Duplicate tracks found: ${[...new Set(duplicateTracks)].join(', ')}`)
    }
  }

  // Check for deprecated 'projects' field
  if (data.projects) {
    keyReport.warnings.push('Deprecated "projects" field exists, should migrate to "tracks"')
  }
}

function validateRoadmapTasks(data: any, keyReport: any) {
  if (!Array.isArray(data)) {
    keyReport.issues.push('Tasks should be an array')
    return
  }

  keyReport.itemCount = data.length

  // Check for duplicate task IDs
  const ids = data.map((t: any) => t.id)
  const duplicateIds = ids.filter((id: string, index: number) => ids.indexOf(id) !== index)
  
  if (duplicateIds.length > 0) {
    keyReport.issues.push(`Duplicate task IDs found: ${[...new Set(duplicateIds)].join(', ')}`)
  }

  // Check for duplicate Jira epic keys
  const jiraEpicKeys = data
    .filter((t: any) => t.jiraEpicKey)
    .map((t: any) => t.jiraEpicKey)
  
  const duplicateJiraKeys = jiraEpicKeys.filter((key: string, index: number) => jiraEpicKeys.indexOf(key) !== index)
  
  if (duplicateJiraKeys.length > 0) {
    keyReport.warnings.push(`Duplicate Jira epic keys found: ${[...new Set(duplicateJiraKeys)].join(', ')}`)
  }

  // Count Jira-synced tasks
  const jiraTasks = data.filter((t: any) => t.jiraEpicKey)
  if (jiraTasks.length > 0) {
    keyReport.warnings.push(`${jiraTasks.length} tasks synced from Jira`)
  }

  // Check for tasks without required fields
  const requiredFields = ['id', 'name', 'priority', 'track', 'status']
  data.forEach((task: any, index: number) => {
    requiredFields.forEach(field => {
      if (!task[field]) {
        keyReport.issues.push(`Task ${index} (${task.name || 'unnamed'}) missing field: ${field}`)
      }
    })
  })
}

function validateJiraUserMappings(data: any, keyReport: any) {
  if (!Array.isArray(data)) {
    keyReport.issues.push('Jira user mappings should be an array')
    return
  }

  keyReport.itemCount = data.length

  // Check for duplicate Jira account IDs
  const accountIds = data.map((m: any) => m.jiraAccountId)
  const duplicates = accountIds.filter((id: string, index: number) => accountIds.indexOf(id) !== index)
  
  if (duplicates.length > 0) {
    keyReport.issues.push(`Duplicate Jira account IDs found: ${duplicates.length} duplicates`)
  }

  // Check for mappings to non-existent system users
  const systemUserNames = data.map((m: any) => m.systemUserName)
  keyReport.warnings.push(`Mapped to ${[...new Set(systemUserNames)].length} unique system users`)
}

function validateTodos(key: string, data: any, keyReport: any) {
  if (!Array.isArray(data)) {
    keyReport.issues.push(`${key} should be an array`)
    return
  }

  keyReport.itemCount = data.length

  if (key === 'todo-lists') {
    // Check for duplicate list IDs
    const ids = data.map((l: any) => l.id)
    const duplicates = ids.filter((id: string, index: number) => ids.indexOf(id) !== index)
    
    if (duplicates.length > 0) {
      keyReport.issues.push(`Duplicate todo list IDs: ${duplicates.length} duplicates`)
    }
  }

  if (key === 'todos') {
    // Check for duplicate todo IDs
    const ids = data.map((t: any) => t.id)
    const duplicates = ids.filter((id: string, index: number) => ids.indexOf(id) !== index)
    
    if (duplicates.length > 0) {
      keyReport.issues.push(`Duplicate todo IDs: ${duplicates.length} duplicates`)
    }

    // Check for orphaned todos (todos without a valid list)
    const todoListsData = localStorage.getItem('todo-lists')
    if (todoListsData) {
      try {
        const lists = JSON.parse(todoListsData)
        const listIds = new Set(lists.map((l: any) => l.id))
        const orphaned = data.filter((t: any) => !listIds.has(t.listId))
        
        if (orphaned.length > 0) {
          keyReport.warnings.push(`${orphaned.length} orphaned todos (no parent list)`)
        }
      } catch (e) {
        // Ignore
      }
    }
  }
}

function generateRecommendations(report: ValidationReport) {
  const { keys, summary } = report

  if (summary.issues > 0) {
    report.recommendations.push(`🔴 Fix ${summary.issues} critical issues found`)
  }

  // Check if cleanup is needed
  if (keys['jira-user-mappings']?.itemCount && keys['jira-user-mappings'].itemCount > 50) {
    report.recommendations.push('Consider cleaning up old Jira user mappings')
  }

  if (keys['roadmap-tasks']?.itemCount && keys['roadmap-tasks'].itemCount > 100) {
    report.recommendations.push('Consider archiving old completed tasks')
  }

  // Check for data integrity between keys
  const config = keys['roadmap-config']?.data
  const tasks = keys['roadmap-tasks']?.data

  if (config && tasks && Array.isArray(tasks)) {
    // Check for tasks referencing non-existent team members
    const teamMemberNames = new Set(config.teamMembers?.map((m: any) => m.name) || [])
    const allAssignees = new Set<string>()
    
    tasks.forEach((task: any) => {
      task.assignments?.forEach((assignment: any) => {
        assignment.assignees?.forEach((assignee: string) => {
          allAssignees.add(assignee)
        })
      })
    })

    const orphanedAssignees = [...allAssignees].filter(a => !teamMemberNames.has(a))
    if (orphanedAssignees.length > 0) {
      report.recommendations.push(`⚠️ ${orphanedAssignees.length} assignees in tasks don't exist in team members: ${orphanedAssignees.slice(0, 3).join(', ')}${orphanedAssignees.length > 3 ? '...' : ''}`)
    }

    // Check for tasks referencing non-existent tracks
    const trackNames = new Set(config.tracks?.map((t: any) => t.name) || [])
    const taskTracks = [...new Set(tasks.map((t: any) => t.track))]
    const orphanedTracks = taskTracks.filter(t => t && !trackNames.has(t))
    
    if (orphanedTracks.length > 0) {
      report.recommendations.push(`⚠️ ${orphanedTracks.length} tasks reference non-existent tracks: ${orphanedTracks.join(', ')}`)
    }
  }

  if (summary.issues === 0 && summary.warnings === 0) {
    report.recommendations.push('✅ All data looks good! No issues found.')
  }
}

// Export function to run validation
export function runValidation() {
  const report = validateLocalStorage()
  
  console.log('\n========================================')
  console.log('📊 LOCALSTORAGE VALIDATION REPORT')
  console.log('========================================\n')
  
  console.log('📈 Summary:')
  console.log(`   Total Keys: ${report.summary.totalKeys}`)
  console.log(`   Total Size: ${report.summary.totalSize}`)
  console.log(`   Issues: ${report.summary.issues}`)
  console.log(`   Warnings: ${report.summary.warnings}`)
  console.log('\n')
  
  Object.entries(report.keys).forEach(([key, data]) => {
    console.log(`🔑 ${key}:`)
    console.log(`   Exists: ${data.exists}`)
    console.log(`   Size: ${data.size}`)
    if (data.itemCount !== undefined) {
      console.log(`   Items: ${data.itemCount}`)
    }
    
    if (data.issues.length > 0) {
      console.log(`   ❌ Issues:`)
      data.issues.forEach(issue => console.log(`      - ${issue}`))
    }
    
    if (data.warnings.length > 0) {
      console.log(`   ⚠️  Warnings:`)
      data.warnings.forEach(warning => console.log(`      - ${warning}`))
    }
    console.log('')
  })
  
  if (report.recommendations.length > 0) {
    console.log('💡 Recommendations:')
    report.recommendations.forEach(rec => console.log(`   ${rec}`))
  }
  
  console.log('\n========================================\n')
  
  return report
}

