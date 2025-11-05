"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, MessageSquare, Trash2, Pencil, Check, X, Info, Briefcase } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Comment {
  id: string
  text: string
  createdAt: number
}

export interface TeamMember {
  name: string
  color: string
  nationality?: string
  seniority?: string
  vacations?: any[]
  comments?: Comment[]
}

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

interface EditTeamMemberDrawerProps {
  open: boolean
  member: TeamMember | null
  onClose: () => void
  onSave: (member: TeamMember) => void
  direction?: "left" | "right"
  tasks?: Task[]
}

export function EditTeamMemberDrawer({ 
  open, 
  onClose, 
  member, 
  onSave, 
  direction = "left",
  tasks = []
}: EditTeamMemberDrawerProps) {
  const [name, setName] = useState(member?.name || "")
  const [color, setColor] = useState(member?.color || "#3b82f6")
  const [nationality, setNationality] = useState(member?.nationality || undefined)
  const [seniority, setSeniority] = useState(member?.seniority || undefined)
  const [comments, setComments] = useState<Comment[]>(member?.comments || [])
  const [newComment, setNewComment] = useState("")
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState("")
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (member) {
      setName(member.name)
      setColor(member.color)
      setNationality(member.nationality || "")
      setSeniority(member.seniority || "")
      setComments(member.comments || [])
    }
  }, [member])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return
    
    onSave({
      ...member,
      name: name.trim(),
      color,
      nationality: nationality.trim() || undefined,
      seniority: seniority.trim() || undefined,
      comments,
    })
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment.trim(),
      createdAt: Date.now(),
    }

    setComments([...comments, comment])
    setNewComment("")
    
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  const handleDeleteComment = (commentId: string) => {
    setComments(comments.filter(c => c.id !== commentId))
  }

  const handleEditComment = (commentId: string) => {
    const comment = comments.find(c => c.id === commentId)
    if (comment) {
      setEditingCommentId(commentId)
      setEditingCommentText(comment.text)
    }
  }

  const handleSaveEditComment = (commentId: string) => {
    if (!editingCommentText.trim()) return
    
    setComments(comments.map(c => 
      c.id === commentId 
        ? { ...c, text: editingCommentText.trim() }
        : c
    ))
    setEditingCommentId(null)
    setEditingCommentText("")
  }

  const handleCancelEditComment = () => {
    setEditingCommentId(null)
    setEditingCommentText("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      handleAddComment()
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  // Filtrar las tareas donde el miembro está involucrado
  const memberTasks = tasks.filter(task => 
    task.assignments.some(assignment => 
      assignment.assignees.some(assignee => assignee === member?.name)
    )
  )

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "TODO": "bg-gray-500",
      "PREWORK": "bg-slate-600",
      "WIP": "bg-blue-500",
      "TESTING": "bg-purple-500",
      "LAST LAP": "bg-amber-500",
      "DONE": "bg-green-500",
      "ROLLOUT": "bg-cyan-500",
      "DISMISSED": "bg-red-500",
      "ON HOLD": "bg-gray-600",
    }
    return colors[status] || "bg-gray-500"
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

  if (!member) return null

  return (
    <Drawer open={open} onOpenChange={onClose} direction={direction} dismissible={false} modal={true}>
      <DrawerContent
        className={`${
          direction === "left" ? "left-0" : "right-0"
        } h-full w-[600px] overflow-hidden flex flex-col`}
      >
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <DrawerHeader className="border-b px-8 py-6 flex-shrink-0">
            <DrawerTitle className="text-2xl">Editar Colaborador</DrawerTitle>
            <DrawerDescription className="text-base mt-1">
              Actualiza la información del miembro del equipo
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            {/* Información básica */}
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white font-semibold text-3xl"
                    style={{ backgroundColor: color }}
                  >
                    {name.charAt(0).toUpperCase() || "?"}
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-16 h-8 rounded cursor-pointer"
                    title="Cambiar color"
                  />
                </div>

                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base font-semibold">
                      Nombre <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nombre del colaborador"
                      className="h-11 text-base"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nationality" className="text-base font-semibold">
                        Nacionalidad
                      </Label>
                      <Select value={nationality || "none"} onValueChange={(val) => setNationality(val === "none" ? undefined : val)}>
                        <SelectTrigger id="nationality" className="h-11 text-base">
                          <SelectValue placeholder="Seleccionar nacionalidad..." />
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

                    <div className="space-y-2">
                      <Label htmlFor="seniority" className="text-base font-semibold">
                        Seniority
                      </Label>
                      <Select value={seniority || "none"} onValueChange={(val) => setSeniority(val === "none" ? undefined : val)}>
                        <SelectTrigger id="seniority" className="h-11 text-base">
                          <SelectValue placeholder="Seleccionar seniority..." />
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
                  </div>
                </div>
              </div>
            </div>

            {/* Tareas involucradas */}
            {memberTasks.length > 0 && (
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Tareas Asignadas</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {memberTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {memberTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Badge className={`${getStatusColor(task.status)} text-white`}>
                          {task.status}
                        </Badge>
                        <span className="font-medium truncate">{task.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {task.track}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          P{task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sección de comentarios */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Comentarios</h3>
                  {comments.length > 0 && (
                    <Badge variant="secondary">{comments.length}</Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMarkdownHelp(!showMarkdownHelp)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-3 w-3 mr-1" />
                  Markdown
                </Button>
              </div>

              {showMarkdownHelp && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
                  <p><strong>**negrita**</strong> - texto en negrita</p>
                  <p><em>*cursiva*</em> - texto en cursiva</p>
                  <p><code>`código`</code> - código inline</p>
                  <p>- Lista con guiones</p>
                  <p>[texto](url) - enlaces</p>
                </div>
              )}

              {/* Lista de comentarios */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay comentarios aún. Agrega el primero.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-muted/30 rounded-lg p-4 space-y-2 group hover:bg-muted/50 transition-colors"
                    >
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="min-h-[80px] text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveEditComment(comment.id)}
                              className="gap-1"
                            >
                              <Check className="h-3 w-3" /> Guardar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditComment}
                              className="gap-1"
                            >
                              <X className="h-3 w-3" /> Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {comment.text}
                            </ReactMarkdown>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatDate(comment.createdAt)}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditComment(comment.id)}
                                className="h-6 px-2"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="h-6 px-2 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Agregar nuevo comentario */}
              <div className="space-y-2 pt-2 border-t">
                <Textarea
                  ref={textareaRef}
                  placeholder="Escribe un comentario... (⌘+Enter para enviar)"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[100px] resize-none text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="gap-2"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Agregar Comentario
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t px-8 py-6 flex-shrink-0">
            <div className="flex gap-3">
              <Button type="submit" className="flex-1 h-11 text-base gap-2">
                <Save className="h-4 w-4" />
                Guardar Cambios
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 h-11 text-base"
                onClick={onClose}
              >
                Cancelar
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

