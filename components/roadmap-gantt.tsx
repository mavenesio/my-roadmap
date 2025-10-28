"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddTaskModal } from "@/components/add-task-modal"
import { EditTaskModal } from "./edit-task-modal"
import { QuarterYearModal } from "@/components/quarter-year-modal"
import { MetricsPanel } from "@/components/metrics-panel"
import { TodoListDrawer } from "@/components/todo-list-drawer"
import { useRoadmapConfig } from "@/hooks/use-roadmap-config"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Download, Upload, X, ChevronDown, ChevronRight, GripVertical, Pin, PinOff, MessageSquare, Edit2, Users, ListTodo } from "lucide-react"
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  const { config, isInitialized, months, initializeConfig, importConfig, exportConfig } = useRoadmapConfig()
  const [tasks, setTasks] = useLocalStorage<Task[]>('roadmap-tasks', INITIAL_TASKS)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [showQuarterModal, setShowQuarterModal] = useState(false)
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([])
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isStickyFooter, setIsStickyFooter] = useState(true)
  const [isTodoDrawerOpen, setIsTodoDrawerOpen] = useState(false)
  const [todoLists] = useLocalStorage<any[]>('todo-lists', [])
  const [todos] = useLocalStorage<any[]>('todos', [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filtersInitialized, setFiltersInitialized] = useState(false)

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
        setTasks([])
      }

      // Migración: asignar "order" secuencial si falta
      const needsOrderMigration = tasks.some((t: any) => typeof (t as Task).order !== 'number')
      if (needsOrderMigration) {
        const migrated = [...tasks]
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((t, idx) => ({ ...t, order: idx + 1 }))
        setTasks(migrated as Task[])
      }
    }
  }, [config, tasks, setTasks])

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
    setTasks((prev) => [...prev, task])
  }

  const handleSaveTask = (updated: Partial<Task> & { id: string }) => {
    setTasks((prevTasks: Task[]) =>
      prevTasks.map((task) => (task.id === updated.id ? { ...task, ...updated } as Task : task))
    )
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

    setTasks(prev => prev.map(t => ({ ...t, order: mergedOrder.get(t.id) ?? t.order } as Task)))
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
            setTasks(importedData.tasks)
          } else if (Array.isArray(importedData)) {
            // Formato antiguo - solo tareas
            setTasks(importedData)
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
          setTasks(importedData.tasks)
        } else if (Array.isArray(importedData)) {
          // Formato antiguo - solo tareas
          setTasks(importedData)
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
    setTasks((prevTasks: Task[]) =>
      prevTasks.map((task: Task) => {
        if (task.id === taskId) {
          return {
            ...task,
            assignments: task.assignments.map((assignment: WeekAssignment) => {
              if (assignment.weekId === weekId) {
                const currentAssignees = assignment.assignees
                if (!currentAssignees.includes(assignee) && currentAssignees.length < 2) {
                  return { ...assignment, assignees: [...currentAssignees, assignee] }
                }
              }
              return assignment
            }),
          }
        }
        return task
      }),
    )
  }, [setTasks])

  const handleRemoveAssignee = useCallback((taskId: string, weekId: string, assignee: string) => {
    setTasks((prevTasks: Task[]) =>
      prevTasks.map((task: Task) => {
        if (task.id === taskId) {
          return {
            ...task,
            assignments: task.assignments.map((assignment: WeekAssignment) => {
              if (assignment.weekId === weekId) {
                return { ...assignment, assignees: assignment.assignees.filter((a: string) => a !== assignee) }
              }
              return assignment
            }),
          }
        }
        return task
      }),
    )
  }, [setTasks])

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
                  const canAddMore = assignees.length < 2
                  const hasAssignees = assignees.length > 0
                  const cellKey = `${task.id}-${week.id}`
                  const isCurrent = isCurrentWeek(week)

                  return (
                    <div 
                      key={week.id} 
                      className={`relative flex flex-col items-center justify-center gap-1 border-r p-1 min-h-[60px] ${
                        isCurrent 
                          ? 'border-l-4 border-l-blue-600 bg-blue-50/40 dark:bg-blue-950/20' 
                          : 'border-border'
                      } ${
                        hasAssignees && !isCurrent ? 'bg-blue-100/60' : ''
                      } ${
                        !hasAssignees && !isCurrent ? monthColor : ''
                      }`}
                      onMouseDown={(e) => {
                        // Solo abrir dropdown si es click izquierdo y no hay dropdown abierto
                        if (e.button === 0 && canAddMore && !openAssignmentSelect) {
                          e.stopPropagation()
                          e.preventDefault()
                          setOpenAssignmentSelect(cellKey)
                        }
                      }}
                    >
                      {canAddMore && openAssignmentSelect === cellKey && (
                        <div className="assignment-dropdown absolute left-1 top-7 z-20 w-40 rounded-md border bg-background p-1 shadow-md">
                          <div className="max-h-40 overflow-auto">
                            {config?.teamMembers
                              .filter((member) => !assignees.includes(member.name))
                              .map((member) => (
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
                                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
                                >
                                  <span
                                    className="inline-block h-3 w-3 rounded-full"
                                    style={{ backgroundColor: member.color }}
                                  />
                                  {member.name}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-1">
                        {assignees.map((assignee: string) => {
                          const vacationInfo = getVacationDaysInWeek(assignee, week)
                          const icon = vacationInfo.type === 'license' ? '📋' : '🏖️'
                          return (
                            <Badge
                              key={assignee}
                              variant="secondary"
                              className="flex items-start justify-between gap-1 text-white hover:opacity-80 text-[10px] px-1.5 py-1 min-h-[24px]"
                              style={{ backgroundColor: getPersonColor(assignee) }}
                            >
                              <div className="flex flex-col items-start">
                                <span className="truncate leading-tight">{assignee.split(" ")[0]}</span>
                                {vacationInfo.days > 0 && (
                                  <span className="text-[9px] leading-tight">{icon}{vacationInfo.days}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                tabIndex={-1}
                                onMouseDown={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  handleRemoveAssignee(task.id, week.id, assignee)
                                }}
                                className="hover:bg-black/20 rounded-sm p-0.5 mt-0.5"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          )
                        })}
                        {assignees.length === 0 && canAddMore && (
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

  // Mostrar modal de configuración inicial si no está inicializado
  if (!isInitialized) {
    return (
      <QuarterYearModal
        open={true}
        onConfirm={(quarter, year, teamMembers, projects) => {
          initializeConfig(quarter, year, teamMembers, projects)
          setShowQuarterModal(false)
        }}
        onImport={handleFileImport}
      />
    )
  }

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AddTaskModal config={config} onAddTask={handleAddTask} />
          <div className="text-sm text-muted-foreground">
            Q{config.quarter} {config.year} • {config.weeks.length} semanas
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/team">
            <Button variant="outline" className="gap-2 bg-transparent">
              <Users className="h-4 w-4" />
              Mi Equipo
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="gap-2 bg-transparent relative" 
            onClick={() => setIsTodoDrawerOpen(true)}
          >
            <ListTodo className="h-4 w-4" />
            My TODO List
            {pendingTodosCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-semibold">
                {pendingTodosCount}
              </span>
            )}
          </Button>
          <Link href="/settings">
            <Button variant="outline" className="gap-2 bg-transparent">
              Configuración
            </Button>
          </Link>
          <Button variant="outline" onClick={handleExport} className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" asChild>
            <label htmlFor="import-file" className="cursor-pointer">
              <Upload className="h-4 w-4" />
              Import
              <input id="import-file" type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (confirm("¿Estás seguro de que quieres limpiar todos los datos? Esta acción no se puede deshacer.")) {
                setTasks([])
                localStorage.removeItem('roadmap-config')
                localStorage.removeItem('roadmap-tasks')
                localStorage.removeItem('todo-lists')
                localStorage.removeItem('todos')
                localStorage.removeItem('global-todo-list') // Limpiar clave obsoleta también
                window.location.reload()
              }
            }}
            className="gap-2 bg-transparent text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        </div>
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
                          ? 'border-l-4 border-l-blue-600 bg-blue-50/60 dark:bg-blue-950/30' 
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
                        {monthCounts.map(({ name, count }) => (
                          <span key={name} className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-white" style={{ backgroundColor: getPersonColor(name) }}>
                            {name.split(' ')[0]} {count}
                          </span>
                        ))}
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
                        ? 'border-l-4 border-l-blue-600 bg-blue-50/60 dark:bg-blue-950/30' 
                        : 'border-border'
                    }`}
                  >
                    {counts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {counts.map(({ name, count }) => (
                          <span key={name} className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-white" style={{ backgroundColor: getPersonColor(name) }}>
                            {name.split(' ')[0]} {count}
                          </span>
                        ))}
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
          config={config}
        />
      )}

      {/* TODO List Drawer */}
      <TodoListDrawer
        open={isTodoDrawerOpen}
        onClose={() => setIsTodoDrawerOpen(false)}
      />
    </div>
  )
}
