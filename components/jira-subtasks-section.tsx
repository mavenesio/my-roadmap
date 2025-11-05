"use client"

import { Badge } from '@/components/ui/badge'
import { Calendar, User, Clock, ExternalLink } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface JiraSubtask {
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

interface JiraSubtasksSectionProps {
  subtasks: JiraSubtask[]
  jiraDomain?: string
}

export function JiraSubtasksSection({ subtasks, jiraDomain }: JiraSubtasksSectionProps) {
  if (!subtasks || subtasks.length === 0) {
    return null
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin fecha asignada'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return 'Fecha inválida'
    }
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    
    if (statusLower.includes('done') || statusLower.includes('completado')) {
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800'
    }
    if (statusLower.includes('progress') || statusLower.includes('wip')) {
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800'
    }
    if (statusLower.includes('review') || statusLower.includes('testing')) {
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-800'
    }
    if (statusLower.includes('todo') || statusLower.includes('to do')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800'
    }
    if (statusLower.includes('backlog')) {
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
    }
    
    return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-800'
  }

  const getStatusBackgroundColor = (status: string) => {
    const statusLower = status.toLowerCase()
    
    if (statusLower.includes('done') || statusLower.includes('completado')) {
      return {
        bg: 'bg-gradient-to-br from-green-50/80 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20',
        border: 'border-green-200/60 dark:border-green-800/40'
      }
    }
    if (statusLower.includes('progress') || statusLower.includes('wip')) {
      return {
        bg: 'bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20',
        border: 'border-blue-200/60 dark:border-blue-800/40'
      }
    }
    if (statusLower.includes('review') || statusLower.includes('testing')) {
      return {
        bg: 'bg-gradient-to-br from-purple-50/80 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20',
        border: 'border-purple-200/60 dark:border-purple-800/40'
      }
    }
    if (statusLower.includes('todo') || statusLower.includes('to do')) {
      return {
        bg: 'bg-gradient-to-br from-yellow-50/80 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20',
        border: 'border-yellow-200/60 dark:border-yellow-800/40'
      }
    }
    if (statusLower.includes('backlog')) {
      return {
        bg: 'bg-gradient-to-br from-gray-50/80 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-700/20',
        border: 'border-gray-200/60 dark:border-gray-700/40'
      }
    }
    
    return {
      bg: 'bg-gradient-to-br from-orange-50/80 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20',
      border: 'border-orange-200/60 dark:border-orange-800/40'
    }
  }

  const getStatusPriority = (status: string): number => {
    const statusLower = status.toLowerCase()
    
    if (statusLower.includes('progress') || statusLower.includes('wip')) return 1
    if (statusLower.includes('todo') || statusLower.includes('to do')) return 2
    if (statusLower.includes('backlog')) return 3
    if (statusLower.includes('done') || statusLower.includes('completado')) return 4
    if (statusLower.includes('review') || statusLower.includes('testing')) return 5
    
    return 6
  }

  // Sort subtasks by status priority
  const sortedSubtasks = [...subtasks].sort((a, b) => {
    return getStatusPriority(a.status) - getStatusPriority(b.status)
  })

  const getInitials = (name: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getJiraUrl = (key: string) => {
    if (!jiraDomain) return null
    return `${jiraDomain}/browse/${key}`
  }

  return (
    <div className="border-t pt-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-blue-100 dark:bg-blue-950 p-1.5">
            <svg
              className="h-4 w-4 text-blue-600 dark:text-blue-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H24a5.218 5.218 0 0 0-5.232-5.214h-2.13V2.6a5.215 5.215 0 0 0-5.213 5.214v11.481a1.005 1.005 0 0 0 1.005 1.005h5.694a5.218 5.218 0 0 0 5.232-5.215v-2.129h-2.062V11.52a5.215 5.215 0 0 0-5.213-5.214h-.787z" />
            </svg>
          </div>
          <h3 className="font-semibold text-base">
            Subtareas de Jira ({subtasks.length})
          </h3>
        </div>
      </div>

      <div className="space-y-2">
        {sortedSubtasks.map((subtask) => {
          const colorScheme = getStatusBackgroundColor(subtask.status)
          const jiraUrl = getJiraUrl(subtask.key)

          return (
            <div
              key={subtask.id}
              className={`${colorScheme.bg} rounded-lg p-2.5 border ${colorScheme.border} hover:shadow-sm transition-all duration-200`}
            >
              {/* Header: Key, Title and Status in one line */}
              <div className="flex items-center gap-2 mb-1.5">
                <code className="text-[10px] font-mono bg-background/50 px-1.5 py-0.5 rounded border shrink-0">
                  {subtask.key}
                </code>
                {jiraUrl && (
                  <a
                    href={jiraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Ver en Jira"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <h4 className="font-medium text-xs leading-tight flex-1 min-w-0 truncate">
                  {subtask.title}
                </h4>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(subtask.status)} text-[10px] font-medium shrink-0 px-1.5 py-0`}
                >
                  {subtask.status}
                </Badge>
              </div>

              {/* Metadata in one line */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {/* Assignee */}
                {subtask.assignee && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 shrink-0" />
                    <Avatar className="h-4 w-4">
                      <AvatarImage
                        src={subtask.assignee.avatarUrl}
                        alt={subtask.assignee.displayName}
                      />
                      <AvatarFallback className="text-[8px]">
                        {getInitials(subtask.assignee.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[120px]">{subtask.assignee.displayName}</span>
                  </div>
                )}

                {/* Dates */}
                {(subtask.startDate || subtask.endDate) && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span className="whitespace-nowrap">
                      {subtask.endDate && formatDate(subtask.endDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

