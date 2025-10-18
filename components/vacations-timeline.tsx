"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { AddVacationModal } from "./add-vacation-modal"

type AbsenceType = 'vacation' | 'license'

interface Vacation {
  id: string
  startDate: string
  endDate: string
  description?: string
  type?: AbsenceType
}

interface TeamMember {
  name: string
  color: string
  nationality?: string
  seniority?: string
  vacations?: Vacation[]
}

interface VacationsTimelineProps {
  members: TeamMember[]
  onUpdateMember: (member: TeamMember) => void
}

export function VacationsTimeline({ members, onUpdateMember }: VacationsTimelineProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null)

  // Generar todos los días del mes
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    
    const days: Date[] = []
    for (let i = 1; i <= lastDay; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }, [currentMonth])

  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const monthAbbrev = currentMonth.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()

  const handleAddVacation = (member: TeamMember, vacation: Vacation) => {
    const updatedMember = {
      ...member,
      vacations: [...(member.vacations || []), vacation]
    }
    onUpdateMember(updatedMember)
    setIsAddModalOpen(false)
    setEditingVacation(null)
  }

  const handleEditVacation = (member: TeamMember, vacation: Vacation) => {
    const updatedMember = {
      ...member,
      vacations: member.vacations?.map(v => v.id === vacation.id ? vacation : v) || []
    }
    onUpdateMember(updatedMember)
    setIsAddModalOpen(false)
    setEditingVacation(null)
  }

  const handleDeleteVacation = (member: TeamMember, vacationId: string) => {
    if (!confirm("¿Estás seguro de eliminar estas vacaciones?")) return
    
    const updatedMember = {
      ...member,
      vacations: member.vacations?.filter(v => v.id !== vacationId) || []
    }
    onUpdateMember(updatedMember)
  }

  const isDateInVacation = (date: Date, vacations: Vacation[] = []) => {
    return vacations.some(vacation => {
      const start = new Date(vacation.startDate)
      const end = new Date(vacation.endDate)
      return date >= start && date <= end
    })
  }

  const getVacationForDate = (date: Date, vacations: Vacation[] = []) => {
    return vacations.find(vacation => {
      const start = new Date(vacation.startDate)
      const end = new Date(vacation.endDate)
      return date >= start && date <= end
    })
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Calendario de Ausencias
            </CardTitle>
            <CardDescription className="mt-1">
              Gestiona y visualiza las vacaciones y licencias de tu equipo
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {/* Leyenda */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-200 to-purple-300" />
                <span className="text-muted-foreground">Vacaciones</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-amber-200 to-amber-300" />
                <span className="text-muted-foreground">Licencias</span>
              </div>
            </div>
            {/* Navigation */}
            <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center capitalize">
              {monthName}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-auto max-h-[600px]">
          <table className="w-full border-collapse">
            {/* Header con mes y días */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/80 backdrop-blur">
                <th className="sticky left-0 z-20 bg-muted/80 backdrop-blur border-r border-b p-2 font-semibold text-left min-w-[160px] w-[160px]">
                  Colaborador
                </th>
                {daysInMonth.map((day, index) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const isToday = day.toDateString() === new Date().toDateString()
                  return (
                    <th 
                      key={index}
                      className={`border-r border-b p-1 text-center w-[32px] min-w-[32px] max-w-[32px] ${
                        isWeekend ? 'bg-gray-200 dark:bg-gray-800' : 'bg-muted/80'
                      } ${isToday ? 'bg-blue-100 dark:bg-blue-950/50 ring-2 ring-blue-500 ring-inset' : ''} backdrop-blur`}
                    >
                      <div className="flex flex-col items-center">
                        <span className={`text-[9px] uppercase font-medium leading-tight ${
                          isWeekend ? 'text-gray-500 dark:text-gray-400' : 'text-muted-foreground'
                        }`}>
                          {day.toLocaleDateString('es-ES', { weekday: 'short' }).substring(0, 2)}
                        </span>
                        <span className={`text-xs font-semibold ${
                          isToday ? 'text-blue-600 dark:text-blue-400' : 
                          isWeekend ? 'text-gray-500 dark:text-gray-400' : ''
                        }`}>
                          {day.getDate()}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Filas por colaborador */}
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth.length + 1} className="text-center py-12 text-muted-foreground">
                    No hay miembros en el equipo
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.name} className="hover:bg-muted/20 transition-colors">
                    {/* Columna de colaborador */}
                    <td className="sticky left-0 z-10 bg-background border-r border-b p-2 group min-w-[160px] w-[160px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium truncate">{member.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 flex-shrink-0"
                          onClick={() => {
                            setSelectedMember(member)
                            setEditingVacation(null)
                            setIsAddModalOpen(true)
                          }}
                          title="Agregar ausencia"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>

                    {/* Celdas de días */}
                    {daysInMonth.map((day, dayIndex) => {
                      const isInVacation = isDateInVacation(day, member.vacations)
                      const vacation = getVacationForDate(day, member.vacations)
                      const isToday = day.toDateString() === new Date().toDateString()
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6
                      const isFirstDay = vacation && day.toDateString() === new Date(vacation.startDate).toDateString()
                      const isLastDay = vacation && day.toDateString() === new Date(vacation.endDate).toDateString()
                      
                      return (
                        <td 
                          key={dayIndex}
                          className={`border-r border-b p-0 relative w-[32px] min-w-[32px] max-w-[32px] ${
                            isWeekend ? 'bg-gray-100 dark:bg-gray-900/50' : 'bg-background'
                          } ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        >
                          {isInVacation && vacation ? (
                            <div 
                              className={`h-full min-h-[42px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity group/cell relative ${
                                vacation.type === 'license' 
                                  ? 'bg-gradient-to-r from-amber-200 to-amber-300' 
                                  : 'bg-gradient-to-r from-purple-200 to-purple-300'
                              }`}
                              onClick={() => {
                                setSelectedMember(member)
                                setEditingVacation(vacation)
                                setIsAddModalOpen(true)
                              }}
                              title={vacation.description || (vacation.type === 'license' ? 'Licencia' : 'Vacaciones')}
                            >
                              {/* Indicador visual en bordes redondeados */}
                              <div className={`absolute inset-0 ${
                                isFirstDay ? 'rounded-l-md' : ''
                              } ${
                                isLastDay ? 'rounded-r-md' : ''
                              } ${
                                vacation.type === 'license' 
                                  ? 'bg-gradient-to-r from-amber-200 to-amber-300' 
                                  : 'bg-gradient-to-r from-purple-200 to-purple-300'
                              }`} />
                              {/* Emoji indicador */}
                              {isFirstDay && (
                                <span className="text-[10px] relative z-10">
                                  {vacation.type === 'license' ? '📄' : '🏖️'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="h-full min-h-[42px]" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Modal para agregar/editar vacaciones */}
      {selectedMember && (
        <AddVacationModal
          open={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setSelectedMember(null)
            setEditingVacation(null)
          }}
          onSave={(vacation) => {
            if (editingVacation) {
              handleEditVacation(selectedMember, vacation)
            } else {
              handleAddVacation(selectedMember, vacation)
            }
          }}
          memberName={selectedMember.name}
          editingVacation={editingVacation}
        />
      )}
    </Card>
  )
}

