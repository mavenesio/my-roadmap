"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AddTaskModal } from "@/components/add-task-modal"
import { EditTaskModal } from "./edit-task-modal"
import { QuarterYearModal } from "@/components/quarter-year-modal"
import { MetricsPanel } from "@/components/metrics-panel"
import { TodoListDrawer } from "@/components/todo-list-drawer"
import { useRoadmapConfig, type TeamMember } from "@/hooks/use-roadmap-config"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useRoadmapTasks } from "@/hooks/use-roadmap-tasks"
import { useJiraSync } from "@/hooks/use-jira-sync"
import { JiraSyncModal } from "./jira-sync-modal"
import { JiraUserMappingModal } from "./jira-user-mapping-modal"
import { JiraEpicsReviewModal } from "./jira-epics-review-modal"
import { TokenRequestModal } from "./token-request-modal"
import { InitializationWizard } from "./initialization-wizard"
import type { JiraEpic, JiraStory, JiraUser } from "@/lib/jira-client"
import { parseJiraBoardUrl } from "@/lib/jira-client"
import { Download, Upload, X, ChevronDown, ChevronRight, GripVertical, Pin, PinOff, MessageSquare, Edit2, Users, ListTodo, Link as LinkIcon, RefreshCw, Settings2 } from "lucide-react"
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

type Priority = "Milestone" | "1" | "2" | "3"
type Track = string

// New task attributes
type Status =
  | "TODO"
  | "PREWORK"
  | "WIP"
  | "TESTING"
  | "LAST LAP"
  | "DONE"
  | "ROLLOUT"
  | "DISMISSED"
  | "ON HOLD"

type Size = "XS" | "S" | "M" | "L" | "XL"

type TaskType =
  | "DEUDA TECNICA"
  | "CARRY OVER"
  | "EXTRA MILE"
  | "OVNI"
  | "POROTO"

type EditableTaskFields = {
  name?: string
  priority?: Priority
  track?: Track
  status?: Status
  size?: Size
  type?: TaskType
}

interface WeekAssignment {
  weekId: string
  assignees: string[]
}

interface Comment {
  id: string
  text: string
  createdAt: number
}

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

interface Task {
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
  jiraSubtasks?: JiraSubtask[]
}

const INITIAL_TASKS: Task[] = []

// Función para generar colores únicos basados en el nombre
const generateColorFromName = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Generar colores más distintivos con mayor separación
  const hue = Math.abs(hash) % 360
  const saturation = 75 + (Math.abs(hash) % 15) // 75-90% - más saturados
  const lightness = 40 + (Math.abs(hash) % 20) // 40-60% - más variación
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// Colores suaves para los meses - más claros
const MONTH_COLORS = {
  "OCTUBRE": "bg-orange-50/30 border-orange-200/40",
  "NOVIEMBRE": "bg-purple-50/30 border-purple-200/40", 
  "DICIEMBRE": "bg-emerald-50/30 border-emerald-200/40"
}

// Colores para los tracks
const TRACK_COLORS = {
  "Swiper": "bg-blue-500 text-white",
  "TM": "bg-green-500 text-white", 
  "Guardians": "bg-purple-500 text-white"
}

