"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddTaskModal } from "@/components/add-task-modal"
import { QuarterYearModal } from "@/components/quarter-year-modal"
import { MetricsPanel } from "@/components/metrics-panel"
import { useRoadmapConfig } from "@/hooks/use-roadmap-config"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Download, Upload, X, ChevronDown, ChevronRight } from "lucide-react"

type Priority = "Milestone" | "1" | "2" | "3"
type Track = "Swiper" | "TM" | "Guardians"

interface WeekAssignment {
  weekId: string
  assignees: string[]
}

interface Task {
  id: string
  name: string
  priority: Priority
  track: Track
  weeks: string[]
  assignments: WeekAssignment[]
  createdAt: number
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

// Colores suaves para los meses - más distintivos
const MONTH_COLORS = {
  "OCTUBRE": "bg-orange-100/40 border-orange-300/60",
  "NOVIEMBRE": "bg-purple-100/40 border-purple-300/60", 
  "DICIEMBRE": "bg-emerald-100/40 border-emerald-300/60"
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
  const [sortBy, setSortBy] = useState<'priority' | 'created' | 'name'>('created')
  const [filterTrack, setFilterTrack] = useState<Track | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')

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

  const handleAddTask = (newTask: { name: string; priority: Priority; track: Track }) => {
    if (!config) return
    
    const task: Task = {
      id: Date.now().toString(),
      name: newTask.name,
      priority: newTask.priority,
      track: newTask.track,
      weeks: [],
      assignments: config.weeks.map((week) => ({ weekId: week.id, assignees: [] })),
      createdAt: Date.now()
    }
    setTasks((prev) => [...prev, task])
  }

  const handleExport = () => {
    if (!config) return
    
    const exportData = {
      config,
      tasks,
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
        
        setShowQuarterModal(false)
        
      } catch (error) {
        console.error("Error importing file:", error)
        alert("Error importing file. Please make sure it's a valid JSON file.")
      }
    }
    reader.readAsText(file)
  }

  const handleAddAssignee = (taskId: string, weekId: string, assignee: string) => {
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
  }

