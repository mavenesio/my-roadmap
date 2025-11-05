"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Sparkles } from "lucide-react"
import { RoadmapConfig } from "@/hooks/use-roadmap-config"
import { Badge } from "@/components/ui/badge"

type Priority = "Milestone" | "1" | "2" | "3"
type Track = "Swiper" | "TM" | "Guardians"

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

interface AddTaskModalProps {
  config: RoadmapConfig
  onAddTask: (task: {
    name: string
    priority: Priority
    track: Track
    status: Status
    size: Size
    type: TaskType
  }) => void
}

export function AddTaskModal({ config, onAddTask }: AddTaskModalProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [priority, setPriority] = useState<Priority>(
    (config.defaults?.priority || config.priorities[0]?.name) as Priority || "Milestone"
  )
  const [track, setTrack] = useState<Track>(
    (config.defaults?.track || config.tracks[0]?.name) as Track || "Swiper"
  )
  const [status, setStatus] = useState<Status>(
    (config.defaults?.status || config.statuses[0]?.name) as Status || "TODO"
  )
  const [size, setSize] = useState<Size>(
    (config.defaults?.size || config.sizes[0]) as Size || "S"
  )
  const [type, setType] = useState<TaskType>(
    (config.defaults?.type || config.types[0]?.name) as TaskType || "POROTO"
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onAddTask({
        name: name.trim(),
        priority,
        track,
        status,
        size,
        type,
      })
      setName("")
      setPriority((config.defaults?.priority || config.priorities[0]?.name) as Priority || "Milestone")
      setTrack((config.defaults?.track || config.tracks[0]?.name) as Track || "Swiper")
      setStatus((config.defaults?.status || config.statuses[0]?.name) as Status || "TODO")
      setSize((config.defaults?.size || config.sizes[0]) as Size || "S")
      setType((config.defaults?.type || config.types[0]?.name) as TaskType || "POROTO")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="bg-white dark:bg-slate-950">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-3 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Add New Task</DialogTitle>
                <DialogDescription className="text-base mt-1">
                  Create a new task for the team roadmap
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

          <DialogFooter className="gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 px-6">
              Cancel
            </Button>
            <Button type="submit" className="h-10 px-8 gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
