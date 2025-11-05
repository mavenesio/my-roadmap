"use client"

import { useParams, useRouter } from "next/navigation"
import { useRoadmapConfig, type TeamMember as TeamMemberType, type Goal } from "@/hooks/use-roadmap-config"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft, Save, Plus, Trash2, CheckCircle, Circle, Briefcase, MessageSquare, Target, Calendar, Eye, Edit } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

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

interface Feedback {
  id: string
  text: string
  createdAt: number
  from?: string // Nombre de quien da el feedback
  seniority?: string // Puesto/Seniority
  team?: string // Equipo
  author?: string // Deprecated: mantener por compatibilidad
}

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const memberName = decodeURIComponent(params.memberName as string)
  const { config, updateTeamMember } = useRoadmapConfig()
  const [tasks] = useLocalStorage<Task[]>('roadmap-tasks', [])
  const [mounted, setMounted] = useState(false)

  // State para datos editables
  const [editedName, setEditedName] = useState(memberName)
  const [editedNationality, setEditedNationality] = useState<string>("none")
  const [editedSeniority, setEditedSeniority] = useState<string>("none")
  const [editedAvatarUrl, setEditedAvatarUrl] = useState<string>("")
  
  // State para feedbacks
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [newFeedback, setNewFeedback] = useState("")
  const [newFeedbackFrom, setNewFeedbackFrom] = useState("")
  const [newFeedbackSeniority, setNewFeedbackSeniority] = useState("")
  const [newFeedbackTeam, setNewFeedbackTeam] = useState("")
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  
  // State para objetivos
  const [goals, setGoals] = useState<Goal[]>([])
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  
  // Form state para nuevo/editar objetivo
  const [goalForm, setGoalForm] = useState({
    objective: "",
    expectations: "",
    deadline: "",
    experienceMapRelation: "",
    rating: "Meet" as "Below" | "Meet" | "Above",
    nextStep: "",
    justification: "",
    associatedTasks: [] as string[]
  })

  const member = useMemo(() => {
    return config?.teamMembers.find(m => m.name === memberName)
  }, [config, memberName])

  // Tareas asignadas al miembro - DEBE estar antes del return condicional
  const assignedTasks = useMemo(() => {
    return tasks.filter(task => 
      task.assignments.some(assignment => 
        assignment.assignees.includes(memberName)
      )
    )
  }, [tasks, memberName])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (member) {
      setEditedName(member.name)
      setEditedNationality(member.nationality || "none")
      setEditedSeniority(member.seniority || "none")
      setEditedAvatarUrl(member.avatarUrl || "")
      setFeedbacks(member.comments || [])
      setGoals(member.goals || [])
    }
  }, [member])

  // Show loading only while mounting
  if (!mounted || !config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Show not found only after mounted
  if (!member) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Miembro no encontrado</p>
          <Link href="/team">
            <Button variant="outline" className="mt-4">
              Volver al equipo
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleSaveMemberData = () => {
    const updates = {
      name: editedName,
      nationality: editedNationality === "none" ? undefined : editedNationality,
      seniority: editedSeniority === "none" ? undefined : editedSeniority,
      avatarUrl: editedAvatarUrl.trim() || undefined,
    }

    const success = updateTeamMember(memberName, updates)
    
    if (!success) {
      toast.error("Error", {
        description: "No se pudo actualizar el miembro",
        duration: 3000,
      })
      return
    }
    
    toast.success("Datos actualizados", {
      description: "Los datos del miembro han sido guardados",
      duration: 3000,
    })

    // Si el nombre cambió, redirigir a la nueva URL
    if (editedName !== memberName) {
      router.push(`/team/${encodeURIComponent(editedName)}`)
    }
  }

  const handleAddFeedback = () => {
    if (!newFeedback.trim()) return

    const feedback: Feedback = {
      id: Date.now().toString(),
      text: newFeedback.trim(),
      createdAt: Date.now(),
      from: newFeedbackFrom.trim() || undefined,
      seniority: newFeedbackSeniority.trim() || undefined,
      team: newFeedbackTeam.trim() || undefined,
    }

    const updatedFeedbacks = [...feedbacks, feedback]
    setFeedbacks(updatedFeedbacks)

    const success = updateTeamMember(memberName, {
      comments: updatedFeedbacks
    })
    
    if (!success) {
      toast.error("Error al agregar feedback")
      return
    }

    setNewFeedback("")
    setNewFeedbackFrom("")
    setNewFeedbackSeniority("")
    setNewFeedbackTeam("")
    setShowMarkdownPreview(false)
    
    toast.success("Feedback agregado")
  }

  const handleDeleteFeedback = (feedbackId: string) => {
    if (!confirm("¿Estás seguro de eliminar este feedback?")) return

    const updatedFeedbacks = feedbacks.filter(f => f.id !== feedbackId)
    setFeedbacks(updatedFeedbacks)

    const success = updateTeamMember(memberName, {
      comments: updatedFeedbacks
    })
    
    if (!success) {
      toast.error("Error al eliminar feedback")
      return
    }
    
    toast.success("Feedback eliminado")
  }

  const handleSaveGoal = () => {
    const goal: Goal = {
      id: editingGoal?.id || Date.now().toString(),
      description: goalForm.objective || "", // Usar objective como description por compatibilidad
      rating: goalForm.rating,
      extraMiles: goalForm.nextStep || "",
      track: "",
      completed: false,
      createdAt: editingGoal?.createdAt || Date.now(),
      objective: goalForm.objective,
      expectations: goalForm.expectations,
      deadline: goalForm.deadline,
      experienceMapRelation: goalForm.experienceMapRelation,
      nextStep: goalForm.nextStep,
      justification: goalForm.justification,
      associatedTasks: goalForm.associatedTasks,
    }

    let updatedGoals: Goal[]
    if (editingGoal) {
      updatedGoals = goals.map(g => g.id === editingGoal.id ? goal : g)
    } else {
      updatedGoals = [...goals, goal]
    }

    setGoals(updatedGoals)

    const success = updateTeamMember(memberName, {
      goals: updatedGoals
    })
    
    if (!success) {
      toast.error("Error al guardar objetivo")
      return
    }
    
    // Reset form
    setGoalForm({
      objective: "",
      expectations: "",
      deadline: "",
      experienceMapRelation: "",
      rating: "Meet",
      nextStep: "",
      justification: "",
      associatedTasks: []
    })
    setEditingGoal(null)
    setShowGoalForm(false)
    
    toast.success(editingGoal ? "Objetivo actualizado" : "Objetivo agregado")
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setGoalForm({
      objective: goal.objective || goal.description || "",
      expectations: goal.expectations || "",
      deadline: goal.deadline || "",
      experienceMapRelation: goal.experienceMapRelation || "",
      rating: goal.rating || "Meet",
      nextStep: goal.nextStep || goal.extraMiles || "",
      justification: goal.justification || "",
      associatedTasks: goal.associatedTasks || []
    })
    setShowGoalForm(true)
  }

  const handleDeleteGoal = (goalId: string) => {
    if (!confirm("¿Estás seguro de eliminar este objetivo?")) return

    const updatedGoals = goals.filter(g => g.id !== goalId)
    setGoals(updatedGoals)

    const success = updateTeamMember(memberName, {
      goals: updatedGoals
    })
    
    if (!success) {
      toast.error("Error al eliminar objetivo")
      return
    }
    
    toast.success("Objetivo eliminado")
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
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          <Link href="/team">
            <Button variant="outline" className="gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" /> Volver al Equipo
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {member.avatarUrl ? (
              <Avatar className="w-10 h-10">
                <AvatarImage src={member.avatarUrl} alt={member.name} />
                <AvatarFallback 
                  className="text-white font-semibold text-lg"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-lg"
              style={{ backgroundColor: member.color }}
            >
              {member.name.charAt(0).toUpperCase()}
            </div>
            )}
            <div>
              <h1 className="text-lg font-semibold">{member.name}</h1>
              {member.seniority && (
                <p className="text-sm text-muted-foreground">{member.seniority}</p>
              )}
            </div>
          </div>
          <div className="w-[140px]" /> {/* Spacer for balance */}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-6 space-y-4">
        {/* Datos del Usuario */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información Personal</CardTitle>
            <CardDescription className="text-sm">Edita los datos básicos del miembro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Avatar Preview */}
            <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                {editedAvatarUrl ? (
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={editedAvatarUrl} alt={editedName} />
                    <AvatarFallback 
                      className="text-white font-semibold text-xl"
                      style={{ backgroundColor: member.color }}
                    >
                      {editedName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl"
                    style={{ backgroundColor: member.color }}
                  >
                    {editedName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <Label htmlFor="avatarUrl" className="text-sm font-medium">Avatar URL</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">URL de la imagen del avatar (opcional)</p>
                  <Input
                    id="avatarUrl"
                    value={editedAvatarUrl}
                    onChange={(e) => setEditedAvatarUrl(e.target.value)}
                    placeholder="https://ejemplo.com/avatar.jpg"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm">Nombre</Label>
                <Input
                  id="name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Nombre del miembro"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nationality" className="text-sm">Nacionalidad</Label>
                <Select value={editedNationality} onValueChange={setEditedNationality}>
                  <SelectTrigger id="nationality" className="h-9">
                    <SelectValue placeholder="Seleccionar nacionalidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    <SelectItem value="Argentina">🇦🇷 Argentina</SelectItem>
                    <SelectItem value="Colombia">🇨🇴 Colombia</SelectItem>
                    <SelectItem value="Brasil">🇧🇷 Brasil</SelectItem>
                    <SelectItem value="Chile">🇨🇱 Chile</SelectItem>
                    <SelectItem value="México">🇲🇽 México</SelectItem>
                    <SelectItem value="Uruguay">🇺🇾 Uruguay</SelectItem>
                    <SelectItem value="Perú">🇵🇪 Perú</SelectItem>
                    <SelectItem value="Venezuela">🇻🇪 Venezuela</SelectItem>
                    <SelectItem value="España">🇪🇸 España</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seniority" className="text-sm">Seniority</Label>
                <Select value={editedSeniority} onValueChange={setEditedSeniority}>
                  <SelectTrigger id="seniority" className="h-9">
                    <SelectValue placeholder="Seleccionar seniority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    <SelectItem value="Trainee">Trainee</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Semi Senior">Semi Senior</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Tech Lead">Tech Lead</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Principal">Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex items-end">
                <Button onClick={handleSaveMemberData} className="gap-2 h-9 w-full" size="sm">
                  <Save className="h-3.5 w-3.5" />
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tareas Asignadas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Tareas Asignadas ({assignedTasks.length})
            </CardTitle>
            <CardDescription className="text-sm">Tareas activas en el roadmap</CardDescription>
          </CardHeader>
          <CardContent>
            {assignedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay tareas asignadas actualmente
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {assignedTasks.map(task => {
                  const getPriorityColor = () => {
                    const priority = config?.priorities.find(p => p.name === task.priority)
                    return priority?.color || "#6b7280"
                  }
                  
                  const getTrackColor = () => {
                    const track = config?.tracks.find(t => t.name === task.track)
                    return track?.color || "#6b7280"
                  }
                  
                  const getStatusColor = () => {
                    const status = config?.statuses.find(s => s.name === task.status)
                    return status?.color || "#6b7280"
                  }
                  
                  return (
                    <div
                      key={task.id}
                      className="flex flex-col p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <p className="font-medium text-sm line-clamp-2 mb-2 min-h-[40px]">{task.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        <Badge 
                          className="text-[10px] px-1.5 py-0 h-5 text-white" 
                          style={{ backgroundColor: getPriorityColor() }}
                        >
                          {task.priority}
                        </Badge>
                        <Badge 
                          className="text-[10px] px-1.5 py-0 h-5 text-white" 
                          style={{ backgroundColor: getTrackColor() }}
                        >
                          {task.track}
                        </Badge>
                        <Badge 
                          className="text-[10px] px-1.5 py-0 h-5 text-white" 
                          style={{ backgroundColor: getStatusColor() }}
                        >
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedbacks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Feedbacks ({feedbacks.length})
            </CardTitle>
            <CardDescription className="text-sm">Comentarios y feedback sobre el desempeño</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Agregar nuevo feedback */}
            <div className="space-y-3 p-4 rounded-md border bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="feedbackFrom" className="text-sm">From (Quién da el feedback)</Label>
                  <Input
                    id="feedbackFrom"
                    value={newFeedbackFrom}
                    onChange={(e) => setNewFeedbackFrom(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="feedbackSeniority" className="text-sm">Seniority</Label>
                  <Input
                    id="feedbackSeniority"
                    value={newFeedbackSeniority}
                    onChange={(e) => setNewFeedbackSeniority(e.target.value)}
                    placeholder="Ej: Senior Developer"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="feedbackTeam" className="text-sm">Team</Label>
                  <Input
                    id="feedbackTeam"
                    value={newFeedbackTeam}
                    onChange={(e) => setNewFeedbackTeam(e.target.value)}
                    placeholder="Ej: Engineering"
                    className="h-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="feedbackText" className="text-sm">Descripción (Markdown)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                  >
                    {showMarkdownPreview ? (
                      <>
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </>
                    )}
                  </Button>
                </div>
                
                {showMarkdownPreview ? (
                  <div className="min-h-[120px] p-3 rounded-md border bg-background markdown-content">
                    {newFeedback.trim() ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {newFeedback}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground italic">Sin contenido...</p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    id="feedbackText"
                    placeholder="Escribe el feedback usando markdown...&#10;&#10;**Negrita**, *cursiva*, [links](url)&#10;- Listas&#10;- Viñetas&#10;&#10;```code```"
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    className="min-h-[120px] text-sm font-mono"
                  />
                )}
              </div>
              
              <Button onClick={handleAddFeedback} className="gap-2 h-8" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Agregar Feedback
              </Button>
            </div>

            {/* Lista de feedbacks */}
            {feedbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                No hay feedbacks registrados
              </p>
            ) : (
              <div className="space-y-2">
                {feedbacks.map(feedback => (
                  <div
                    key={feedback.id}
                    className="p-4 rounded-md border bg-card group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Metadata del feedback */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {feedback.from && (
                            <span className="font-medium text-foreground">
                              De: {feedback.from}
                            </span>
                          )}
                          {feedback.seniority && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                              {feedback.seniority}
                            </Badge>
                          )}
                          {feedback.team && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                              {feedback.team}
                            </Badge>
                          )}
                          <span className="ml-auto">
                            {new Date(feedback.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        {/* Contenido del feedback en markdown */}
                        <div className="markdown-content">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {feedback.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0 shrink-0"
                        onClick={() => handleDeleteFeedback(feedback.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Objetivos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4" />
                  Objetivos ({goals.length})
                </CardTitle>
                <CardDescription className="text-sm">Define y gestiona los objetivos del miembro</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingGoal(null)
                  setGoalForm({
                    objective: "",
                    expectations: "",
                    deadline: "",
                    experienceMapRelation: "",
                    rating: "Meet",
                    nextStep: "",
                    justification: "",
                    associatedTasks: []
                  })
                  setShowGoalForm(true)
                }}
                className="gap-2 h-8"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo Objetivo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Formulario de objetivo */}
            {showGoalForm && (
              <div className="p-4 rounded-md border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    {editingGoal ? "Editar Objetivo" : "Nuevo Objetivo"}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => {
                      setShowGoalForm(false)
                      setEditingGoal(null)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="objective" className="text-sm">Objetivo *</Label>
                    <Textarea
                      id="objective"
                      value={goalForm.objective}
                      onChange={(e) => setGoalForm({ ...goalForm, objective: e.target.value })}
                      placeholder="Describe el objetivo principal..."
                      className="min-h-[60px] text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="expectations" className="text-sm">Expectativas *</Label>
                    <Textarea
                      id="expectations"
                      value={goalForm.expectations}
                      onChange={(e) => setGoalForm({ ...goalForm, expectations: e.target.value })}
                      placeholder="¿Qué se espera lograr?"
                      className="min-h-[60px] text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="deadline" className="text-sm">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={goalForm.deadline}
                      onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rating" className="text-sm">Nota Q *</Label>
                    <Select
                      value={goalForm.rating}
                      onValueChange={(value: "Below" | "Meet" | "Above") =>
                        setGoalForm({ ...goalForm, rating: value })
                      }
                    >
                      <SelectTrigger id="rating" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Below">Below Expectations</SelectItem>
                        <SelectItem value="Meet">Meet Expectations</SelectItem>
                        <SelectItem value="Above">Above Expectations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="experienceMapRelation" className="text-sm">Relación con Experience Map</Label>
                    <Textarea
                      id="experienceMapRelation"
                      value={goalForm.experienceMapRelation}
                      onChange={(e) => setGoalForm({ ...goalForm, experienceMapRelation: e.target.value })}
                      placeholder="¿Cómo se relaciona con el experience map?"
                      className="min-h-[50px] text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="nextStep" className="text-sm">Next Step</Label>
                    <Textarea
                      id="nextStep"
                      value={goalForm.nextStep}
                      onChange={(e) => setGoalForm({ ...goalForm, nextStep: e.target.value })}
                      placeholder="¿Cuál es el siguiente paso?"
                      className="min-h-[50px] text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="justification" className="text-sm">Justificación</Label>
                    <Textarea
                      id="justification"
                      value={goalForm.justification}
                      onChange={(e) => setGoalForm({ ...goalForm, justification: e.target.value })}
                      placeholder="Justifica el objetivo y la evaluación..."
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSaveGoal} className="gap-2 h-8" size="sm">
                    <Save className="h-3.5 w-3.5" />
                    {editingGoal ? "Actualizar" : "Guardar"} Objetivo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setShowGoalForm(false)
                      setEditingGoal(null)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Vista de tabla de objetivos */}
            {goals.length === 0 && !showGoalForm ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay objetivos definidos
              </p>
            ) : goals.length > 0 ? (
              <div className="rounded-md border overflow-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium text-xs">Objetivo</th>
                      <th className="text-left p-2 font-medium text-xs">Expectativas</th>
                      <th className="text-left p-2 font-medium text-xs">Deadline</th>
                      <th className="text-left p-2 font-medium text-xs">Nota Q</th>
                      <th className="text-left p-2 font-medium text-xs">Next Step</th>
                      <th className="text-center p-2 font-medium text-xs w-[80px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map(goal => (
                      <tr key={goal.id} className="border-t hover:bg-muted/20">
                        <td className="p-2 text-xs max-w-[200px]">
                          <p className="line-clamp-2">{goal.objective || goal.description}</p>
                        </td>
                        <td className="p-2 text-xs max-w-[200px]">
                          <p className="line-clamp-2">{goal.expectations || "-"}</p>
                        </td>
                        <td className="p-2 text-xs">
                          {goal.deadline ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(goal.deadline).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-2">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 h-5 ${
                              goal.rating === "Above"
                                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : goal.rating === "Below"
                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                : ""
                            }`}
                          >
                            {goal.rating || "Meet"}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs max-w-[180px]">
                          <p className="line-clamp-2">{goal.nextStep || goal.extraMiles || "-"}</p>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditGoal(goal)}
                              className="h-7 w-7 p-0"
                            >
                              <Target className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

