"use client"

import { useRoadmapConfig, type TeamMember as TeamMemberType } from "@/hooks/use-roadmap-config"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, UserPlus, Users, Trash2, Edit, Target } from "lucide-react"
import { AddTeamMemberModal } from "@/components/add-team-member-modal"
import { VacationsTimeline } from "@/components/vacations-timeline"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

export default function TeamPage() {
  const router = useRouter()
  const { config, addTeamMember, updateTeamMember, removeTeamMember } = useRoadmapConfig()
  const members = useMemo(() => config?.teamMembers || [], [config?.teamMembers])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !config) return null

  const handleAddMember = (member: TeamMemberType) => {
    const success = addTeamMember(member)
    if (!success) {
      toast.error("Error", {
        description: `El miembro ${member.name} ya existe`,
        duration: 3000,
      })
      return
    }
    toast.success("Miembro agregado", {
      description: `${member.name} ha sido agregado al equipo`,
      duration: 3000,
    })
  }

  const handleDeleteMember = (member: TeamMemberType) => {
    if (!confirm(`¿Estás seguro de eliminar a ${member.name} del equipo?`)) return
    
    removeTeamMember(member.name)
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
            onClick={() => setIsAddModalOpen(true)}
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
                  onClick={() => setIsAddModalOpen(true)}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" /> Agregar Primer Miembro
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {members.map((member: TeamMemberType) => {
                  return (
                    <div 
                      key={member.name} 
                      className="flex flex-col p-5 rounded-lg border bg-card hover:bg-accent/50 transition-colors group relative min-h-[280px]"
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
                        className="flex flex-col items-center text-center cursor-pointer mb-4 flex-1"
                        onClick={() => router.push(`/team/${encodeURIComponent(member.name)}`)}
                      >
                        {member.avatarUrl ? (
                          <Avatar className="w-20 h-20 mb-3">
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                            <AvatarFallback 
                              className="text-white font-semibold text-2xl"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div
                            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-semibold text-2xl mb-3"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
                          <h3 className="font-semibold text-lg">{member.name}</h3>
                          {member.nationality && (
                            <span className="text-xl">{getFlagEmoji(member.nationality)}</span>
                          )}
                        </div>
                        {member.seniority && (
                          <p className="text-sm text-muted-foreground">{member.seniority}</p>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-2 w-full shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 flex-1 min-w-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/team/${encodeURIComponent(member.name)}`)
                          }}
                        >
                          <Edit className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Editar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 flex-1 min-w-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/team/${encodeURIComponent(member.name)}?tab=metrics`)
                          }}
                        >
                          <Target className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Métricas</span>
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
            updateTeamMember(updatedMember.name, {
              vacations: updatedMember.vacations
            })
          }}
        />
      </div>

      {/* Add Member Modal */}
      <AddTeamMemberModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(member: TeamMemberType) => {
          handleAddMember(member)
          setIsAddModalOpen(false)
        }}
        editingMember={null}
        existingMembers={members}
      />
    </div>
  )
}

