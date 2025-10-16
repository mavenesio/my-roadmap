"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RoadmapConfig } from "@/hooks/use-roadmap-config"
import { Edit3, Save, MessageSquare, Trash2, Pencil, Check, X, Info } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type Priority = "Milestone" | "1" | "2" | "3"
type Track = string
type Status =
  | "TODO"
  | "PREWORK"
  | "WIP"
  | "TESTING"
  | "LAST LAP"
  | "DONE"
  | "ROLLOUT"
  | "DISMISSED"
  | "ON HOLD"
type Size = "XS" | "S" | "M" | "L" | "XL"
type TaskType = "DEUDA TECNICA" | "CARRY OVER" | "EXTRA MILE" | "OVNI" | "POROTO"

interface Comment {
  id: string
  text: string
  createdAt: number
}

interface EditTaskModalProps {
  open: boolean
  task: {
    id: string
    name: string
    priority: Priority
    track: Track
    status: Status
    size: Size
    type: TaskType
    comments?: Comment[]
  }
  onClose: () => void
  onSave: (changes: {
    name?: string
    priority?: Priority
    track?: Track
    status?: Status
    size?: Size
    type?: TaskType
    comments?: Comment[]
  }) => void
  config: RoadmapConfig
}

export function EditTaskModal({ open, onClose, task, onSave, config }: EditTaskModalProps) {
  const [name, setName] = useState(task.name)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [track, setTrack] = useState<Track>(task.track)
  const [status, setStatus] = useState<Status>(task.status)
  const [size, setSize] = useState<Size>(task.size)
  const [type, setType] = useState<TaskType>(task.type)
  const [comments, setComments] = useState<Comment[]>(task.comments || [])
  const [newComment, setNewComment] = useState("")
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState("")
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setName(task.name)
    setPriority(task.priority)
    setTrack(task.track)
    setStatus(task.status)
    setSize(task.size)
    setType(task.type)
    setComments(task.comments || [])
  }, [task])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name: name.trim(), priority, track, status, size, type, comments })
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        createdAt: Date.now()
      }
      setComments([comment, ...comments])
      setNewComment("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleAddComment()
    }
  }

  const handleDeleteComment = (commentId: string) => {
    setComments(comments.filter(c => c.id !== commentId))
  }

  const handleEditComment = (commentId: string, text: string) => {
    setEditingCommentId(commentId)
    setEditingCommentText(text)
  }

  const handleSaveEditComment = (commentId: string) => {
    if (editingCommentText.trim()) {
      setComments(comments.map(c => 
        c.id === commentId ? { ...c, text: editingCommentText.trim() } : c
      ))
    }
    setEditingCommentId(null)
    setEditingCommentText("")
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditingCommentText("")
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Ahora"
    if (minutes < 60) return `Hace ${minutes}m`
    if (hours < 24) return `Hace ${hours}h`
    if (days < 7) return `Hace ${days}d`
    
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-3 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Edit3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Edit Task</DialogTitle>
                <DialogDescription className="text-base mt-1">
                  Update task details and properties
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-semibold">
                Task Name
              </Label>
              <Textarea
                id="name"
                placeholder="Describe the task in detail..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[110px] text-base resize-none focus-visible:ring-2"
                required
              />
            </div>

            {/* Priority and Track */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-base font-semibold">
                  Priority
                </Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                  <SelectTrigger id="priority" className="h-11 text-base w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.priorities.filter(p => p.name && p.name.trim()).map((p) => (
                      <SelectItem key={p.name} value={p.name} className="text-base">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="track" className="text-base font-semibold">
                  Track
                </Label>
                <Select value={track} onValueChange={(value) => setTrack(value as Track)}>
                  <SelectTrigger id="track" className="h-11 text-base w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.tracks.filter(t => t.name && t.name.trim()).map((t) => (
                      <SelectItem key={t.name} value={t.name} className="text-base">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status, Size, Type */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-semibold">
                  Status
                </Label>
                <Select value={status} onValueChange={(value) => setStatus(value as Status)}>
                  <SelectTrigger id="status" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.statuses.filter(s => s.name && s.name.trim()).map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-sm">{s.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size" className="text-sm font-semibold">
                  Size
                </Label>
                <Select value={size} onValueChange={(value) => setSize(value as Size)}>
                  <SelectTrigger id="size" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.sizes.filter(s => s && s.trim()).map((s) => (
                      <SelectItem key={s} value={s} className="text-sm">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-semibold">
                  Type
                </Label>
                <Select value={type} onValueChange={(value) => setType(value as TaskType)}>
                  <SelectTrigger id="type" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.types.filter(t => t.name && t.name.trim()).map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="text-sm">{t.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-3 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <Label className="text-base font-semibold">
                  Comentarios {comments.length > 0 && `(${comments.length})`}
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMarkdownHelp(!showMarkdownHelp)}
                className="h-7 px-2 text-xs"
              >
                <Info className="h-3.5 w-3.5 mr-1" />
                {showMarkdownHelp ? "Ocultar" : "Ayuda"} Markdown
              </Button>
            </div>

            {/* Markdown Help */}
            {showMarkdownHelp && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2 border border-border">
                <div className="font-semibold text-sm mb-2">Formato Markdown disponible:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><code className="bg-background px-1.5 py-0.5 rounded">**negrita**</code> → <strong>negrita</strong></div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded">*cursiva*</code> → <em>cursiva</em></div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded">~~tachado~~</code> → <del>tachado</del></div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded">`código`</code> → <code>código</code></div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded">- lista</code> → lista con viñetas</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded">[link](url)</code> → enlace</div>
                </div>
                <div className="text-muted-foreground pt-1 border-t">
                  Presiona <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Ctrl+Enter</kbd> o <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">⌘+Enter</kbd> para enviar
                </div>
              </div>
            )}

            {/* Input for new comment */}
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                placeholder="Escribe un comentario... (soporta Markdown)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyPress}
                className="min-h-[80px] text-sm resize-none focus-visible:ring-2"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Ctrl/⌘ + Enter para enviar
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="h-8"
                >
                  Agregar Comentario
                </Button>
              </div>
            </div>

            {/* Comments list */}
            {comments.length > 0 && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="group relative">
                    {editingCommentId === comment.id ? (
                      <div className="bg-muted/50 rounded-2xl p-4 border border-border">
                        <Textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault()
                              handleSaveEditComment(comment.id)
                            } else if (e.key === "Escape") {
                              handleCancelEdit()
                            }
                          }}
                          className="w-full min-h-[60px] text-sm mb-2 resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="h-7 px-2"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSaveEditComment(comment.id)}
                            className="h-7 px-2"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-primary/10 rounded-2xl rounded-tl-sm p-4 border border-primary/20">
                        <div className="text-sm text-foreground leading-relaxed break-words markdown-content">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {comment.text}
                          </ReactMarkdown>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditComment(comment.id, comment.text)}
                              className="h-6 w-6 p-0 hover:bg-primary/20"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
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
            )}

            {comments.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No hay comentarios aún. ¡Sé el primero en comentar!
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-6">
              Cancel
            </Button>
            <Button type="submit" className="h-10 px-8 gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


