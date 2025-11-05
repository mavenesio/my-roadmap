/**
 * Storage Validation Script - Browser Version
 * 
 * Paste this into the browser console to validate localStorage
 * Usage: validateStorage()
 */

function validateStorage() {
  const report = {
    summary: {
      totalKeys: 0,
      totalSize: 0,
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
        size: 0,
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
      size: size,
      issues: [],
      warnings: []
    }

    try {
      const data = JSON.parse(value)

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
      report.keys[key].issues.push(`Invalid JSON: ${error.message}`)
      report.summary.issues++
    }
  })

  report.summary.totalKeys = expectedKeys.length
  report.summary.totalSize = totalSize
  report.summary.issues = Object.values(report.keys).reduce((sum, k) => sum + k.issues.length, 0)
  report.summary.warnings = Object.values(report.keys).reduce((sum, k) => sum + k.warnings.length, 0)

  // Generate recommendations
  generateRecommendations(report)

  // Print report
  printReport(report)

  return report
}

function validateRoadmapConfig(data, keyReport) {
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
    const names = data.teamMembers.map(m => m.name)
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
    
    if (duplicates.length > 0) {
      keyReport.issues.push(`Duplicate team members: ${[...new Set(duplicates)].join(', ')}`)
    }

    // Check for members without colors
    const withoutColor = data.teamMembers.filter(m => !m.color)
    if (withoutColor.length > 0) {
      keyReport.warnings.push(`${withoutColor.length} team members without color`)
    }

    // Check for members with avatarUrl
    const withAvatar = data.teamMembers.filter(m => m.avatarUrl)
    if (withAvatar.length > 0) {
      keyReport.warnings.push(`${withAvatar.length} team members have avatar URLs`)
    }
  }

  // Check for duplicate tracks
  if (data.tracks && Array.isArray(data.tracks)) {
    const trackNames = data.tracks.map(t => t.name)
    const duplicateTracks = trackNames.filter((name, index) => trackNames.indexOf(name) !== index)
    
    if (duplicateTracks.length > 0) {
      keyReport.issues.push(`Duplicate tracks: ${[...new Set(duplicateTracks)].join(', ')}`)
    }
  }

  // Check for deprecated 'projects' field
  if (data.projects) {
    keyReport.warnings.push('Deprecated "projects" field exists')
  }
}

function validateRoadmapTasks(data, keyReport) {
  if (!Array.isArray(data)) {
    keyReport.issues.push('Tasks should be an array')
    return
  }

  keyReport.itemCount = data.length

  // Check for duplicate task IDs
  const ids = data.map(t => t.id)
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
  
  if (duplicateIds.length > 0) {
    keyReport.issues.push(`Duplicate task IDs: ${[...new Set(duplicateIds)].join(', ')}`)
  }

  // Check for duplicate Jira epic keys
  const jiraEpicKeys = data
    .filter(t => t.jiraEpicKey)
    .map(t => t.jiraEpicKey)
  
  const duplicateJiraKeys = jiraEpicKeys.filter((key, index) => jiraEpicKeys.indexOf(key) !== index)
  
  if (duplicateJiraKeys.length > 0) {
    keyReport.warnings.push(`Duplicate Jira epic keys: ${[...new Set(duplicateJiraKeys)].join(', ')}`)
  }

  // Count Jira-synced tasks
  const jiraTasks = data.filter(t => t.jiraEpicKey)
  if (jiraTasks.length > 0) {
    keyReport.warnings.push(`${jiraTasks.length} tasks synced from Jira`)
  }

  // Check for tasks without required fields
  const requiredFields = ['id', 'name', 'priority', 'track', 'status']
  const missingFields = {}
  
  data.forEach((task, index) => {
    requiredFields.forEach(field => {
      if (!task[field]) {
        if (!missingFields[field]) missingFields[field] = 0
        missingFields[field]++
      }
    })
  })

  Object.entries(missingFields).forEach(([field, count]) => {
    keyReport.issues.push(`${count} tasks missing field: ${field}`)
  })
}

function validateJiraUserMappings(data, keyReport) {
  if (!Array.isArray(data)) {
    keyReport.issues.push('Jira user mappings should be an array')
    return
  }

  keyReport.itemCount = data.length

  // Check for duplicate Jira account IDs
  const accountIds = data.map(m => m.jiraAccountId)
  const duplicates = accountIds.filter((id, index) => accountIds.indexOf(id) !== index)
  
  if (duplicates.length > 0) {
    keyReport.issues.push(`${duplicates.length} duplicate Jira account IDs`)
  }

  // Check for mappings to system users
  const systemUserNames = data.map(m => m.systemUserName)
  keyReport.warnings.push(`Mapped to ${[...new Set(systemUserNames)].length} unique system users`)
}

