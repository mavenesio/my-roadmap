"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, Plus, Trash2, Check, X, Briefcase, Pencil, Save, TrendingDown, Minus, TrendingUp } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type GoalRating = "Below" | "Meet" | "Above"

interface Goal {
  id: string
  description: string
  rating?: GoalRating // Opcional
  extraMiles: string
  track: string
  completed: boolean
  createdAt: number
}

export interface TeamMember {
  name: string
  color: string
  nationality?: string
  seniority?: string
  goals?: Goal[]
}

interface Task {
  id: string
  name: string
  priority: string
  track: string
  status: string
  weeks: Array<{ weekId: string; assignees: string[] }>
}

interface Track {
  name: string
  color: string
}

interface MemberGoalsDrawerProps {
  open: boolean
  member: TeamMember | null
  onClose: () => void
  onSave: (member: TeamMember) => void
  tasks: Task[]
  tracks: Track[]
}

export function MemberGoalsDrawer({ 
  open, 
  onClose, 
  member, 
  onSave,
  tasks,
  tracks
}: MemberGoalsDrawerProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [newGoalDescription, setNewGoalDescription] = useState("")
  const [newGoalRating, setNewGoalRating] = useState<GoalRating | undefined>(undefined)
  const [newGoalExtraMiles, setNewGoalExtraMiles] = useState("")
  const [newGoalTrack, setNewGoalTrack] = useState<string>("")
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editingGoalData, setEditingGoalData] = useState<Goal | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (member && open) {
      setGoals(member.goals || [])
    }
  }, [member, open])

  if (!member) return null

  // Filtrar las tareas donde el miembro está involucrado
  const memberTasks = tasks.filter(task => 
    task.weeks.some(week => 
      week.assignees.some(assignee => assignee === member.name)
    )
  )

  const handleAddGoal = () => {
    if (!newGoalDescription.trim() || !newGoalTrack) return

    const newGoal: Goal = {
      id: Date.now().toString(),
      description: newGoalDescription.trim(),
      rating: newGoalRating,
      extraMiles: newGoalExtraMiles.trim(),
      track: newGoalTrack,
      completed: false,
      createdAt: Date.now(),
    }

    const updatedGoals = [...goals, newGoal]
    setGoals(updatedGoals)
    setNewGoalDescription("")
    setNewGoalRating(undefined)
    setNewGoalExtraMiles("")
    setNewGoalTrack("")
  }

  const handleStartEdit = (goal: Goal) => {
    setEditingGoalId(goal.id)
    setEditingGoalData({ ...goal })
  }

  const handleSaveEdit = () => {
    if (!editingGoalData || !editingGoalData.description.trim()) return

    const updatedGoals = goals.map(g =>
      g.id === editingGoalId ? editingGoalData : g
    )
    setGoals(updatedGoals)
    setEditingGoalId(null)
    setEditingGoalData(null)
  }

  const handleCancelEdit = () => {
    setEditingGoalId(null)
    setEditingGoalData(null)
  }

  const handleToggleGoal = (goalId: string) => {
    const updatedGoals = goals.map(g => 
      g.id === goalId 
        ? { ...g, completed: !g.completed }
        : g
    )
    setGoals(updatedGoals)
  }

  const handleDeleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter(g => g.id !== goalId)
    setGoals(updatedGoals)
  }

  const handleSave = () => {
    if (!member) return
    
    onSave({
      ...member,
      goals,
    })
  }

  const getTrackColor = (trackName: string) => {
    const track = tracks.find(t => t.name === trackName)
    return track?.color || "#3b82f6"
  }

  const getRatingIcon = (rating: GoalRating) => {
    switch (rating) {
      case "Below": return <TrendingDown className="h-4 w-4 text-red-500" />
      case "Meet": return <Minus className="h-4 w-4 text-amber-500" />
      case "Above": return <TrendingUp className="h-4 w-4 text-green-500" />
    }
  }

  const getRatingBadgeColor = (rating: GoalRating) => {
    switch (rating) {
      case "Below": return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      case "Meet": return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      case "Above": return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    }
  }

  // Agrupar objetivos por track
  const goalsByTrack = tracks.map(track => ({
    track,
    goals: goals.filter(g => g.track === track.name)
  })).filter(item => item.goals.length > 0)

  const completedGoalsCount = goals.filter(g => g.completed).length
  const totalGoalsCount = goals.length
  const completionPercentage = totalGoalsCount > 0 
    ? Math.round((completedGoalsCount / totalGoalsCount) * 100) 
    : 0

  return (
    <Drawer open={open} onOpenChange={onClose} direction="right">
      <DrawerContent
        className="right-0 h-full w-[800px] overflow-hidden flex flex-col"
      >
        <DrawerHeader className="border-b px-8 py-6 flex-shrink-0">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-2xl flex-shrink-0"
              style={{ backgroundColor: member.color }}
            >
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <DrawerTitle className="text-2xl flex items-center gap-2">
                <Target className="h-6 w-6" />
                Objetivos de {member.name}
              </DrawerTitle>
              <DrawerDescription className="text-base mt-1">
                Define y rastrea los objetivos por track
              </DrawerDescription>
              {totalGoalsCount > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-green-500 h-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {completedGoalsCount}/{totalGoalsCount} ({completionPercentage}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Objetivos agrupados por track */}
          {goalsByTrack.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Objetivos por Track
              </h3>
              {goalsByTrack.map(({ track, goals: trackGoals }) => (
                <Card key={track.name}>
                  <CardContent className="pt-4">
                    {/* Header del track */}
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: track.color }}
                      />
                      <span className="font-semibold text-lg">{track.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {trackGoals.length} {trackGoals.length === 1 ? 'objetivo' : 'objetivos'}
                      </Badge>
                    </div>

                    {/* Lista de objetivos */}
                    <div className="space-y-3">
                      {trackGoals.map((goal) => (
                        <div
                          key={goal.id}
                          className={`rounded-lg border p-4 ${
                            goal.completed 
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' 
                              : 'bg-muted/30'
                          } group transition-colors`}
                        >
                          {editingGoalId === goal.id && editingGoalData ? (
                            /* Modo edición */
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold">Descripción</Label>
                                <Textarea
                                  value={editingGoalData.description}
                                  onChange={(e) => setEditingGoalData({ ...editingGoalData, description: e.target.value })}
                                  className="min-h-[80px] text-sm"
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold">Rating</Label>
                                  <Select
                                    value={editingGoalData.rating || "none"}
                                    onValueChange={(value) => setEditingGoalData({ ...editingGoalData, rating: value === "none" ? undefined : value as GoalRating })}
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Sin rating" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Sin rating</span>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="Below">
                                        <div className="flex items-center gap-2">
                                          <TrendingDown className="h-3 w-3 text-red-500" />
                                          Below
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="Meet">
                                        <div className="flex items-center gap-2">
                                          <Minus className="h-3 w-3 text-amber-500" />
                                          Meet
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="Above">
                                        <div className="flex items-center gap-2">
                                          <TrendingUp className="h-3 w-3 text-green-500" />
                                          Above
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold">Track</Label>
                                  <Select
                                    value={editingGoalData.track}
                                    onValueChange={(value) => setEditingGoalData({ ...editingGoalData, track: value })}
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {tracks.map((t) => (
                                        <SelectItem key={t.name} value={t.name}>
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                                            {t.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm font-semibold">Extra Miles</Label>
                                <Textarea
                                  value={editingGoalData.extraMiles}
                                  onChange={(e) => setEditingGoalData({ ...editingGoalData, extraMiles: e.target.value })}
                                  placeholder="Información adicional..."
                                  className="min-h-[60px] text-sm"
                                />
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  className="gap-1"
                                >
                                  <Save className="h-3 w-3" /> Guardar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  className="gap-1"
                                >
                                  <X className="h-3 w-3" /> Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* Modo visualización */
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleGoal(goal.id)}
                                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                    goal.completed
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-muted-foreground hover:border-green-500'
                                  }`}
                                >
                                  {goal.completed && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className={`prose prose-sm dark:prose-invert max-w-none mb-2 ${
                                    goal.completed ? 'line-through opacity-60' : ''
                                  }`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {goal.description}
                                    </ReactMarkdown>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {goal.rating && (
                                      <Badge className={`gap-1 ${getRatingBadgeColor(goal.rating)}`}>
                                        {getRatingIcon(goal.rating)}
                                        {goal.rating}
                                      </Badge>
                                    )}
                                    {goal.extraMiles && (
                                      <Badge variant="outline" className="gap-1">
                                        Extra: {goal.extraMiles}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStartEdit(goal)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteGoal(goal.id)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Lista vacía */}
          {goals.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No hay objetivos definidos
              </p>
              <p className="text-sm text-muted-foreground">
                Agrega el primer objetivo para {member.name}
              </p>
            </div>
          )}

          {/* Agregar nuevo objetivo */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Agregar Nuevo Objetivo
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-description" className="text-base font-semibold">
                  Descripción <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  ref={textareaRef}
                  id="goal-description"
                  placeholder="Describe el objetivo... (soporta Markdown)"
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  className="min-h-[100px] resize-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-rating" className="text-base font-semibold">
                    Rating
                  </Label>
                  <div className="flex gap-2">
                    <Select value={newGoalRating || "none"} onValueChange={(value) => setNewGoalRating(value === "none" ? undefined : value as GoalRating)}>
                      <SelectTrigger id="goal-rating" className="h-11 flex-1">
                        <SelectValue placeholder="Sin rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Sin rating</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Below">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            Below
                          </div>
                        </SelectItem>
                        <SelectItem value="Meet">
                          <div className="flex items-center gap-2">
                            <Minus className="h-4 w-4 text-amber-500" />
                            Meet
                          </div>
                        </SelectItem>
                        <SelectItem value="Above">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Above
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {newGoalRating && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewGoalRating(undefined)}
                        className="h-11 px-3"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-track" className="text-base font-semibold">
                    Track <span className="text-destructive">*</span>
                  </Label>
                  <Select value={newGoalTrack} onValueChange={setNewGoalTrack}>
                    <SelectTrigger id="goal-track" className="h-11">
                      <SelectValue placeholder="Selecciona un track" />
                    </SelectTrigger>
                    <SelectContent>
                      {tracks.map((track) => (
                        <SelectItem key={track.name} value={track.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: track.color }} />
                            {track.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-extra-miles" className="text-base font-semibold">
                  Extra Miles
                </Label>
                <Textarea
                  id="goal-extra-miles"
                  placeholder="Información adicional sobre el objetivo..."
                  value={newGoalExtraMiles}
                  onChange={(e) => setNewGoalExtraMiles(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>

              <Button
                type="button"
                onClick={handleAddGoal}
                disabled={!newGoalDescription.trim() || !newGoalTrack}
                className="w-full gap-2 h-11"
              >
                <Plus className="h-4 w-4" />
                Agregar Objetivo
              </Button>
            </div>
          </div>

          {/* Información de tareas */}
          {memberTasks.length > 0 && (
            <div className="pt-6 border-t">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Tareas Asignadas ({memberTasks.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {memberTasks.map((task) => (
                  <Badge key={task.id} variant="outline" className="text-xs">
                    {task.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t px-8 py-6 flex-shrink-0">
          <div className="flex gap-3">
            <Button 
              onClick={handleSave} 
              className="flex-1 h-11 text-base gap-2"
            >
              <Check className="h-4 w-4" />
              Guardar Cambios
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="flex-1 h-11 text-base">
                Cancelar
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
