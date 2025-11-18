"use client"

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts'
import { TrendingUp, Target, Calendar, Award, Activity } from 'lucide-react'
import { useRoadmapConfig } from '@/hooks/use-roadmap-config'
import type { Task, JiraSubtask } from '@/hooks/use-roadmap-tasks'

interface UserMetricsTabProps {
  memberName: string
  tasks: Task[]
}

interface SprintMetrics {
  sprintNumber: number
  sprintName: string
  startDate: Date
  endDate: Date
  tasksStarted: number
  tasksClosed: number
  tasksCarryOver: number
  epicsCompleted: string[]
  subtasksStarted: JiraSubtask[]
  subtasksClosed: JiraSubtask[]
  subtasksCarryOver: JiraSubtask[]
}

export function UserMetricsTab({ memberName, tasks }: UserMetricsTabProps) {
  const { config } = useRoadmapConfig()

  // Calcular sprints y métricas
  const sprintsData = useMemo((): SprintMetrics[] => {
    if (!config?.weeks || config.weeks.length === 0) return []

    // Obtener la fecha de inicio del roadmap (primera semana)
    const firstWeek = config.weeks[0]
    const [day, month] = firstWeek.date.split('-').map(Number)
    const roadmapStartDate = new Date(config.year, month - 1, day)

    // Calcular cuántos sprints (períodos de 2 semanas) caben desde el inicio hasta hoy
    const today = new Date()
    const msPerDay = 1000 * 60 * 60 * 24
    const daysSinceStart = Math.floor((today.getTime() - roadmapStartDate.getTime()) / msPerDay)
    const totalSprints = Math.ceil(daysSinceStart / 14) + 1 // +1 para incluir sprint actual

    const sprints: SprintMetrics[] = []

    // Recopilar todas las subtareas del usuario de todas las tareas
    const userSubtasks: Array<{ subtask: JiraSubtask; epicKey: string; epicName: string }> = []
    
    // Normalizar nombre para comparación (lowercase, sin espacios extras)
    const normalizedMemberName = memberName.toLowerCase().trim().replace(/\s+/g, ' ')
    
    tasks.forEach(task => {
      if (task.jiraSubtasks && task.jiraSubtasks.length > 0) {
        task.jiraSubtasks.forEach(subtask => {
          if (subtask.assignee) {
            const normalizedAssigneeName = subtask.assignee.displayName.toLowerCase().trim().replace(/\s+/g, ' ')
            
            // Verificar si la subtarea está asignada al usuario (comparación flexible)
            if (normalizedAssigneeName === normalizedMemberName) {
              userSubtasks.push({
                subtask,
                epicKey: task.jiraEpicKey || '',
                epicName: task.name
              })
            }
          }
        })
      }
    })

    // Generar métricas para cada sprint
    for (let i = 0; i < totalSprints; i++) {
      const sprintStart = new Date(roadmapStartDate)
      sprintStart.setDate(sprintStart.getDate() + (i * 14))
      
      const sprintEnd = new Date(sprintStart)
      sprintEnd.setDate(sprintEnd.getDate() + 13) // 2 semanas = 14 días (0-13)

      // Tareas iniciadas en este sprint
      const subtasksStarted = userSubtasks.filter(({ subtask }) => {
        if (!subtask.startDate && !subtask.createdAt) return false
        const taskDate = new Date(subtask.startDate || subtask.createdAt!)
        return taskDate >= sprintStart && taskDate <= sprintEnd
      })

      // Tareas cerradas en este sprint (basado en updatedAt y status)
      const subtasksClosed = userSubtasks.filter(({ subtask }) => {
        if (!subtask.updatedAt) return false
        const isDone = subtask.status.toLowerCase().includes('done') || 
                      subtask.status.toLowerCase().includes('completado') ||
                      subtask.status.toLowerCase().includes('closed')
        if (!isDone) return false
        
        const taskDate = new Date(subtask.updatedAt)
        return taskDate >= sprintStart && taskDate <= sprintEnd
      })

      // Tareas carry over: tareas que empezaron en sprints anteriores y siguen activas
      const subtasksCarryOver = userSubtasks.filter(({ subtask }) => {
        const startDate = new Date(subtask.startDate || subtask.createdAt || '')
        const isNotDone = !subtask.status.toLowerCase().includes('done') && 
                         !subtask.status.toLowerCase().includes('completado') &&
                         !subtask.status.toLowerCase().includes('closed')
        
        // Empezó antes de este sprint y sigue activa
        return startDate < sprintStart && isNotDone && sprintStart <= today
      })

      // Épicas completadas: si todas las subtareas de una épica están cerradas en este sprint
      const epicsInSprint = new Set<string>()
      const epicCompletionStatus = new Map<string, { total: number; closed: number }>()

      // Contar subtareas por épica
      userSubtasks.forEach(({ subtask, epicKey, epicName }) => {
        if (!epicCompletionStatus.has(epicKey)) {
          epicCompletionStatus.set(epicKey, { total: 0, closed: 0 })
        }
        const status = epicCompletionStatus.get(epicKey)!
        status.total++
        
        const isDone = subtask.status.toLowerCase().includes('done') || 
                      subtask.status.toLowerCase().includes('completado') ||
                      subtask.status.toLowerCase().includes('closed')
        
        if (isDone && subtask.updatedAt) {
          const closeDate = new Date(subtask.updatedAt)
          if (closeDate >= sprintStart && closeDate <= sprintEnd) {
            status.closed++
            epicsInSprint.add(epicKey)
          }
        }
      })

      // Épicas que se completaron 100% en este sprint
      const epicsCompleted: string[] = []
      epicCompletionStatus.forEach((status, epicKey) => {
        if (status.total > 0 && status.closed === status.total && epicsInSprint.has(epicKey)) {
          const epic = tasks.find(t => t.jiraEpicKey === epicKey)
          if (epic) {
            epicsCompleted.push(epic.name)
          }
        }
      })

      sprints.push({
        sprintNumber: i + 1,
        sprintName: `Sprint ${i + 1}`,
        startDate: sprintStart,
        endDate: sprintEnd,
        tasksStarted: subtasksStarted.length,
        tasksClosed: subtasksClosed.length,
        tasksCarryOver: subtasksCarryOver.length,
        epicsCompleted,
        subtasksStarted: subtasksStarted.map(s => s.subtask),
        subtasksClosed: subtasksClosed.map(s => s.subtask),
        subtasksCarryOver: subtasksCarryOver.map(s => s.subtask)
      })
    }

    return sprints
  }, [config, tasks, memberName])

  // Datos para gráfico de barras
  const barChartData = useMemo(() => {
    return sprintsData.map(sprint => ({
      name: sprint.sprintName,
      'Iniciadas': sprint.tasksStarted,
      'Cerradas': sprint.tasksClosed,
      'Carry Over': sprint.tasksCarryOver,
    }))
  }, [sprintsData])

  // Datos para gráfico de velocidad (tareas cerradas por sprint)
  const velocityData = useMemo(() => {
    return sprintsData.map(sprint => ({
      name: sprint.sprintName,
      'Cerradas': sprint.tasksClosed,
      'Promedio': Math.round(sprintsData.reduce((acc, s) => acc + s.tasksClosed, 0) / sprintsData.length)
    }))
  }, [sprintsData])

  // Datos para gráfico radar de capacidad
  const capacityData = useMemo(() => {
    const totalStarted = sprintsData.reduce((acc, s) => acc + s.tasksStarted, 0)
    const totalClosed = sprintsData.reduce((acc, s) => acc + s.tasksClosed, 0)
    const totalCarryOver = sprintsData.reduce((acc, s) => acc + s.tasksCarryOver, 0)
    const avgClosed = sprintsData.length > 0 ? totalClosed / sprintsData.length : 0
    const completionRate = totalStarted > 0 ? (totalClosed / totalStarted) * 100 : 0

    return [
      { metric: 'Tareas Iniciadas', value: Math.min(totalStarted, 100), fullMark: 100 },
      { metric: 'Tareas Cerradas', value: Math.min(totalClosed, 100), fullMark: 100 },
      { metric: 'Tasa Completitud', value: Math.min(completionRate, 100), fullMark: 100 },
      { metric: 'Velocidad Promedio', value: Math.min(avgClosed * 10, 100), fullMark: 100 },
      { metric: 'Carry Over', value: Math.min(totalCarryOver, 100), fullMark: 100 },
    ]
  }, [sprintsData])

  // Estadísticas generales
  const stats = useMemo(() => {
    const totalTasksStarted = sprintsData.reduce((acc, s) => acc + s.tasksStarted, 0)
    const totalTasksClosed = sprintsData.reduce((acc, s) => acc + s.tasksClosed, 0)
    const totalEpicsCompleted = new Set(sprintsData.flatMap(s => s.epicsCompleted)).size
    const avgVelocity = sprintsData.length > 0 
      ? (totalTasksClosed / sprintsData.length).toFixed(1) 
      : '0'
    const completionRate = totalTasksStarted > 0 
      ? ((totalTasksClosed / totalTasksStarted) * 100).toFixed(0) 
      : '0'

    return {
      totalTasksStarted,
      totalTasksClosed,
      totalEpicsCompleted,
      avgVelocity,
      completionRate
    }
  }, [sprintsData])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No hay configuración del roadmap</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Iniciadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasksStarted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Cerradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasksClosed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Épicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEpicsCompleted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Velocidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgVelocity}</div>
            <p className="text-xs text-muted-foreground">tareas/sprint</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Completitud
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras por sprint */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas por Sprint</CardTitle>
          <CardDescription>Tareas iniciadas, cerradas y carry over por sprint de 2 semanas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }} 
              />
              <Legend />
              <Bar dataKey="Iniciadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cerradas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Carry Over" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de velocidad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Velocidad del Usuario</CardTitle>
            <CardDescription>Tareas cerradas por sprint vs promedio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="Cerradas" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Promedio" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Radar de Capacidad */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Capacidad</CardTitle>
            <CardDescription>Vista general del rendimiento del usuario</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={capacityData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="metric" className="text-xs" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
                <Radar name="Métricas" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla detallada de sprints */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Sprint</CardTitle>
          <CardDescription>Información detallada de cada sprint de 2 semanas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-sm">Sprint</th>
                  <th className="text-left p-3 font-medium text-sm">Período</th>
                  <th className="text-center p-3 font-medium text-sm">Iniciadas</th>
                  <th className="text-center p-3 font-medium text-sm">Cerradas</th>
                  <th className="text-center p-3 font-medium text-sm">Carry Over</th>
                  <th className="text-left p-3 font-medium text-sm">Épicas Completadas</th>
                </tr>
              </thead>
              <tbody>
                {sprintsData.map((sprint, index) => (
                  <tr key={index} className="border-t hover:bg-muted/20">
                    <td className="p-3">
                      <div className="font-medium">{sprint.sprintName}</div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                        {sprint.tasksStarted}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300">
                        {sprint.tasksClosed}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300">
                        {sprint.tasksCarryOver}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {sprint.epicsCompleted.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {sprint.epicsCompleted.map((epic, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              🎉 {epic}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

