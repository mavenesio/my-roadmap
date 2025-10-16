"use client"

import type React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { X, Calendar, User, Clock } from "lucide-react"
import { useRoadmapConfig } from "@/hooks/use-roadmap-config"

interface Task {
  id: string
  name: string
  priority: "Milestone" | "1" | "2" | "3"
  track: string
  status: "TODO" | "PREWORK" | "WIP" | "TESTING" | "LAST LAP" | "DONE" | "ROLLOUT" | "DISMISSED" | "ON HOLD"
  size: "XS" | "S" | "M" | "L" | "XL"
  type: "DEUDA TECNICA" | "CARRY OVER" | "EXTRA MILE" | "OVNI" | "POROTO"
  weeks: string[]
  assignments: Array<{
    weekId: string
    assignees: string[]
  }>
  createdAt: number
}

interface Week {
  id: string
  date: string
  month: string
}

interface MetricsModalProps {
  open: boolean
  onClose: () => void
  personName: string
  month: string
  tasks: Task[]
  weeks: Week[]
}

export function MetricsModal({ open, onClose, personName, month, tasks, weeks }: MetricsModalProps) {
  const { config } = useRoadmapConfig()
  const colorFor = (arr: Array<{name: string; color: string}> | undefined, name: string, fallback: string) => arr?.find(i => i.name === name)?.color || fallback
  
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

  const getWeekNumberInMonth = (weekId: string, month: string) => {
    const monthWeeks = weeks.filter(w => w.month === month)
    const index = monthWeeks.findIndex(w => w.id === weekId)
    return index >= 0 ? `W${index + 1}` : weekId
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Milestone":
        return "bg-amber-500 text-amber-950"
      case "1":
        return "bg-red-500 text-white"
      case "2":
        return "bg-blue-500 text-white"
      case "3":
        return "bg-emerald-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getTrackColor = (track: string) => {
    switch (track) {
      case "Swiper":
        return "bg-blue-500 text-white"
      case "TM":
        return "bg-green-500 text-white"
      case "Guardians":
        return "bg-purple-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  // Filtrar tareas donde la persona está asignada en el mes específico
  const personTasks = tasks.filter(task => {
    const monthWeeks = weeks.filter(week => week.month === month)
    return task.assignments.some(assignment => {
      const week = monthWeeks.find(w => w.id === assignment.weekId)
      return week && assignment.assignees.includes(personName)
    })
  })

  // Agrupar tareas por semana
  const tasksByWeek = personTasks.reduce((acc, task) => {
    const monthWeeks = weeks.filter(week => week.month === month)
    
    task.assignments.forEach(assignment => {
      const week = monthWeeks.find(w => w.id === assignment.weekId)
      if (week && assignment.assignees.includes(personName)) {
        if (!acc[week.id]) {
          acc[week.id] = {
            week,
            tasks: []
          }
        }
        acc[week.id].tasks.push(task)
      }
    })
    
    return acc
  }, {} as Record<string, { week: Week; tasks: Task[] }>)

  const sortedWeeks = Object.values(tasksByWeek).sort((a, b) => 
    a.week.id.localeCompare(b.week.id)
  )

  const totalTasks = personTasks.length
  const totalWeeks = Object.keys(tasksByWeek).length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {personName} - {month}
          </DialogTitle>
          <DialogDescription>
            Tareas asignadas en {month} ({totalTasks} tareas en {totalWeeks} semanas)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {sortedWeeks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay tareas asignadas en {month}</p>
            </div>
          ) : (
            sortedWeeks.map(({ week, tasks: weekTasks }) => (
              <div key={week.id} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                  <Calendar className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{getWeekNumberInMonth(week.id, month)}</span>
                    <span className="font-semibold text-foreground">{getWeekRangeLabel(week)}</span>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {weekTasks.length} tarea{weekTasks.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="grid gap-2">
                  {weekTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Badge className="text-white" style={{ backgroundColor: colorFor(config?.priorities, task.priority, '#6b7280') }}>
                          {task.priority}
                        </Badge>
                        <Badge className="text-white" style={{ backgroundColor: colorFor(config?.tracks, task.track, '#6b7280') }}>
                          {task.track}
                        </Badge>
                        <div className="flex-1 text-sm font-medium">
                          {task.name}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Creada: {new Date(task.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex-shrink-0 flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