function validateTodos(key, data, keyReport) {
  if (!Array.isArray(data)) {
    keyReport.issues.push(`${key} should be an array`)
    return
  }

  keyReport.itemCount = data.length

  if (key === 'todo-lists') {
    const ids = data.map(l => l.id)
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
    
    if (duplicates.length > 0) {
      keyReport.issues.push(`${duplicates.length} duplicate todo list IDs`)
    }
  }

  if (key === 'todos') {
    const ids = data.map(t => t.id)
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
    
    if (duplicates.length > 0) {
      keyReport.issues.push(`${duplicates.length} duplicate todo IDs`)
    }

    // Check for orphaned todos
    const todoListsData = localStorage.getItem('todo-lists')
    if (todoListsData) {
      try {
        const lists = JSON.parse(todoListsData)
        const listIds = new Set(lists.map(l => l.id))
        const orphaned = data.filter(t => !listIds.has(t.listId))
        
        if (orphaned.length > 0) {
          keyReport.warnings.push(`${orphaned.length} orphaned todos`)
        }
      } catch (e) {
        // Ignore
      }
    }
  }
}

function generateRecommendations(report) {
  const { keys, summary } = report

  if (summary.issues > 0) {
    report.recommendations.push(`🔴 Fix ${summary.issues} critical issues`)
  }

  // Check if cleanup is needed
  if (keys['jira-user-mappings']?.itemCount > 50) {
    report.recommendations.push('⚠️ Consider cleaning up old Jira user mappings')
  }

  if (keys['roadmap-tasks']?.itemCount > 100) {
    report.recommendations.push('⚠️ Consider archiving old completed tasks')
  }

  // Check for data integrity
  const configData = localStorage.getItem('roadmap-config')
  const tasksData = localStorage.getItem('roadmap-tasks')

  if (configData && tasksData) {
    try {
      const config = JSON.parse(configData)
      const tasks = JSON.parse(tasksData)

      // Check for tasks referencing non-existent team members
      const teamMemberNames = new Set((config.teamMembers || []).map(m => m.name))
      const allAssignees = new Set()
      
      tasks.forEach(task => {
        (task.assignments || []).forEach(assignment => {
          (assignment.assignees || []).forEach(assignee => {
            allAssignees.add(assignee)
          })
        })
      })

      const orphanedAssignees = [...allAssignees].filter(a => !teamMemberNames.has(a))
      if (orphanedAssignees.length > 0) {
        report.recommendations.push(`⚠️ ${orphanedAssignees.length} assignees don't exist in team: ${orphanedAssignees.slice(0, 3).join(', ')}${orphanedAssignees.length > 3 ? '...' : ''}`)
      }

      // Check for tasks referencing non-existent tracks
      const trackNames = new Set((config.tracks || []).map(t => t.name))
      const taskTracks = [...new Set(tasks.map(t => t.track))]
      const orphanedTracks = taskTracks.filter(t => t && !trackNames.has(t))
      
      if (orphanedTracks.length > 0) {
        report.recommendations.push(`⚠️ ${orphanedTracks.length} tasks reference non-existent tracks: ${orphanedTracks.join(', ')}`)
      }
    } catch (e) {
      // Ignore
    }
  }

  if (summary.issues === 0 && summary.warnings === 0) {
    report.recommendations.push('✅ All data looks good!')
  }
}

function printReport(report) {
  console.log('\n%c========================================', 'color: #3b82f6; font-weight: bold')
  console.log('%c📊 LOCALSTORAGE VALIDATION REPORT', 'color: #3b82f6; font-weight: bold; font-size: 16px')
  console.log('%c========================================\n', 'color: #3b82f6; font-weight: bold')
  
  console.log('%c📈 Summary:', 'color: #10b981; font-weight: bold')
  console.log(`   Total Keys: ${report.summary.totalKeys}`)
  console.log(`   Total Size: ${(report.summary.totalSize / 1024).toFixed(2)} KB`)
  console.log(`   Issues: %c${report.summary.issues}`, report.summary.issues > 0 ? 'color: #ef4444; font-weight: bold' : '')
  console.log(`   Warnings: %c${report.summary.warnings}`, report.summary.warnings > 0 ? 'color: #f59e0b; font-weight: bold' : '')
  console.log('\n')
  
  Object.entries(report.keys).forEach(([key, data]) => {
    console.log(`%c🔑 ${key}:`, 'color: #6366f1; font-weight: bold')
    console.log(`   Exists: ${data.exists ? '✅' : '❌'}`)
    console.log(`   Size: ${(data.size / 1024).toFixed(2)} KB`)
    if (data.itemCount !== undefined) {
      console.log(`   Items: ${data.itemCount}`)
    }
    
    if (data.issues.length > 0) {
      console.log(`   %c❌ Issues:`, 'color: #ef4444; font-weight: bold')
      data.issues.forEach(issue => console.log(`      - ${issue}`))
    }
    
    if (data.warnings.length > 0) {
      console.log(`   %c⚠️  Warnings:`, 'color: #f59e0b')
      data.warnings.forEach(warning => console.log(`      - ${warning}`))
    }
    console.log('')
  })
  
  if (report.recommendations.length > 0) {
    console.log('%c💡 Recommendations:', 'color: #8b5cf6; font-weight: bold')
    report.recommendations.forEach(rec => console.log(`   ${rec}`))
  }
  
  console.log('\n%c========================================\n', 'color: #3b82f6; font-weight: bold')
}

// Auto-run on load
console.log('%c💡 Storage validation loaded! Run validateStorage() to check your data', 'color: #10b981; font-size: 14px; font-weight: bold')