  const handleRemoveAssignee = (taskId: string, weekId: string, assignee: string) => {
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
  }

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "Milestone":
        return "bg-amber-500 text-amber-950 hover:bg-amber-500/80"
      case "1":
        return "bg-red-500 text-white hover:bg-red-500/80"
      case "2":
        return "bg-blue-500 text-white hover:bg-blue-500/80"
      case "3":
        return "bg-emerald-500 text-white hover:bg-emerald-500/80"
    }
  }

  const getPersonColor = (name: string) => {
    return generateColorFromName(name)
  }

  const getTrackColor = (track: Track) => {
    return TRACK_COLORS[track]
  }

  const getSortedAndFilteredTasks = () => {
    let filteredTasks = tasks

    // Aplicar filtros
    if (filterTrack !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.track === filterTrack)
    }
    
    if (filterPriority !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.priority === filterPriority)
    }

    // Aplicar ordenamiento
    return filteredTasks.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { 'Milestone': 0, '1': 1, '2': 2, '3': 3 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        case 'created':
          return b.createdAt - a.createdAt // Más recientes primero
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })
  }


  const getMonthWeeks = (month: string) => {
    if (!config) return []
    return config.weeks.filter((week) => week.month === month)
  }

  const getMonthSummary = (task: Task, month: string) => {
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
  }

  const getGridColumns = () => {
    const columns = ["400px"]
    months.forEach((month) => {
      if (collapsedMonths.has(month)) {
        columns.push("120px") // Summary column width
      } else {
        const monthWeeks = getMonthWeeks(month)
        monthWeeks.forEach(() => columns.push("80px"))
      }
    })
    return columns.join(" ")
  }

  // Mostrar modal de configuración inicial si no está inicializado
  if (!isInitialized) {
    return (
      <QuarterYearModal
        open={true}
        onConfirm={(quarter, year) => {
          initializeConfig(quarter, year)
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
          <AddTaskModal onAddTask={handleAddTask} />
          <div className="text-sm text-muted-foreground">
            Q{config.quarter} {config.year} • {config.weeks.length} semanas
          </div>
        </div>
        <div className="flex gap-2">
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

      {/* Controles de Filtrado y Ordenamiento */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Label htmlFor="sort-by" className="text-sm font-medium">Ordenar por:</Label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'priority' | 'created' | 'name')}>
            <SelectTrigger id="sort-by" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Fecha de creación</SelectItem>
              <SelectItem value="priority">Prioridad</SelectItem>
              <SelectItem value="name">Nombre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="filter-track" className="text-sm font-medium">Track:</Label>
          <Select value={filterTrack} onValueChange={(value) => setFilterTrack(value as Track | 'all')}>
            <SelectTrigger id="filter-track" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Swiper">Swiper</SelectItem>
              <SelectItem value="TM">TM</SelectItem>
              <SelectItem value="Guardians">Guardians</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="filter-priority" className="text-sm font-medium">Prioridad:</Label>
          <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value as Priority | 'all')}>
            <SelectTrigger id="filter-priority" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Milestone">Milestone</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {getSortedAndFilteredTasks().length} de {tasks.length} tareas
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="min-w-[1400px]">
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
                return monthWeeks.map((week) => (
                  <div key={week.id} className={`border-r border-border p-2 text-center text-xs ${monthColor}`}>
                    <div className="font-medium">{week.date}</div>
                    <div className="text-muted-foreground">{week.id}</div>
                  </div>
                ))
              })}
            </div>
          </div>

          {/* Tasks */}
          {getSortedAndFilteredTasks().map((task: Task) => (
            <div
              key={task.id}
              className="grid border-b border-border hover:bg-muted/30"
              style={{ gridTemplateColumns: getGridColumns() }}
            >
              <div className="border-r border-border p-4">
                <div className="flex items-start gap-2">
                  <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  <Badge className={getTrackColor(task.track)}>{task.track}</Badge>
                  <div className="flex-1 text-sm leading-relaxed">{task.name}</div>
                </div>
              </div>
              {months.map((month) => {
                const isCollapsed = collapsedMonths.has(month)
                const monthColor = MONTH_COLORS[month as keyof typeof MONTH_COLORS]
                
                if (isCollapsed) {
                  const summary = getMonthSummary(task, month)
                  return (
                    <div key={month} className={`flex flex-wrap gap-1 border-r border-border p-2 ${monthColor}`}>
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

                  return (
                    <div 
                      key={week.id} 
                      className={`flex flex-col gap-1 border-r border-border p-1 min-h-[60px] ${
                        hasAssignees ? 'bg-blue-100/60' : monthColor
                      }`}
                    >
                      {canAddMore && (
                        <Select onValueChange={(value: string) => handleAddAssignee(task.id, week.id, value)}>
                          <SelectTrigger className="h-6 w-full border-0 bg-gray-100 hover:bg-gray-200 text-[10px] focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {config?.teamMembers.filter((member: string) => !assignees.includes(member)).map((member: string) => (
                              <SelectItem key={member} value={member} className="text-xs">
                                {member}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="flex flex-col gap-1">
                        {assignees.map((assignee: string) => (
                          <Badge
                            key={assignee}
                            variant="secondary"
                            className="flex items-center justify-between gap-1 text-white hover:opacity-80 text-[10px] px-1 py-1 h-6"
                            style={{ backgroundColor: getPersonColor(assignee) }}
                          >
                            <span className="truncate">{assignee.split(" ")[0]}</span>
                            <button
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                handleRemoveAssignee(task.id, week.id, assignee)
                              }}
                              className="hover:bg-black/20 rounded-sm p-0.5"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Panel de Métricas */}
      <MetricsPanel
        tasks={tasks}
        weeks={config.weeks}
        teamMembers={config.teamMembers}
        months={months}
      />
    </div>
  )
}
