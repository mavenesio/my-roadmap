"use client"

import { useRoadmapConfig, type TeamMember as TeamMemberType } from "@/hooks/use-roadmap-config"
import { useState, useEffect } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, UserPlus, Users, Pencil, Trash2, MessageSquare, Briefcase, Target, Edit2 } from "lucide-react"
import { AddTeamMemberModal } from "@/components/add-team-member-modal"
import { EditTeamMemberDrawer } from "@/components/edit-team-member-drawer"
import { MemberGoalsDrawer } from "@/components/member-goals-drawer"
import { VacationsTimeline } from "@/components/vacations-timeline"
import { toast } from "sonner"

interface WeekAssignment {
  weekId: string
  assignees: string[]
}

interface Task {
  id: string
  name: string
  priority: string
  track: string
  status: string
  assignments: WeekAssignment[]
}

export default function TeamPage() {
  const router = useRouter()
  const { config, updateConfig } = useRoadmapConfig()
  const [members, setMembers] = useState<TeamMemberType[]>(config?.teamMembers || [])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [isGoalsDrawerOpen, setIsGoalsDrawerOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMemberType | null>(null)
  const [selectedMemberForGoals, setSelectedMemberForGoals] = useState<TeamMemberType | null>(null)
  const [tasks] = useLocalStorage<Task[]>('roadmap-tasks', [])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !config) return null

  const handleAddMember = (member: TeamMemberType) => {
    const updatedMembers = [...members, member]
    setMembers(updatedMembers)
    updateConfig({ teamMembers: updatedMembers })
    toast.success("Miembro agregado", {
      description: `${member.name} ha sido agregado al equipo`,
      duration: 3000,
    })
  }

  const handleEditMember = (oldMember: TeamMemberType, newMember: TeamMemberType) => {
    const updatedMembers = members.map(m => 
      m.name === oldMember.name ? newMember : m
    )
    setMembers(updatedMembers)
    updateConfig({ teamMembers: updatedMembers })
    toast.success("Miembro actualizado", {
      description: `Los datos de ${newMember.name} han sido actualizados`,
      duration: 3000,
    })
    setIsEditDrawerOpen(false)
    setEditingMember(null)
  }

  const handleUpdateMemberGoals = (updatedMember: TeamMemberType) => {
    const updatedMembers = members.map(m => 
      m.name === updatedMember.name ? updatedMember : m
    )
    setMembers(updatedMembers)
    updateConfig({ teamMembers: updatedMembers })
    toast.success("Objetivos actualizados", {
      description: `Los objetivos de ${updatedMember.name} han sido guardados`,
      duration: 3000,
    })
    setIsGoalsDrawerOpen(false)
    setSelectedMemberForGoals(null)
  }

  const handleDeleteMember = (member: TeamMemberType) => {
    if (!confirm(`¿Estás seguro de eliminar a ${member.name} del equipo?`)) return
    
    const updatedMembers = members.filter(m => m.name !== member.name)
    setMembers(updatedMembers)
    updateConfig({ teamMembers: updatedMembers })
    toast.success("Miembro eliminado", {
      description: `${member.name} ha sido eliminado del equipo`,
      duration: 3000,
    })
  }

  const getFlagEmoji = (nationality: string) => {
    const flags: Record<string, string> = {
      'Argentina': '🇦🇷',
      'Colombia': '🇨🇴',
      'Brasil': '🇧🇷',
      'Chile': '🇨🇱',
      'México': '🇲🇽',
      'Uruguay': '🇺🇾',
      'Perú': '🇵🇪',
      'Venezuela': '🇻🇪',
      'España': '🇪🇸',
    }
    return flags[nationality] || '🌍'
  }

  // Contar tareas por colaborador
  const getTaskCountForMember = (memberName: string) => {
    return tasks.filter(task => 
      task.assignments.some(assignment => 
        assignment.assignees.some(assignee => assignee === memberName)
      )
    ).length
  }

  // Contar objetivos y progreso
  const getGoalsStatsForMember = (member: TeamMemberType) => {
    const goals = member.goals || []
    const totalGoals = goals.length
    const completedGoals = goals.filter(g => g.completed).length
    const percentage = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
    return { totalGoals, completedGoals, percentage }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Link href="/">
            <Button variant="outline" className="gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span className="text-lg font-semibold">Mi Equipo</span>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingMember(null)
              setIsAddModalOpen(true)
            }}
          >
            <UserPlus className="h-4 w-4" /> Agregar Miembro
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Miembros del Equipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Miembros del Equipo
            </CardTitle>
            <CardDescription>
              Gestiona los colaboradores de tu equipo. Haz clic en un miembro para ver más detalles y agregar comentarios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No hay miembros en el equipo
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Comienza agregando tu primer colaborador
                </p>
                <Button
                  onClick={() => {
                    setEditingMember(null)
                    setIsAddModalOpen(true)
                  }}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" /> Agregar Primer Miembro
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {members.map((member: TeamMemberType) => {
                  const taskCount = getTaskCountForMember(member.name)
                  const commentCount = member.comments?.length || 0
                  const { totalGoals, completedGoals, percentage } = getGoalsStatsForMember(member)
                  
                  return (
                    <div 
                      key={member.name} 
                      className="flex flex-col p-5 rounded-lg border bg-card hover:bg-accent/50 transition-colors group relative"
                    >
                      {/* Botón de eliminar en la esquina */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteMember(member)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      {/* Avatar y nombre */}
                      <div 
                        className="flex flex-col items-center text-center cursor-pointer mb-4"
                        onClick={() => {
                          setEditingMember(member)
                          setIsEditDrawerOpen(true)
                        }}
                      >
                        <div
                          className="w-20 h-20 rounded-full flex items-center justify-center text-white font-semibold text-2xl mb-3"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{member.name}</h3>
                          {member.nationality && (
                            <span className="text-xl">{getFlagEmoji(member.nationality)}</span>
                          )}
                        </div>
                        {member.seniority && (
                          <p className="text-sm text-muted-foreground">{member.seniority}</p>
                        )}
                      </div>

                      {/* Badges de info */}
                      <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                        {taskCount > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Briefcase className="h-3 w-3" />
                            {taskCount}
                          </Badge>
                        )}
                        {commentCount > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {commentCount}
                          </Badge>
                        )}
                        {totalGoals > 0 && (
                          <Badge 
                            variant="secondary" 
                            className={`gap-1 ${
                              percentage === 100 
                                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' 
                                : percentage >= 50 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : ''
                            }`}
                          >
                            <Target className="h-3 w-3" />
                            {completedGoals}/{totalGoals}
                          </Badge>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedMemberForGoals(member)
                            setIsGoalsDrawerOpen(true)
                          }}
                        >
                          <Target className="h-4 w-4" />
                          Goals
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/team/${encodeURIComponent(member.name)}`)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline de Vacaciones */}
        <VacationsTimeline 
          members={members}
          onUpdateMember={(updatedMember) => {
            const updatedMembers = members.map(m => 
              m.name === updatedMember.name ? updatedMember : m
            )
            setMembers(updatedMembers)
            updateConfig({ teamMembers: updatedMembers })
          }}
        />
      </div>

      {/* Add Member Modal */}
      <AddTeamMemberModal
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingMember(null)
        }}
        onSave={(member: TeamMemberType) => {
          handleAddMember(member)
          setIsAddModalOpen(false)
          setEditingMember(null)
        }}
        editingMember={null}
        existingMembers={members}
      />

      {/* Edit Member Drawer */}
      <EditTeamMemberDrawer
        open={isEditDrawerOpen}
        member={editingMember}
        onClose={() => {
          setIsEditDrawerOpen(false)
          setEditingMember(null)
        }}
        onSave={(updatedMember: TeamMemberType) => {
          if (editingMember) {
            handleEditMember(editingMember, updatedMember)
          }
        }}
        direction="left"
        tasks={tasks}
      />

      {/* Member Goals Drawer */}
      <MemberGoalsDrawer
        open={isGoalsDrawerOpen}
        member={selectedMemberForGoals}
        onClose={() => {
          setIsGoalsDrawerOpen(false)
          setSelectedMemberForGoals(null)
        }}
        onSave={handleUpdateMemberGoals}
        tasks={tasks}
        tracks={config.tracks}
      />
    </div>
  )
}