export function RoadmapGantt() {
  const { config, isInitialized, months, initializeConfig, importConfig, exportConfig, addTeamMember, addTeamMembers, updateTeamMember, updateConfig } = useRoadmapConfig()
  const { tasks, addTask, addTasks, updateTask, updateTasks, removeTask, replaceTasks, getTaskById, getTaskByJiraKey } = useRoadmapTasks(INITIAL_TASKS)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [showQuarterModal, setShowQuarterModal] = useState(false)
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([])
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [selectedBoards, setSelectedBoards] = useState<string[]>([])
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isStickyFooter, setIsStickyFooter] = useState(true)
  const [isTodoDrawerOpen, setIsTodoDrawerOpen] = useState(false)
  const [todoLists] = useLocalStorage<any[]>('todo-lists', [])
  const [todos] = useLocalStorage<any[]>('todos', [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  // Jira sync state
  const [showJiraSyncModal, setShowJiraSyncModal] = useState(false)
  const [showUserMappingModal, setShowUserMappingModal] = useState(false)
  const [showEpicsReviewModal, setShowEpicsReviewModal] = useState(false)
  const [showTokenRequestModal, setShowTokenRequestModal] = useState(false)
  const [tokenRequestResolver, setTokenRequestResolver] = useState<((value: { token: string; rememberToken: boolean } | null) => void) | null>(null)
  const [jiraUsers, setJiraUsers] = useState<JiraUser[]>([])
  const [pendingJiraData, setPendingJiraData] = useState<{
    epics: JiraEpic[]
    stories: { epicKey: string; stories: JiraStory[] }[]
    domain: string
  } | null>(null)
  
  const jiraSync = useJiraSync()

  // Wizard state - show wizard if not initialized or no config
  const shouldShowWizard = !isInitialized || (isInitialized && config && !config.year && tasks.length === 0)

  // Calcular contador de TODOs pendientes
  const pendingTodosCount = todos.filter((t: any) => t.status !== "DONE").length

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  // Initialize filters from URL and keep in sync when URL changes
  useEffect(() => {
    const t = searchParams?.get('tracks') || ''
    const p = searchParams?.get('priorities') || ''
    const tracksFromUrl = t ? t.split(',').filter(Boolean) : []
    const prioritiesFromUrl = (p ? p.split(',').filter(Boolean) : []) as Priority[]
    setSelectedTracks(tracksFromUrl)
    setSelectedPriorities(prioritiesFromUrl)
    setFiltersInitialized(true)
  }, [searchParams])

  // Write filters to URL when they change
  useEffect(() => {
    if (!filtersInitialized) return
    const currentT = searchParams?.get('tracks') || ''
    const currentP = searchParams?.get('priorities') || ''
    const nextT = selectedTracks.join(',')
    const nextP = selectedPriorities.join(',')
    if (currentT === nextT && currentP === nextP) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (nextT) params.set('tracks', nextT); else params.delete('tracks')
    if (nextP) params.set('priorities', nextP); else params.delete('priorities')
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : `?`, { scroll: false })
  }, [filtersInitialized, selectedTracks, selectedPriorities])

  // Limpiar tareas existentes si la configuración cambió (para corregir IDs de semanas)
  useEffect(() => {
    if (config && tasks.length > 0) {
      // Verificar si las tareas tienen asignaciones con IDs de semanas antiguos (W1-W4 duplicados)
      const hasOldWeekIds = tasks.some(task => {
        const weekIds = task.assignments.map(a => a.weekId)
        const uniqueWeekIds = new Set(weekIds)
        return weekIds.length !== uniqueWeekIds.size // Hay duplicados
      })
      
      if (hasOldWeekIds) {
        console.log('Detectadas asignaciones con IDs de semanas duplicados. Limpiando tareas...')
        replaceTasks([])
      }

      // Migración: asignar "order" secuencial si falta
      const needsOrderMigration = tasks.some((t: any) => typeof (t as Task).order !== 'number')
      if (needsOrderMigration) {
        const migrated = [...tasks]
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((t, idx) => ({ ...t, order: idx + 1 }))
        replaceTasks(migrated as Task[])
      }
    }
  }, [config, tasks, replaceTasks])

  const toggleMonth = (month: string) => {
    setCollapsedMonths((prev: Set<string>) => {
      const newSet = new Set(prev)
      if (newSet.has(month)) {
        newSet.delete(month)
      } else {
        newSet.add(month)
      }
      return newSet
    })
  }

  const handleAddTask = (newTask: { name: string; priority: Priority; track: Track; status?: Status; size?: Size; type?: TaskType }) => {
    if (!config) return
    
    const nextOrder = (tasks.reduce((max, t: any) => Math.max(max, typeof (t as Task).order === 'number' ? (t as Task).order : 0), 0) || 0) + 1

    const task: Task = {
      id: Date.now().toString(),
      name: newTask.name,
      priority: newTask.priority,
      track: newTask.track,
      status: newTask.status ?? "TODO",
      size: newTask.size ?? "S",
      type: newTask.type ?? "POROTO",
      order: nextOrder,
      weeks: [],
      assignments: config.weeks.map((week) => ({ weekId: week.id, assignees: [] })),
      createdAt: Date.now()
    }
    const success = addTask(task)
    if (!success) {
      console.error('❌ Failed to add task - duplicate ID')
      alert('Error: No se pudo agregar la tarea (ID duplicado)')
    }
  }

  const handleSaveTask = (updated: Partial<Task> & { id: string }) => {
    const success = updateTask(updated.id, updated)
    if (!success) {
      console.error('❌ Failed to update task - not found')
      alert('Error: No se pudo actualizar la tarea (no encontrada)')
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const visible = getSortedAndFilteredTasks()
    const oldIndex = visible.findIndex(t => t.id === active.id)
    const newIndex = visible.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reorderedVisible = arrayMove(visible, oldIndex, newIndex)

    // Build new order mapping for visible tasks starting from 1 and preserving gaps for hidden ones
    const orderMapping = new Map<string, number>()
    reorderedVisible.forEach((t, idx) => orderMapping.set(t.id, idx + 1))

    // Recompute order for all tasks: visible get new sequential order; hidden keep their current order but placed after visible if no order
    const others = tasks.filter(t => !orderMapping.has(t.id))
    // keep original relative order for others after the visible block
    const maxVisibleOrder = reorderedVisible.length
    const updatedOthers = others
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((t, idx) => ({ id: t.id, order: (t as any).order ?? maxVisibleOrder + idx + 1 }))

    const mergedOrder = new Map<string, number>([...orderMapping.entries()])
    updatedOthers.forEach(({ id, order }) => mergedOrder.set(id, order))

    const tasksWithNewOrder = tasks.map(t => ({ 
      id: t.id, 
      updates: { order: mergedOrder.get(t.id) ?? t.order } 
    }))
    updateTasks(tasksWithNewOrder)
  }

  const handleExport = () => {
    if (!config) return
    
    const exportData = {
      config,
      tasks,
      todoLists,
      todos,
      exportedAt: new Date().toISOString(),
      version: "1.0.0"
    }
    
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `roadmap-q${config.quarter}-${config.year}-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const importedData = JSON.parse(e.target?.result as string)
          
          // Mostrar advertencia de sobrescritura
          if (!confirm("⚠️ Importar reemplazará todos los datos actuales. ¿Continuar?")) {
            return
          }
          
          // Importar configuración
          if (importedData.config) {
            importConfig(importedData)
          } else {
            importConfig(importedData)
          }
          
          // Importar tareas
          if (importedData.tasks) {
            replaceTasks(importedData.tasks)
          } else if (Array.isArray(importedData)) {
            // Formato antiguo - solo tareas
            replaceTasks(importedData)
          }

          // Importar TODO Lists
          if (importedData.todoLists) {
            localStorage.setItem('todo-lists', JSON.stringify(importedData.todoLists))
          }
          
          // Importar TODOs
          if (importedData.todos) {
            localStorage.setItem('todos', JSON.stringify(importedData.todos))
          }
          
          // Limpiar clave obsoleta si existe
          localStorage.removeItem('global-todo-list')
          
          // Recargar para reflejar cambios
          window.location.reload()
          
        } catch (error) {
          console.error("Error importing file:", error)
          alert("Error importing file. Please make sure it's a valid JSON file.")
        }
      }
      reader.readAsText(file)
    }
  }

  const handleFileImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        
        // Mostrar advertencia de sobrescritura
        if (!confirm("⚠️ Importar reemplazará todos los datos actuales. ¿Continuar?")) {
          return
        }
        
        // Importar configuración
        if (importedData.config) {
          importConfig(importedData)
        } else {
          importConfig(importedData)
        }
        
        // Importar tareas
        if (importedData.tasks) {
          replaceTasks(importedData.tasks)
        } else if (Array.isArray(importedData)) {
          // Formato antiguo - solo tareas
          replaceTasks(importedData)
        }

        // Importar TODO Lists
        if (importedData.todoLists) {
          localStorage.setItem('todo-lists', JSON.stringify(importedData.todoLists))
        }
        
        // Importar TODOs
        if (importedData.todos) {
          localStorage.setItem('todos', JSON.stringify(importedData.todos))
        }
        
        // Limpiar clave obsoleta si existe
        localStorage.removeItem('global-todo-list')
        
        setShowQuarterModal(false)
        
        // Recargar para reflejar cambios
        window.location.reload()
        
      } catch (error) {
        console.error("Error importing file:", error)
        alert("Error importing file. Please make sure it's a valid JSON file.")
      }
    }
    reader.readAsText(file)
  }

  const handleAddAssignee = useCallback((taskId: string, weekId: string, assignee: string) => {
    const task = tasks.find(t => t.id === taskId)
    
    if (!task) {
      console.error('❌ Task not found:', taskId)
      return
    }
    
    // Auto-fix: If assignments is empty but config.weeks exists, initialize assignments
    let assignmentsToUpdate = task.assignments
    if (assignmentsToUpdate.length === 0 && config?.weeks && config.weeks.length > 0) {
      console.log('🔧 Auto-fixing: Initializing empty assignments with config weeks')
      assignmentsToUpdate = config.weeks.map((week) => ({ weekId: week.id, assignees: [] }))
    }
    
    const updatedAssignments = assignmentsToUpdate.map((assignment: WeekAssignment) => {
              if (assignment.weekId === weekId) {
                const currentAssignees = assignment.assignees
                if (!currentAssignees.includes(assignee)) {
                  return { ...assignment, assignees: [...currentAssignees, assignee] }
                }
              }
              return assignment
    })
    
    updateTask(taskId, { assignments: updatedAssignments })
  }, [tasks, updateTask, config])

  const handleRemoveAssignee = useCallback((taskId: string, weekId: string, assignee: string) => {
    const task = getTaskById(taskId)
    if (!task) {
      console.error('❌ Task not found:', taskId)
      return
    }
    
    const updatedAssignments = task.assignments.map((assignment: WeekAssignment) => {
              if (assignment.weekId === weekId) {
                return { ...assignment, assignees: assignment.assignees.filter((a: string) => a !== assignee) }
              }
              return assignment
    })
    
    updateTask(taskId, { assignments: updatedAssignments })
  }, [getTaskById, updateTask])

  // Jira sync handlers - NEW FLOW
  const [currentJiraCredentials, setCurrentJiraCredentials] = useState<{
    boardUrl: string
    email: string
    token: string
    rememberToken: boolean
  } | null>(null)

  const handleRefreshExistingEpics = async (boardUrl: string, email: string, token: string) => {
    if (!config) return

    try {
      console.log('🔄 Refreshing existing Jira epics...')
      
      // Find all tasks with Jira integration
      const jiraTasks = tasks.filter(task => task.jiraEpicKey)
      
      if (jiraTasks.length === 0) {
        alert('No hay épicas sincronizadas con Jira para actualizar')
        return
      }

      console.log(`📋 Found ${jiraTasks.length} Jira-linked tasks to update`)
      
      // Fetch all epics from the board
      const { domain } = parseJiraBoardUrl(boardUrl)
      const allEpics = await jiraSync.fetchEpicsOnly({ boardUrl, email, token, rememberToken: false })
      
      if (!allEpics || allEpics.length === 0) {
        alert('No se encontraron épicas en Jira')
        return
      }

      let updatedCount = 0
      let unchangedCount = 0
      const tasksToUpdate: Array<{ id: string; updates: Partial<Task> }> = []

      // For each local task with Jira integration
      for (const task of jiraTasks) {
        const jiraEpic = allEpics.find(e => e.key === task.jiraEpicKey)
        
        if (!jiraEpic) {
          console.warn(`⚠️ Epic ${task.jiraEpicKey} not found in Jira`)
          continue
        }

        // Fetch stories for this epic
        const storiesResult = await jiraSync.fetchStoriesForSelectedEpics([jiraEpic], { boardUrl, email, token, rememberToken: false })
        const epicStories = storiesResult.find(s => s.epicKey === jiraEpic.key)?.stories || []

        // Convert stories to subtasks
        const jiraSubtasks = epicStories.map((story: any) => ({
          key: story.key,
          summary: story.summary,
          status: story.status,
          assignee: story.assignee?.displayName || undefined,
          created: story.created,
          updated: story.updated,
          description: story.description || undefined,
        }))

        // Check if there are changes
        const hasNameChange = task.name !== jiraEpic.summary
        const hasSubtasksChange = JSON.stringify(task.jiraSubtasks) !== JSON.stringify(jiraSubtasks)

        if (hasNameChange || hasSubtasksChange) {
          tasksToUpdate.push({
            id: task.id,
            updates: {
              name: jiraEpic.summary,
              jiraSubtasks: jiraSubtasks,
            }
          })
          updatedCount++
          console.log(`✅ Changes detected for ${task.name}`)
        } else {
          unchangedCount++
        }
      }

      // Apply updates
      if (tasksToUpdate.length > 0) {
        const updateResult = updateTasks(tasksToUpdate)
        console.log(`✅ Updated ${updateResult} tasks`)
        
        alert(`✅ Sincronización completada:\n\n• ${updatedCount} épica(s) actualizada(s)\n• ${unchangedCount} épica(s) sin cambios`)
      } else {
        alert(`✅ Todas las épicas están actualizadas.\n\nNo se detectaron cambios en las ${jiraTasks.length} épica(s) sincronizadas.`)
      }

      setShowJiraSyncModal(false)
    } catch (error) {
      console.error('❌ Error refreshing epics:', error)
      alert(`Error al actualizar épicas: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const handleJiraSync = async (boardUrl: string, email: string, token: string, rememberToken: boolean) => {
    if (!config) return

    try {
      // Store credentials for later use
      setCurrentJiraCredentials({ boardUrl, email, token, rememberToken })

      // Step 1: Fetch only epics
      const epics = await jiraSync.fetchEpicsOnly({ boardUrl, email, token, rememberToken })

      if (epics && epics.length > 0) {
        const { domain } = parseJiraBoardUrl(boardUrl)
        
        // Store epics for review (stories will be fetched later)
        setPendingJiraData({ epics, stories: [], domain })
        setShowJiraSyncModal(false)
        
        // Show epic selection modal
        setShowEpicsReviewModal(true)
      } else {
        alert('No se encontraron épicas en este tablero')
      }
    } catch (error) {
      console.error('Jira sync error:', error)
    }
  }

  const processJiraData = (selectedEpicKeys: string[]) => {
    console.log('🔍 processJiraData - Starting...', {
      selectedEpicKeys,
      hasConfig: !!config,
      hasPendingData: !!pendingJiraData,
      pendingDataEpics: pendingJiraData?.epics.length,
      pendingDataStories: pendingJiraData?.stories.length,
    })

    if (!config || !pendingJiraData) {
      console.error('❌ Missing config or pendingJiraData')
      alert('❌ Error: No hay datos pendientes para procesar')
      return
    }

    const { epics, stories: allStories, domain } = pendingJiraData
    console.log('📊 Data to process:', { epicsCount: epics.length, storiesCount: allStories.length })
    
    // Filter only selected epics
    const selectedEpics = epics.filter(epic => selectedEpicKeys.includes(epic.key))
    console.log('✅ Filtered epics:', selectedEpics.length)

    const newTasks: Task[] = []
    const tasksToUpdate: Array<{ id: string; updates: Partial<Task> }> = []
    const nextOrderStart = (tasks.reduce((max, t) => Math.max(max, t.order || 0), 0) || 0) + 1

    selectedEpics.forEach((epic, index) => {
      const epicStories = allStories.find(s => s.epicKey === epic.key)?.stories || []
      
      // Check if task with this jiraEpicKey already exists
      const existingTask = tasks.find(t => t.jiraEpicKey === epic.key)
      
      // Construct Jira epic URL
      const jiraEpicUrl = `${domain}/browse/${epic.key}`
      
      const jiraSubtasks: JiraSubtask[] = epicStories.map(story => ({
        id: story.id,
        key: story.key,
        title: story.summary,
        status: story.status,
        assignee: story.assignee ? {
          id: story.assignee.accountId,
          displayName: story.assignee.displayName,
          avatarUrl: story.assignee.avatarUrls['48x48'],
        } : undefined,
        startDate: story.startDate,
        endDate: story.dueDate,
        createdAt: story.created,
        updatedAt: story.updated,
        description: story.description,
      }))

      if (existingTask) {
        // Update existing task
        tasksToUpdate.push({
          id: existingTask.id,
          updates: { name: epic.summary, jiraSubtasks, jiraEpicId: epic.id, jiraEpicUrl }
        })
      } else {
        // Create new task with custom configuration
        const epicConfig = epicConfigurations.get(epic.key)
        
        // Extract board info from currentJiraCredentials
        const boardUrl = currentJiraCredentials?.boardUrl || ''
        let boardId = ''
        let boardName = ''
        if (boardUrl) {
          try {
            const url = new URL(boardUrl)
            const boardMatch = url.pathname.match(/\/boards\/(\d+)/)
            boardId = boardMatch ? boardMatch[1] : ''
            const projectMatch = url.pathname.match(/\/projects\/([A-Z0-9]+)/)
            boardName = projectMatch ? projectMatch[1] : ''
          } catch (err) {
            console.error('Error parsing board URL:', err)
          }
        }
        
        const newTask: Task = {
          id: `jira-${epic.id}-${Date.now()}`,
          name: epic.summary,
          priority: (epicConfig?.priority as Priority) || (config.defaults?.priority as Priority) || "3",
          track: epicConfig?.track || config.defaults?.track || config.tracks[0]?.name || "Guardians",
          status: "TODO",
          size: (epicConfig?.size as Size) || (config.defaults?.size as Size) || "M",
          type: (epicConfig?.type as TaskType) || (config.defaults?.type as TaskType) || "POROTO",
          order: nextOrderStart + index,
          weeks: [],
          assignments: config.weeks.map((week) => ({ weekId: week.id, assignees: [] })),
          createdAt: Date.now(),
          jiraEpicKey: epic.key,
          jiraEpicId: epic.id,
          jiraEpicUrl,
          jiraSubtasks,
          jiraBoardId: boardId,
          jiraBoardName: boardName,
        }
        console.log(`📦 Created task for ${epic.key} with config:`, { 
          priority: newTask.priority, 
          track: newTask.track, 
          size: newTask.size,
          type: newTask.type
        })
        newTasks.push(newTask)
      }
    })

    console.log('📝 Processing tasks...', { newTasksCount: newTasks.length, updatedCount: tasksToUpdate.length })

    // Update existing tasks
    const updatedCount = updateTasks(tasksToUpdate)
    
    // Add new tasks with validation
    const addResult = addTasks(newTasks)
    
    console.log('✅ Tasks processed:', { added: addResult.added, updated: updatedCount, skipped: addResult.skipped })

    const message = [
      `✅ Sincronización completada:`,
      `${addResult.added} épicas nuevas`,
      `${updatedCount} épicas actualizadas`,
      addResult.skipped > 0 ? `${addResult.skipped} duplicadas omitidas` : ''
    ].filter(Boolean).join(', ')
    
    console.log(message)
    alert(message)
    
    if (addResult.skipped > 0) {
      console.warn(`⚠️ Se omitieron ${addResult.skipped} tareas duplicadas:`, addResult.errors)
    }
    
    // Clear pending data
    setPendingJiraData(null)
    console.log('🧹 Pending data cleared')
  }

  const handleUserMappingSave = (mappings: any[]) => {
    if (!pendingJiraData || !config) {
      console.error('❌ Cannot save mappings: missing data', { 
        hasPendingData: !!pendingJiraData, 
        hasConfig: !!config 
      })
      return
    }

    console.log('💾 Starting user mappings save:', mappings.length)
    console.log('👥 Current team members before save:', config.teamMembers.length, config.teamMembers.map(m => m.name))

    // Save the mappings
    jiraSync.addUserMappings(mappings)

    // Separate updates from new members
    const membersToUpdate = mappings.filter(m => 
      config.teamMembers.some(member => member.name === m.systemUserName)
    )
    
    const membersToAdd = mappings
      .filter(m => !config.teamMembers.some(member => member.name === m.systemUserName))
      .map(m => ({
        name: m.systemUserName,
        color: generateColorFromName(m.systemUserName),
        avatarUrl: m.jiraAvatarUrl,
      }))

    // Update existing members with avatars
    membersToUpdate.forEach(mapping => {
      console.log(`🔄 Updating existing member: ${mapping.systemUserName}`)
      updateTeamMember(mapping.systemUserName, {
        avatarUrl: mapping.jiraAvatarUrl
      })
    })

    // Add new members
    if (membersToAdd.length > 0) {
      const addResult = addTeamMembers(membersToAdd)
      console.log(`➕ Added ${addResult.added} new members, skipped ${addResult.skipped}`)
      
      if (addResult.skipped > 0) {
        console.warn(`⚠️ Some members were skipped:`, addResult.errors)
      }
    }

    console.log('✅ User mappings saved successfully')

    // Process data after user mapping (epics were already selected)
    setShowUserMappingModal(false)
    const selectedEpicKeys = pendingJiraData.epics.map(epic => epic.key)
    processJiraData(selectedEpicKeys)
  }
  
  // Store epic configurations for later processing
  const [epicConfigurations, setEpicConfigurations] = useState<Map<string, any>>(new Map())

  const handleEpicsConfirm = async (selectedEpicKeys: string[], configurations: any[]) => {
    console.log('🔍 handleEpicsConfirm - Starting...', { 
      selectedEpicKeys,
      configurations: configurations.length,
      hasConfig: !!config,
      hasPendingData: !!pendingJiraData,
      hasCredentials: !!currentJiraCredentials 
    })

    if (!config || !pendingJiraData || !currentJiraCredentials) {
      console.error('❌ Missing required data:', { config: !!config, pendingJiraData: !!pendingJiraData, currentJiraCredentials: !!currentJiraCredentials })
      alert('❌ Error: Faltan datos requeridos. Por favor, intenta sincronizar nuevamente.')
      return
    }

    try {
      // Keep modal open until we finish
      console.log('📥 Fetching stories and users...')

      // Store configurations for later use
      const configMap = new Map<string, any>()
      configurations.forEach(conf => {
        configMap.set(conf.epicKey, conf)
      })
      setEpicConfigurations(configMap)
      console.log('⚙️ Configurations stored:', configMap.size)

      // Get only selected epics
      const selectedEpics = pendingJiraData.epics.filter(epic => selectedEpicKeys.includes(epic.key))
      console.log('✅ Selected epics:', selectedEpics.length)

      // Step 2: Fetch stories for selected epics
      console.log('📚 Fetching stories for selected epics...')
      const allStories = await jiraSync.fetchStoriesForSelectedEpics(
        selectedEpics,
        currentJiraCredentials
      )
      console.log('✅ Stories fetched:', allStories.length)

      // Step 3: Fetch users
      console.log('👥 Fetching users...')
      const users = await jiraSync.fetchUsersOnly(currentJiraCredentials)
      console.log('✅ Users fetched:', users.length)
      setJiraUsers(users)

      // Update pending data with stories
      setPendingJiraData({
        ...pendingJiraData,
        epics: selectedEpics,
        stories: allStories,
      })

      // Close epics modal now that data is ready
      setShowEpicsReviewModal(false)

      // Check if we need user mapping
      const unmappedUsers = jiraSync.getUnmappedUsers(users)
      console.log('🔍 Unmapped users:', unmappedUsers.length)
      
      if (unmappedUsers.length > 0) {
        // Show user mapping modal
        console.log('👉 Showing user mapping modal')
        setShowUserMappingModal(true)
      } else {
        // Process data directly
        console.log('👉 Processing data directly (no unmapped users)')
        processJiraData(selectedEpicKeys)
      }
    } catch (error) {
      console.error('❌ Error fetching stories/users:', error)
      setShowEpicsReviewModal(false)
      alert(`❌ Error al obtener datos de Jira: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const handleCreateUser = (user: { name: string; avatarUrl: string }) => {
    if (addTeamMember) {
      addTeamMember({
        name: user.name,
        color: generateColorFromName(user.name),
        avatarUrl: user.avatarUrl,
      })
    }
  }

  // Helper function to request Jira token with remember option
  const requestJiraToken = (): Promise<{ token: string; rememberToken: boolean } | null> => {
    return new Promise((resolve) => {
      setTokenRequestResolver(() => resolve)
      setShowTokenRequestModal(true)
    })
  }

  const handleTokenRequest = (token: string, rememberToken: boolean) => {
    if (tokenRequestResolver) {
      tokenRequestResolver({ token, rememberToken })
      setTokenRequestResolver(null)
    }
    setShowTokenRequestModal(false)
  }

  const handleTokenRequestCancel = () => {
    if (tokenRequestResolver) {
      tokenRequestResolver(null)
      setTokenRequestResolver(null)
    }
    setShowTokenRequestModal(false)
  }

  const handleSyncTaskFromJira = async (taskId: string, jiraEpicKey: string) => {
    // Get saved credentials
    const savedCredentials = jiraSync.getCredentials()
    const savedBoards = jiraSync.getBoards()
    const savedEmail = savedBoards.email

    // Validate we have saved email
    if (!savedEmail) {
      alert('⚠️ No hay email de Jira configurado. Por favor, configura Jira en Settings.')
      return
    }

    let token = savedCredentials?.token || ''
    let shouldSaveToken = false

    // If no token saved, open the token request dialog
    if (!token) {
      const result = await requestJiraToken()
      if (!result) return // User cancelled
      token = result.token
      shouldSaveToken = result.rememberToken
    }

    const currentTask = getTaskById(taskId)
    if (!currentTask) {
      alert('❌ Tarea no encontrada')
      return
    }

    // Get domain from task's jiraEpicUrl if available
    let domain = ''
    if (currentTask.jiraEpicUrl) {
      try {
        const url = new URL(currentTask.jiraEpicUrl)
        domain = `${url.protocol}//${url.host}`
      } catch (err) {
        console.error('Error parsing jiraEpicUrl:', err)
      }
    }

    // If no domain from task, try to get from first saved board
    if (!domain && savedBoards.boards.length > 0) {
      try {
        const url = new URL(savedBoards.boards[0].url)
        domain = `${url.protocol}//${url.host}`
      } catch (err) {
        console.error('Error parsing board URL:', err)
      }
    }

    // If still no domain, we can't proceed
    if (!domain) {
      alert('❌ No se pudo determinar el dominio de Jira. Por favor configura un board en Settings.')
      return
    }

    try {
      // Save token if requested
      if (shouldSaveToken) {
        jiraSync.saveCredentials({ boardUrl: '', email: savedEmail, token })
      }

      // Add loading state
      updateTask(taskId, { name: `${currentTask.name} (Actualizando...)` })

      // Fetch updated epic data
      const { fetchStoriesFromEpic } = await import('@/lib/jira-client')
      const stories = await fetchStoriesFromEpic(jiraEpicKey, domain, savedEmail, token)

      // Update the task with new subtasks
      const jiraSubtasks: JiraSubtask[] = stories.map(story => ({
        id: story.id,
        key: story.key,
        title: story.summary,
        status: story.status,
        assignee: story.assignee ? {
          id: story.assignee.accountId,
          displayName: story.assignee.displayName,
          avatarUrl: story.assignee.avatarUrls['48x48'],
        } : undefined,
        startDate: story.startDate,
        endDate: story.dueDate,
        createdAt: story.created,
        updatedAt: story.updated,
        description: story.description,
      }))

      // Remove the "Actualizando..." from the name
      const cleanName = currentTask.name.replace(' (Actualizando...)', '')
      
      // Construct Jira epic URL
      const jiraEpicUrl = `${domain}/browse/${jiraEpicKey}`
      
      updateTask(taskId, {
        name: cleanName,
        jiraSubtasks,
        jiraEpicUrl,
      })

      alert('✅ Tarea actualizada desde Jira')
      
      // Close and reopen the modal to show updated data
      setIsEditOpen(false)
      setTimeout(() => {
        const updatedTask = tasks.find(t => t.id === taskId)
        if (updatedTask) {
          setEditingTask(updatedTask)
          setIsEditOpen(true)
        }
      }, 100)
    } catch (error) {
      console.error('Error syncing task from Jira:', error)
      alert(`❌ Error al actualizar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      // Remove the "Actualizando..." from the name on error
      const errorTask = getTaskById(taskId)
      if (errorTask) {
        updateTask(taskId, { 
          name: errorTask.name.replace(' (Actualizando...)', '') 
        })
      }
    }
  }

  const getPriorityColor = useCallback((priority: string) => {
    const color = config?.priorities.find(p => p.name === priority)?.color
    return color || "#6b7280"
  }, [config?.priorities])

  const getPersonColor = useCallback((name: string) => {
    const member = config?.teamMembers.find((m) => m.name === name)
    return member?.color || generateColorFromName(name)
  }, [config?.teamMembers])

  const getTrackColor = useCallback((track: Track) => {
    const color = config?.tracks.find(t => t.name === track)?.color
    return color || "#6b7280"
  }, [config?.tracks])

  const getStatusColor = useCallback((status: string) => {
    const color = config?.statuses.find(s => s.name === status)?.color
    return color || "#6b7280"
  }, [config?.statuses])

  const getTypeColor = useCallback((type: string) => {
    const color = config?.types.find(t => t.name === type)?.color
    return color || "#6b7280"
  }, [config?.types])

  const getSortedAndFilteredTasks = () => {
    let filteredTasks = [...tasks]

    // Aplicar filtros multi-selección
    if (selectedTracks.length > 0) {
      filteredTasks = filteredTasks.filter(task => selectedTracks.includes(task.track))
    }
    if (selectedPriorities.length > 0) {
      filteredTasks = filteredTasks.filter(task => selectedPriorities.includes(task.priority))
    }
    if (selectedPeople.length > 0) {
      filteredTasks = filteredTasks.filter(task => {
        // Si se seleccionó "Sin asignar"
        if (selectedPeople.includes('__unassigned__')) {
          const hasNoAssignees = !task.assignments || task.assignments.length === 0 || 
            task.assignments.every(a => !a.assignees || a.assignees.length === 0)
          if (hasNoAssignees) return true
        }
        
        // Verificar si la tarea tiene alguna de las personas seleccionadas
        if (task.assignments && task.assignments.length > 0) {
          return task.assignments.some(assignment => 
            assignment.assignees && assignment.assignees.some(assignee => 
              selectedPeople.includes(assignee)
            )
          )
        }
        return false
      })
    }
    if (selectedBoards.length > 0) {
      filteredTasks = filteredTasks.filter(task => {
        // Solo mostrar tareas que tengan jiraBoardId y esté en la selección
        return task.jiraBoardId && selectedBoards.includes(task.jiraBoardId)
      })
    }

    // Ordenar por "order" ascendente
    return filteredTasks.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
  }


  const getMonthWeeks = useCallback((month: string) => {
    if (!config) return []
    return config.weeks.filter((week) => week.month === month)
  }, [config])

  const getMonthSummary = useCallback((task: Task, month: string) => {
    const monthWeeks = getMonthWeeks(month)
    const assigneeCounts = new Map<string, number>()

    monthWeeks.forEach((week) => {
      const assignment = task.assignments.find((a: WeekAssignment) => a.weekId === week.id)
      assignment?.assignees.forEach((assignee: string) => {
        assigneeCounts.set(assignee, (assigneeCounts.get(assignee) || 0) + 1)
      })
    })

    return Array.from(assigneeCounts.entries()).map(([assignee, count]) => ({
      name: assignee.split(" ")[0],
      weeks: count,
    }))
  }, [getMonthWeeks])

  // Función para calcular cuántos días de ausencia tiene una persona en una semana específica
  const getVacationDaysInWeek = useCallback((memberName: string, week: { date: string }) => {
    const member = config?.teamMembers.find(m => m.name === memberName)
    if (!member || !member.vacations || member.vacations.length === 0) {
      return { days: 0, type: null }
    }

    const [ddStr, mmStr] = week.date.split('-')
    const dd = parseInt(ddStr, 10)
    const mm = parseInt(mmStr, 10)
    if (Number.isNaN(dd) || Number.isNaN(mm)) return { days: 0, type: null }

    const year = config?.year ?? new Date().getFullYear()
    const weekStart = new Date(year, mm - 1, dd) // Lunes
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 4) // Viernes (lunes a viernes = 5 días)

    let totalVacationDays = 0
    let absenceType: 'vacation' | 'license' | null = null

    member.vacations.forEach(vacation => {
      // Parsear fechas en zona horaria local para evitar problemas de UTC
      const [startYear, startMonth, startDay] = vacation.startDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = vacation.endDate.split('-').map(Number)
      
      const vacationStart = new Date(startYear, startMonth - 1, startDay)
      const vacationEnd = new Date(endYear, endMonth - 1, endDay)

      // Normalizar a medianoche para comparación
      vacationStart.setHours(0, 0, 0, 0)
      vacationEnd.setHours(0, 0, 0, 0)
      weekStart.setHours(0, 0, 0, 0)
      weekEnd.setHours(0, 0, 0, 0)

      // Verificar si hay overlap entre las vacaciones y la semana
      if (vacationStart <= weekEnd && vacationEnd >= weekStart) {
        // Calcular el rango de overlap
        const overlapStart = vacationStart > weekStart ? vacationStart : weekStart
        const overlapEnd = vacationEnd < weekEnd ? vacationEnd : weekEnd

        // Contar días laborables (lunes a viernes) en el overlap
        let currentDay = new Date(overlapStart)
        while (currentDay <= overlapEnd) {
          const dayOfWeek = currentDay.getDay()
          // 1 = Lunes, 2 = Martes, ..., 5 = Viernes
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            totalVacationDays++
          }
          currentDay.setDate(currentDay.getDate() + 1)
        }
        
        // Guardar el tipo de ausencia (priorizar el primer tipo encontrado)
        if (totalVacationDays > 0 && !absenceType) {
          absenceType = vacation.type || 'vacation'
        }
      }
    })

    return { days: totalVacationDays, type: absenceType }
  }, [config])

  const getWeekRangeLabel = (week: { date: string }) => {
    // week.date format: dd-mm (monday of that week)
    const [ddStr, mmStr] = week.date.split('-')
    const dd = parseInt(ddStr, 10)
    const mm = parseInt(mmStr, 10)
    if (Number.isNaN(dd) || Number.isNaN(mm)) return week.date
    const year = config?.year ?? new Date().getFullYear()
    const start = new Date(year, mm - 1, dd)
    const end = new Date(start)
    end.setDate(start.getDate() + 4) // Friday
    const pad = (n: number) => n.toString().padStart(2, '0')
    const startLabel = pad(start.getDate())
    const endLabel = pad(end.getDate())
    const startMonth = pad(start.getMonth() + 1)
    const endMonth = pad(end.getMonth() + 1)
    return `${startLabel}/${startMonth} a ${endLabel}/${endMonth}`
  }

  // Función para determinar si una semana es la semana actual
  const isCurrentWeek = (week: { date: string }) => {
    const [ddStr, mmStr] = week.date.split('-')
    const dd = parseInt(ddStr, 10)
    const mm = parseInt(mmStr, 10)
    if (Number.isNaN(dd) || Number.isNaN(mm)) return false
    
    const year = config?.year ?? new Date().getFullYear()
    const weekStart = new Date(year, mm - 1, dd) // Lunes
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6) // Domingo (lunes + 6 días)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalizar a medianoche para comparación
    
    return today >= weekStart && today <= weekEnd
  }

  // Summary helpers for footer
  const getAssigneeCountsForWeek = (weekId: string) => {
    const counts = new Map<string, number>()
    const visibleTasks = getSortedAndFilteredTasks()
    visibleTasks.forEach((task) => {
      const assignment = task.assignments.find((a: WeekAssignment) => a.weekId === weekId)
      assignment?.assignees.forEach((assignee) => {
        counts.set(assignee, (counts.get(assignee) || 0) + 1)
      })
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }

  const getAssigneeCountsForMonth = (month: string) => {
    const counts = new Map<string, number>()
    const visibleTasks = getSortedAndFilteredTasks()
    const monthWeeks = getMonthWeeks(month)
    const weekIds = new Set(monthWeeks.map((w) => w.id))
    visibleTasks.forEach((task) => {
      task.assignments.forEach((assignment) => {
        if (weekIds.has(assignment.weekId)) {
          assignment.assignees.forEach((assignee) => {
            counts.set(assignee, (counts.get(assignee) || 0) + 1)
          })
        }
      })
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }

  const getGridColumns = useCallback(() => {
    // Contar el total de columnas de semanas
    let weekColumnsCount = 0
    months.forEach((month) => {
      if (collapsedMonths.has(month)) {
        weekColumnsCount += 1
      } else {
        const monthWeeks = getMonthWeeks(month)
        weekColumnsCount += monthWeeks.length
      }
    })
    
    // Columna de tareas: 30% del ancho total
    // Resto (70%): dividido equitativamente entre todas las columnas de semanas
    // Usando fracciones: tasks = 4.3fr, cada semana = 1fr
    // Esto da: 4.3 / (4.3 + N) ≈ 30% cuando N ≈ 10-12
    const taskFraction = weekColumnsCount > 0 ? (weekColumnsCount * 0.43) : 3
    const columns = [`${taskFraction.toFixed(1)}fr`]
    
    months.forEach((month) => {
      if (collapsedMonths.has(month)) {
        columns.push("1fr")
      } else {
        const monthWeeks = getMonthWeeks(month)
        monthWeeks.forEach(() => columns.push("1fr"))
      }
    })
    
    return columns.join(" ")
  }, [months, collapsedMonths, getMonthWeeks])

  // Definir SortableRow antes del return
  const SortableRow = memo(({ task, getVacationDaysInWeek }: { task: Task; getVacationDaysInWeek: (memberName: string, week: { date: string }) => { days: number; type: 'vacation' | 'license' | null } }) => {
    const [openAssignmentSelect, setOpenAssignmentSelect] = useState<string | null>(null)
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1,
    }

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
      if (!openAssignmentSelect) return

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (!target.closest('.assignment-dropdown')) {
          setOpenAssignmentSelect(null)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [openAssignmentSelect])

    return (
      <div
        ref={setNodeRef}
        style={{ gridTemplateColumns: getGridColumns(), ...style }}
        className="grid border-b border-border hover:bg-muted/30"
      >
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="border-r border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
                onDoubleClick={() => {
                  setEditingTask(task)
                  setIsEditOpen(true)
                }}
              >
                <div className="flex items-center gap-2">
                  <button aria-label="Drag row" className="cursor-grab text-muted-foreground hover:text-foreground" {...listeners} {...attributes}>
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <div className="text-sm leading-relaxed font-medium flex-1">{task.name}</div>
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className="text-white hover:opacity-90" style={{ backgroundColor: getPriorityColor(task.priority) }}>{task.priority}</Badge>
                  <Badge className="text-white hover:opacity-90" style={{ backgroundColor: getTrackColor(task.track) }}>{task.track}</Badge>
                  <Badge className="text-white text-[10px] px-2 py-1 h-6 hover:opacity-90" style={{ backgroundColor: getStatusColor(task.status) }}>{task.status ?? "TODO"}</Badge>
                  <Badge variant="secondary" className="text-[10px] px-2 py-1 h-6">{task.size ?? "S"}</Badge>
                  <Badge className="text-white text-[10px] px-2 py-1 h-6 hover:opacity-90" style={{ backgroundColor: getTypeColor(task.type) }}>{task.type ?? "POROTO"}</Badge>
                  {task.comments && task.comments.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-1 h-6 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {task.comments.length}
                    </Badge>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Doble clic para editar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {months.map((month) => {
                const isCollapsed = collapsedMonths.has(month)
                const monthColor = MONTH_COLORS[month as keyof typeof MONTH_COLORS]
                
                if (isCollapsed) {
                  const summary = getMonthSummary(task, month)
                  return (
                    <div key={month} className={`flex flex-wrap items-center justify-center gap-1 border-r border-border p-2 ${monthColor}`}>
                      {summary.length > 0 ? (
                        summary.map((item) => (
                          <Badge
                            key={item.name}
                            variant="secondary"
                            className="text-white hover:opacity-80 text-[10px] px-2 py-1 h-6 flex items-center"
                            style={{ backgroundColor: getPersonColor(item.name) }}
                          >
                            {item.name} {item.weeks}W
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  )
                }

                const monthWeeks = getMonthWeeks(month)
                return monthWeeks.map((week) => {
                  const assignment = task.assignments.find((a: WeekAssignment) => a.weekId === week.id)
                  const assignees = assignment?.assignees || []
                  const hasAssignees = assignees.length > 0
                  const cellKey = `${task.id}-${week.id}`
                  const isCurrent = isCurrentWeek(week)

                  return (
                    <div 
                      key={week.id} 
                      className={`relative flex flex-col items-center justify-center gap-1 border-r p-1 min-h-[60px] ${
                        isCurrent 
                          ? 'border-l-4 border-l-blue-800' 
                          : 'border-border'
                      } ${
                        hasAssignees ? 'bg-blue-100/60' : monthColor
                      }`}
                      onMouseDown={(e) => {
                        // Solo abrir dropdown si es click izquierdo y no hay dropdown abierto
                        if (e.button === 0 && !openAssignmentSelect) {
                          e.stopPropagation()
                          e.preventDefault()
                          setOpenAssignmentSelect(cellKey)
                        }
                      }}
                    >
                      {openAssignmentSelect === cellKey && (
                        <div className="assignment-dropdown absolute left-1 top-7 z-20 w-44 rounded-md border bg-background p-1 shadow-md">
                          <div className="max-h-40 overflow-auto">
                            {config?.teamMembers
                              .filter((member) => !assignees.includes(member.name))
                              .map((member) => {
                                const firstName = member.name.split(' ')[0]
                                return (
                                <button
                                  type="button"
                                  key={member.name}
                                  tabIndex={-1}
                                  onMouseDown={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    handleAddAssignee(task.id, week.id, member.name)
                                    setOpenAssignmentSelect(null)
                                  }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                                >
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={member.avatarUrl} alt={firstName} />
                                      <AvatarFallback 
                                        className="text-[10px] font-medium text-white"
                                    style={{ backgroundColor: member.color }}
                                      >
                                        {firstName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 truncate">{firstName}</span>
                                </button>
                                )
                              })}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-1">
                        {assignees.map((assignee: string) => {
                          const vacationInfo = getVacationDaysInWeek(assignee, week)
                          const icon = vacationInfo.type === 'license' ? '📋' : '🏖️'
                          const firstName = assignee.split(" ")[0]
                          const member = config?.teamMembers.find(m => m.name === assignee)
                          const avatarUrl = member?.avatarUrl
                          const memberColor = member?.color || getPersonColor(assignee)
                          
                          const tooltipContent = (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{assignee}</span>
                              {vacationInfo.days > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {icon} {vacationInfo.days} {vacationInfo.days === 1 ? 'día' : 'días'} de {vacationInfo.type === 'license' ? 'licencia' : 'vacaciones'}
                                </span>
                              )}
                            </div>
                          )
                          
                          return (
                            <TooltipProvider key={assignee} delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative group">
                                    <Avatar className="h-7 w-7 cursor-pointer ring-2 ring-white hover:ring-offset-1 transition-all">
                                      <AvatarImage src={avatarUrl} alt={firstName} />
                                      <AvatarFallback 
                                        className="text-[10px] font-medium text-white"
                                        style={{ backgroundColor: memberColor }}
                            >
                                        {firstName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                {vacationInfo.days > 0 && (
                                      <span className="absolute -bottom-0.5 -right-0.5 text-[10px] bg-white rounded-full px-0.5 shadow-sm">
                                        {icon}
                                      </span>
                                )}
                              <button
                                type="button"
                                tabIndex={-1}
                                onMouseDown={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  handleRemoveAssignee(task.id, week.id, assignee)
                                }}
                                      className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                              >
                                      <X className="h-2.5 w-2.5 text-white" />
                              </button>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="z-50">
                                  {tooltipContent}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })}
                        {assignees.length === 0 && (
                          <span className="text-[10px] text-muted-foreground"> </span>
                        )}
                      </div>
                    </div>
                  )
                })
        })}
      </div>
    )
  }, (prevProps, nextProps) => {
    // Retorna true si las props son iguales (NO re-renderizar)
    // Retorna false si las props cambiaron (SÍ re-renderizar)
    const isSame = prevProps.task.id === nextProps.task.id &&
           JSON.stringify(prevProps.task.assignments) === JSON.stringify(nextProps.task.assignments) &&
           prevProps.task.name === nextProps.task.name &&
           prevProps.task.priority === nextProps.task.priority &&
           prevProps.task.track === nextProps.task.track &&
           prevProps.task.status === nextProps.task.status &&
           prevProps.task.size === nextProps.task.size &&
           prevProps.task.type === nextProps.task.type &&
           JSON.stringify(prevProps.task.comments) === JSON.stringify(nextProps.task.comments)
    return isSame
  })

  // Handle wizard completion
  const handleWizardComplete = (wizardData: any) => {
    console.log('🎉 Wizard completed with data:', wizardData)
    console.log('👥 Selected users:', wizardData.selectedUsers)
    
    try {
      // If a file was loaded, use that data
      if (wizardData.loadedFile) {
        console.log('📥 Importing loaded file data')
        const importedData = wizardData.loadedFile
        
        // Importar configuración
        if (importedData.config) {
          importConfig(importedData)
        } else {
          importConfig(importedData)
        }
        
        // Importar tareas
        if (importedData.tasks) {
          replaceTasks(importedData.tasks)
        } else if (Array.isArray(importedData)) {
          // Formato antiguo - solo tareas
          replaceTasks(importedData)
        }

        // Importar TODO Lists
        if (importedData.todoLists) {
          localStorage.setItem('todo-lists', JSON.stringify(importedData.todoLists))
        }
        
        // Importar TODOs
        if (importedData.todos) {
          localStorage.setItem('todos', JSON.stringify(importedData.todos))
        }
        
        // Limpiar clave obsoleta si existe
        localStorage.removeItem('global-todo-list')
        
        console.log('✅ File imported successfully from wizard')
        return
      }
      
      // Validate quarter and year
      const quarter = parseInt(wizardData.quarter)
      const year = parseInt(wizardData.year)
      
      console.log('📅 Quarter and Year:', { quarter, year, quarterType: typeof quarter, yearType: typeof year })
      
      if (!quarter || quarter < 1 || quarter > 4) {
        throw new Error(`Quarter inválido: ${wizardData.quarter}. Debe ser un número entre 1 y 4.`)
      }
      
      if (!year || year < 2000 || year > 2100) {
        throw new Error(`Año inválido: ${wizardData.year}`)
      }
      
      // Save Jira boards, email and token from wizard
      if (wizardData.jiraBoards && wizardData.jiraBoards.length > 0) {
        console.log(`💾 Saving ${wizardData.jiraBoards.length} Jira boards from wizard`)
        const firstBoard = wizardData.jiraBoards[0]
        const email = firstBoard.email
        
        // Save each board
        wizardData.jiraBoards.forEach((boardData: any) => {
          try {
            const url = new URL(boardData.boardUrl)
            const boardMatch = url.pathname.match(/\/boards\/(\d+)/)
            const boardId = boardMatch ? boardMatch[1] : Date.now().toString()
            const projectMatch = url.pathname.match(/\/projects\/([A-Z0-9]+)/)
            const projectName = projectMatch ? projectMatch[1] : 'Board'
            
            jiraSync.addBoard({
              id: boardId,
              name: projectName,
              url: boardData.boardUrl
            }, email)
            
            console.log(`  ✅ Saved board: ${projectName} (${boardId})`)
            
            // Save credentials if user requested to save token
            if (boardData.saveToken && boardData.token) {
              jiraSync.saveCredentials({
                boardUrl: boardData.boardUrl,
                email: email,
                token: boardData.token
              })
              console.log(`  🔐 Saved credentials (with token)`)
            }
          } catch (err) {
            console.error('  ❌ Error saving board:', err)
          }
        })
      }
      
      // Prepare team members from Jira BEFORE initializing config
      const teamMembersFromJira: TeamMember[] = []
      if (wizardData.selectedUsers && wizardData.selectedUsers.length > 0) {
        console.log(`👥 Processing ${wizardData.selectedUsers.length} selected users`)
        wizardData.selectedUsers.forEach((user: any) => {
          const name = user.systemUserName || user.displayName
          console.log(`  - User: ${name}, avatarUrl: ${user.avatarUrl ? 'YES' : 'NO'}`)
          teamMembersFromJira.push({
            name: name,
            color: generateColorFromName(name),
            avatarUrl: user.avatarUrl,
          })
        })
      }
      
      // Initialize configuration with team members included
      console.log(`🔧 Initializing config with ${teamMembersFromJira.length} team members`)
      const newConfig = initializeConfig(
        quarter,
        year,
        teamMembersFromJira, // Pass team members during initialization
        [], // Empty projects
        {
          tracks: wizardData.tracks,
          priorities: wizardData.priorities,
          statuses: wizardData.statuses,
          types: wizardData.types,
          sizes: wizardData.sizes,
          defaults: wizardData.defaults,
        }
      )
      
      console.log(`✅ Configuration initialized with ${teamMembersFromJira.length} team members`)
      console.log(`📅 Weeks generated:`, newConfig?.weeks?.length || 0)
      
      // Create tasks from selected epics - WAIT for config to be available
      if (wizardData.selectedEpics && wizardData.selectedEpics.length > 0) {
        // Use newConfig returned from initializeConfig to get weeks
        const weeksForAssignments = newConfig?.weeks || []
        console.log(`📋 Initializing assignments with ${weeksForAssignments.length} weeks`)
        
        const newTasks: Task[] = wizardData.selectedEpics.map((epicData: any, index: number) => {
          const epic = epicData.epic
          const epicConfig = epicData.configuration
          const domain = epicData.boardUrl.match(/^https?:\/\/[^\/]+/)?.[0] || ''
          
          // Extract board info from URL
          const url = new URL(epicData.boardUrl)
          const boardMatch = url.pathname.match(/\/boards\/(\d+)/)
          const boardId = boardMatch ? boardMatch[1] : ''
          const projectMatch = url.pathname.match(/\/projects\/([A-Z0-9]+)/)
          const boardName = projectMatch ? projectMatch[1] : ''
          
          // Transform stories to JiraSubtasks format
          const jiraSubtasks: JiraSubtask[] = (epicData.stories || []).map((story: any) => ({
            id: story.id,
            key: story.key,
            title: story.summary,
            status: story.status,
            assignee: story.assignee ? {
              id: story.assignee.accountId,
              displayName: story.assignee.displayName,
              avatarUrl: story.assignee.avatarUrl || '',
            } : undefined,
            startDate: story.startDate,
            endDate: story.endDate,
            createdAt: story.createdAt,
            updatedAt: story.updatedAt,
            description: story.description,
          }))
          
          console.log(`  📦 Epic ${epic.key}: ${jiraSubtasks.length} subtasks`)
          
          return {
            id: `jira-${epic.id}-${Date.now()}-${index}`,
            name: epic.summary,
            priority: epicConfig.priority as Priority,
            track: epicConfig.track,
            status: epicConfig.status as Status,
            size: epicConfig.size as Size,
            type: epicConfig.type as TaskType,
            order: index,
            weeks: [],
            assignments: weeksForAssignments.map((week) => ({ weekId: week.id, assignees: [] })),
            createdAt: Date.now(),
            jiraEpicKey: epic.key,
            jiraEpicId: epic.id,
            jiraEpicUrl: `${domain}/browse/${epic.key}`,
            jiraSubtasks: jiraSubtasks,
            jiraBoardId: boardId,
            jiraBoardName: boardName,
          }
        })
        
        const addResult = addTasks(newTasks)
        console.log(`✅ Added ${addResult.added} tasks from wizard with initialized assignments`)
      }
      
      console.log('✅ Wizard completed successfully')
    } catch (error) {
      console.error('❌ Error completing wizard:', error)
      alert('Error al completar la configuración. Por favor intenta de nuevo.')
    }
  }

  // Show wizard if needed
  if (shouldShowWizard) {
    return (
      <InitializationWizard
        onComplete={handleWizardComplete}
        onCancel={() => {
          // If cancelled and no config, initialize with defaults
          if (!isInitialized) {
            initializeConfig(4, 2025, [], [])
          }
        }}
      />
    )
  }

  // Loading state
  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with title and controls in one line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Team Roadmap</h1>
          <AddTaskModal config={config} onAddTask={handleAddTask} />
          <div className="text-sm text-muted-foreground">
            Q{config.quarter} {config.year} • {config.weeks.length} semanas
          </div>
        </div>
        <TooltipProvider>
          <div className="flex gap-2">
            {/* Team button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/team">
                  <Button variant="outline" size="icon" className="bg-transparent">
                    <Users className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mi Equipo</p>
              </TooltipContent>
            </Tooltip>

            {/* TODO List button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="bg-transparent relative" 
                  onClick={() => setIsTodoDrawerOpen(true)}
                >
                  <ListTodo className="h-4 w-4" />
                  {pendingTodosCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-semibold">
                      {pendingTodosCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>My TODO List</p>
              </TooltipContent>
            </Tooltip>

            {/* Refresh Jira button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="bg-transparent"
                  onClick={() => setShowJiraSyncModal(true)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sincronizar con Jira</p>
              </TooltipContent>
            </Tooltip>

            {/* Settings dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-transparent">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configuración</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    Configuración
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <label htmlFor="import-file" className="cursor-pointer flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                    <input id="import-file" type="file" accept=".json" className="hidden" onChange={handleImport} />
                  </label>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    if (confirm("¿Estás seguro de que quieres limpiar todos los datos? Esta acción no se puede deshacer.")) {
                      replaceTasks([])
                      localStorage.removeItem('roadmap-config')
                      localStorage.removeItem('roadmap-tasks')
                      localStorage.removeItem('todo-lists')
                      localStorage.removeItem('todos')
                      localStorage.removeItem('global-todo-list')
                      window.location.reload()
                    }
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clean
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>
      </div>

      {/* Controles de Filtrado */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Track:</span>
          <div className="flex items-center gap-2">
            {config.tracks.map((track) => {
              const active = selectedTracks.includes(track.name)
              return (
                <Button
                  key={track.name}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className={`h-8 px-3 ${active ? '' : 'bg-transparent'}`}
                  onClick={() => {
                    setSelectedTracks((prev) => prev.includes(track.name) ? prev.filter((x) => x !== track.name) : [...prev, track.name])
                  }}
                >
                  {track.name}
                </Button>
              )
            })}
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => setSelectedTracks([])}
            >
              Limpiar
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Prioridad:</span>
          <div className="flex items-center gap-2">
            {config.priorities.map((priority) => {
              const active = selectedPriorities.includes(priority.name as Priority)
              return (
                <Button
                  key={priority.name}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className={`h-8 px-3 ${active ? '' : 'bg-transparent'}`}
                  onClick={() => {
                    setSelectedPriorities((prev) => prev.includes(priority.name as Priority) ? prev.filter((x) => x !== priority.name) : [...prev, priority.name as Priority])
                  }}
                >
                  {priority.name}
                </Button>
              )
            })}
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => setSelectedPriorities([])}
            >
              Limpiar
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Personas:</span>
          <div className="flex items-center gap-2">
            {/* Opción "Sin asignar" */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPeople((prev) => 
                        prev.includes('__unassigned__') 
                          ? prev.filter((x) => x !== '__unassigned__') 
                          : [...prev, '__unassigned__']
                      )
                    }}
                    className={`relative inline-flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all bg-gray-100 ${
                      selectedPeople.includes('__unassigned__')
                        ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-lg">👤</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span>Sin asignar</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Personas del equipo */}
            {config.teamMembers.map((member) => {
              const active = selectedPeople.includes(member.name)
              const firstName = member.name.split(' ')[0]
              return (
                <TooltipProvider key={member.name} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPeople((prev) => 
                            prev.includes(member.name) 
                              ? prev.filter((x) => x !== member.name) 
                              : [...prev, member.name]
                          )
                        }}
                        className={`relative transition-all ${
                          active
                            ? 'ring-2 ring-blue-600 ring-offset-2 rounded-full'
                            : ''
                        }`}
                      >
                        <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-white hover:ring-gray-300 transition-all">
                          <AvatarImage src={member.avatarUrl} alt={firstName} />
                          <AvatarFallback 
                            className="text-xs font-medium text-white"
                            style={{ backgroundColor: member.color }}
                          >
                            {firstName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <span>{member.name}</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => setSelectedPeople([])}
            >
              Limpiar
            </Button>
          </div>
        </div>

        {/* Filtro por Tableros */}
        {(() => {
          // Obtener boards únicos de las tareas
          const uniqueBoards = Array.from(
            new Map(
              tasks
                .filter(task => task.jiraBoardId && task.jiraBoardName)
                .map(task => [task.jiraBoardId, task.jiraBoardName])
            )
          ).map(([id, name]) => ({ id: id as string, name: name as string }))

          if (uniqueBoards.length === 0) return null

          return (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tableros:</span>
              <div className="flex items-center gap-2">
                {uniqueBoards.map((board) => {
                  const active = selectedBoards.includes(board.id)
                  return (
                    <Button
                      key={board.id}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setSelectedBoards((prev) => 
                          prev.includes(board.id) 
                            ? prev.filter((x) => x !== board.id) 
                            : [...prev, board.id]
                        )
                      }}
                    >
                      {board.name}
                    </Button>
                  )
                })}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => setSelectedBoards([])}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          )
        })()}

        <div className="text-sm text-muted-foreground">
          {getSortedAndFilteredTasks().length} de {tasks.length} tareas
        </div>
      </div>

      <div className="w-full rounded-lg border border-border bg-card">
        <div className="w-full">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10">
            {/* Month Header */}
            <div className="grid border-b border-border bg-muted/50" style={{ gridTemplateColumns: getGridColumns() }}>
              <div className="border-r border-border p-4 font-semibold bg-background">TASK</div>
              {months.map((month) => {
                const monthWeeks = getMonthWeeks(month)
                const isCollapsed = collapsedMonths.has(month)
                const colSpan = isCollapsed ? 1 : monthWeeks.length
                const monthColor = MONTH_COLORS[month as keyof typeof MONTH_COLORS]

                return (
                  <div
                    key={month}
                    className={`border-r border-border p-4 text-center font-semibold cursor-pointer hover:bg-muted flex items-center justify-center gap-2 ${monthColor}`}
                    style={{ gridColumn: `span ${colSpan}` }}
                    onClick={() => toggleMonth(month)}
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {isCollapsed ? month.substring(0, 3) : month}
                  </div>
                )
              })}
            </div>

            {/* Week Headers */}
            <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: getGridColumns() }}>
              <div className="border-r border-border bg-background"></div>
              {months.map((month) => {
                const isCollapsed = collapsedMonths.has(month)
                const monthColor = MONTH_COLORS[month as keyof typeof MONTH_COLORS]
                
                if (isCollapsed) {
                  return (
                    <div key={month} className={`border-r border-border p-2 text-center text-xs ${monthColor}`}>
                      <div className="text-muted-foreground">Summary</div>
                    </div>
                  )
                }

                const monthWeeks = getMonthWeeks(month)
                return monthWeeks.map((week, idx) => {
                  const isCurrent = isCurrentWeek(week)
                  return (
                    <div 
                      key={week.id} 
                      className={`border-r p-2 text-center text-xs ${monthColor} ${
                        isCurrent 
                          ? 'border-l-4 border-l-blue-800' 
                          : 'border-border'
                      }`}
                    >
                      <div className={`${isCurrent ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-muted-foreground'}`}>
                        {`W${idx + 1}`}
                        {isCurrent && ' 📍'}
                      </div>
                      <div className={`font-medium ${isCurrent ? 'text-blue-900 dark:text-blue-300' : ''}`}>
                        {getWeekRangeLabel(week)}
                      </div>
                    </div>
                  )
                })
              })}
            </div>
          </div>

          {/* Tasks (Sortable) */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={getSortedAndFilteredTasks().map(t => t.id)} strategy={verticalListSortingStrategy}>
              {getSortedAndFilteredTasks().map((task: Task) => (
                <SortableRow key={task.id} task={task} getVacationDaysInWeek={getVacationDaysInWeek} />
              ))}
            </SortableContext>
          </DndContext>

          {/* End Sortable */}

          {/* Footer Summary Row */}
          <div className={`grid border-t border-border bg-muted/30 ${isStickyFooter ? 'sticky bottom-0' : ''} z-10`} style={{ gridTemplateColumns: getGridColumns() }}>
            <div className="border-r border-border p-2 text-xs font-medium bg-background flex items-center justify-between gap-2">
              <span>Resumen por semana</span>
              <button
                type="button"
                onClick={() => setIsStickyFooter(!isStickyFooter)}
                className="p-1 rounded hover:bg-muted transition-colors"
                title={isStickyFooter ? "Desfijar footer" : "Fijar footer"}
              >
                {isStickyFooter ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
              </button>
            </div>
            {months.map((month) => {
              const isCollapsed = collapsedMonths.has(month)
              const monthColor = MONTH_COLORS[month as keyof typeof MONTH_COLORS]
              if (isCollapsed) {
                const monthCounts = getAssigneeCountsForMonth(month)
                return (
                  <div key={month} className={`border-r border-border p-2 text-[11px] ${monthColor}`}>
                    {monthCounts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {monthCounts.map(({ name, count }) => {
                          const member = config?.teamMembers.find(m => m.name === name)
                          const avatarUrl = member?.avatarUrl
                          const memberColor = member?.color || getPersonColor(name)
                          const firstName = name.split(' ')[0]
                          
                          return (
                            <TooltipProvider key={name} delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative inline-flex items-center">
                                    <Avatar className="h-6 w-6 cursor-pointer ring-1 ring-white">
                                      <AvatarImage src={avatarUrl} alt={firstName} />
                                      <AvatarFallback 
                                        className="text-[9px] font-medium text-white"
                                        style={{ backgroundColor: memberColor }}
                                      >
                                        {firstName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span 
                                      className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] text-[9px] font-bold text-white rounded-full px-0.5 shadow-sm"
                                      style={{ backgroundColor: memberColor }}
                                    >
                                      {count}
                          </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="z-50">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium">{name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {count} {count === 1 ? 'tarea' : 'tareas'}
                                    </span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                )
              }
              const monthWeeks = getMonthWeeks(month)
              return monthWeeks.map((week) => {
                const counts = getAssigneeCountsForWeek(week.id)
                const isCurrent = isCurrentWeek(week)
                return (
                  <div 
                    key={week.id} 
                    className={`border-r p-2 text-[11px] ${monthColor} ${
                      isCurrent 
                        ? 'border-l-4 border-l-blue-800' 
                        : 'border-border'
                    }`}
                  >
                    {counts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {counts.map(({ name, count }) => {
                          const member = config?.teamMembers.find(m => m.name === name)
                          const avatarUrl = member?.avatarUrl
                          const memberColor = member?.color || getPersonColor(name)
                          const firstName = name.split(' ')[0]
                          
                          return (
                            <TooltipProvider key={name} delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative inline-flex items-center">
                                    <Avatar className="h-6 w-6 cursor-pointer ring-1 ring-white">
                                      <AvatarImage src={avatarUrl} alt={firstName} />
                                      <AvatarFallback 
                                        className="text-[9px] font-medium text-white"
                                        style={{ backgroundColor: memberColor }}
                                      >
                                        {firstName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span 
                                      className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] text-[9px] font-bold text-white rounded-full px-0.5 shadow-sm"
                                      style={{ backgroundColor: memberColor }}
                                    >
                                      {count}
                          </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="z-50">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium">{name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {count} {count === 1 ? 'tarea' : 'tareas'}
                                    </span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                )
              })
            })}
          </div>

        </div>
      </div>

      {/* Panel de Métricas */}
      <MetricsPanel
        tasks={tasks}
        weeks={config.weeks}
        teamMembers={config.teamMembers}
        months={months}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          open={isEditOpen}
          task={editingTask}
          onClose={() => setIsEditOpen(false)}
          onSave={(changes: EditableTaskFields) => {
            handleSaveTask({ id: editingTask.id, ...changes })
            setIsEditOpen(false)
          }}
          onSyncFromJira={handleSyncTaskFromJira}
          config={config}
        />
      )}

      {/* TODO List Drawer */}
      <TodoListDrawer
        open={isTodoDrawerOpen}
        onClose={() => setIsTodoDrawerOpen(false)}
      />

      {/* Jira Sync Modal */}
      <JiraSyncModal
        open={showJiraSyncModal}
        onClose={() => {
          setShowJiraSyncModal(false)
          jiraSync.clearError()
        }}
        onSync={handleJiraSync}
        onRefreshExisting={handleRefreshExistingEpics}
        savedCredentials={jiraSync.savedCredentials}
        savedBoards={jiraSync.savedBoards}
        hasExistingEpics={tasks.some(task => task.jiraEpicKey)}
        isLoading={jiraSync.isLoading}
        error={jiraSync.error}
        progress={jiraSync.progress}
        onAddBoard={jiraSync.addBoard}
        onRemoveBoard={jiraSync.removeBoard}
      />

      {/* Token Request Modal */}
      <TokenRequestModal
        open={showTokenRequestModal}
        onSubmit={handleTokenRequest}
        onCancel={handleTokenRequestCancel}
      />

      {/* Jira User Mapping Modal */}
      <JiraUserMappingModal
        open={showUserMappingModal}
        onClose={() => {
          setShowUserMappingModal(false)
          // If closed without completing, clear pending data
          if (!showEpicsReviewModal) {
            setPendingJiraData(null)
          }
        }}
        jiraUsers={jiraUsers}
        systemUsers={config.teamMembers}
        existingMappings={jiraSync.userMappings}
        onSaveMappings={handleUserMappingSave}
        onCreateUser={handleCreateUser}
      />

      {/* Jira Epics Review Modal */}
      {pendingJiraData && (
        <JiraEpicsReviewModal
          open={showEpicsReviewModal}
          onClose={() => {
            setShowEpicsReviewModal(false)
            setPendingJiraData(null)
          }}
          epics={pendingJiraData.epics}
          stories={pendingJiraData.stories}
          tracks={config.tracks.map(t => t.name)}
          priorities={config.priorities}
          sizes={config.sizes}
          types={config.types}
          defaultPriority={config.defaults?.priority as Priority || "3"}
          defaultTrack={config.defaults?.track || config.tracks[0]?.name}
          defaultSize={config.defaults?.size as Size || "M"}
          defaultType={config.defaults?.type}
          onConfirm={handleEpicsConfirm}
        />
      )}
    </div>
  )
}
