"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "@/components/ui/badge"
import { MetricsModal } from "./metrics-modal"
import { Users, Calendar, BarChart3 } from "lucide-react"

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

interface MetricsPanelProps {
  tasks: Task[]
  weeks: Week[]
  teamMembers: Array<{ name: string; color: string }>
  months: string[]
}

export function MetricsPanel({ tasks, weeks, teamMembers, months }: MetricsPanelProps) {
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getPersonColor = (name?: string | null): string => {
    const safe = name ?? ""
    if (safe.length === 0) return "#999999"
    let hash = 0
    for (let i = 0; i < safe.length; i++) {
      hash = safe.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    const saturation = 75 + (Math.abs(hash) % 15)
    const lightness = 40 + (Math.abs(hash) % 20)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  const handlePersonClick = (person: string, month: string) => {
    setSelectedPerson(person)
    setSelectedMonth(month)
    setIsModalOpen(true)
  }

  // Calcular métricas por persona y mes
  const calculateMetrics = () => {
    const metrics: Record<string, Record<string, number>> = {}
    
    // Inicializar estructura
    teamMembers.forEach(member => {
      metrics[member.name] = {}
      months.forEach(month => {
        metrics[member.name][month] = 0
      })
    })

    // Contar tareas por persona y mes
    tasks.forEach(task => {
      const monthWeeks = weeks.filter(week => week.month)
      
      task.assignments.forEach(assignment => {
        const week = monthWeeks.find(w => w.id === assignment.weekId)
        if (week) {
          assignment.assignees.forEach(assignee => {
            if (teamMembers.some(m => m.name === assignee)) {
              metrics[assignee][week.month]++
            }
          })
        }
      })
    })

    return metrics
  }

  const metrics = calculateMetrics()

  // Calcular totales
  const getTotalForPerson = (person: string) => {
    return months.reduce((total, month) => total + metrics[person][month], 0)
  }

  const getTotalForMonth = (month: string) => {
    return teamMembers.reduce((total, member) => total + metrics[member.name][month], 0)
  }

  const getTotalTasks = () => {
    return teamMembers.reduce((total, member) => total + getTotalForPerson(member.name), 0)
  }

  // Función para obtener el color del semáforo basado en la cantidad de tareas
  const getSemaphoreColor = (count: number): { bg: string; hover: string; text: string } => {
    if (count >= 4 && count <= 6) {
      // Verde: 4-6 tareas (ideal)
      return {
        bg: 'bg-green-600',
        hover: 'hover:bg-green-700',
        text: 'text-white'
      }
    } else if (count === 3 || count === 7) {
      // Amarillo: 3 o 7 tareas (advertencia)
      return {
        bg: 'bg-yellow-500',
        hover: 'hover:bg-yellow-600',
        text: 'text-black'
      }
    } else {
      // Rojo: 1, 2, 8 o más (sobrecarga o subcarga)
      return {
        bg: 'bg-red-600',
        hover: 'hover:bg-red-700',
        text: 'text-white'
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Métricas del Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">{tasks.length}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">{teamMembers.length}</div>
              <div className="text-sm text-muted-foreground">Miembros del Equipo</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">{months.length}</div>
              <div className="text-sm text-muted-foreground">Meses</div>
            </div>
          </div>

          {/* Tabla de métricas */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    <Users className="h-4 w-4 inline mr-2" />
                    Persona
                  </th>
                  {months.map((month) => (
                    <th key={month} className="text-center p-3 font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      {month}
                    </th>
                  ))}
                  <th className="text-center p-3 font-medium text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.name} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: member.color || getPersonColor(member.name) }}
                        />
                        {member.name}
                      </div>
                    </td>
                    {months.map((month) => {
                      const count = metrics[member.name][month]
                      const colors = getSemaphoreColor(count)
                      return (
                        <td key={month} className="p-3 text-center">
                          {count > 0 ? (
                            <button
                              onClick={() => handlePersonClick(member.name, month)}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${colors.bg} ${colors.text} ${colors.hover} transition-colors text-sm font-medium`}
                            >
                              {count}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="p-3 text-center font-medium">
                      {getTotalForPerson(member.name) > 0 ? (
                        <Badge variant="secondary">
                          {getTotalForPerson(member.name)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t font-medium">
                  <td className="p-3">Total</td>
                  {months.map((month) => (
                    <td key={month} className="p-3 text-center">
                      <Badge variant="outline">
                        {getTotalForMonth(month)}
                      </Badge>
                    </td>
                  ))}
                  <td className="p-3 text-center">
                    <Badge variant="default">
                      {getTotalTasks()}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalles */}
      {selectedPerson && selectedMonth && (
        <MetricsModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          personName={selectedPerson}
          month={selectedMonth}
          tasks={tasks}
          weeks={weeks}
        />
      )}
    </div>
  )
}
