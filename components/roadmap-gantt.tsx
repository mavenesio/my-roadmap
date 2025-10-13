"use client"

import type React from "react"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddTaskModal } from "@/components/add-task-modal"
import { Download, Upload, X, ChevronDown, ChevronRight } from "lucide-react"

type Priority = "Milestone" | "1" | "2" | "3"

interface WeekAssignment {
  weekId: string
  assignees: string[]
}

interface Task {
  id: string
  name: string
  priority: Priority
  weeks: string[]
  assignments: WeekAssignment[]
}

const TEAM_MEMBERS = ["Ana García", "Carlos Ruiz", "María López", "Juan Pérez", "Sofia Martínez"]

const WEEKS = [
  { id: "W2", date: "06-10", month: "OCTUBRE" },
  { id: "W3", date: "13-10", month: "OCTUBRE" },
  { id: "W4", date: "20-10", month: "OCTUBRE" },
  { id: "W5", date: "27-10", month: "OCTUBRE" },
  { id: "W6", date: "03-11", month: "NOVIEMBRE" },
  { id: "W7", date: "10-11", month: "NOVIEMBRE" },
  { id: "W8", date: "17-11", month: "NOVIEMBRE" },
  { id: "W9", date: "24-11", month: "NOVIEMBRE" },
  { id: "W10", date: "01-12", month: "DICIEMBRE" },
  { id: "W11", date: "08-12", month: "DICIEMBRE" },
  { id: "W12", date: "15-12", month: "DICIEMBRE" },
  { id: "W13", date: "22-12", month: "DICIEMBRE" },
]

const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    name: "[GUARDIANS] IMPLEMENTAR SECURITY GUARDIANS ACCELERATORS PARA ALCANZAR 500 GUARDIANS HACKER",
    priority: "Milestone",
    weeks: ["W4", "W5", "W6", "W7"],
    assignments: WEEKS.map((week) => ({ weekId: week.id, assignees: [] })),
  },
  {
    id: "2",
    name: "[GUARDIANS] REALIZAR CIERRE DE MISIONES 2025 y PREMIACIÓN",
    priority: "1",
    weeks: ["W6", "W7", "W9"],
    assignments: WEEKS.map((week) => ({ weekId: week.id, assignees: [] })),
  },
  {
    id: "3",
    name: "[GUARDIANS] DISEÑAR E IMPLEMENTAR WORKFLOW PARA RECOLECTAR INFORMACION SOBRE EL ROADMAP DEL SIGUIENTE Q",
    priority: "2",
    weeks: ["W6", "W7"],
    assignments: WEEKS.map((week) => ({ weekId: week.id, assignees: [] })),
  },
  {
    id: "4",
    name: "[GUARDIANS] IMPLEMENTAR GENERADOR DE MISIONES AUTOMATICAS A PARTIR DEL ROADMAP",
    priority: "2",
    weeks: ["W8", "W9"],
    assignments: WEEKS.map((week) => ({ weekId: week.id, assignees: [] })),
  },
  {
    id: "5",
    name: "[GUARDIANS] CARGA DE NUEVAS MISIONES Y AJUSTE DE MELISAMM",
    priority: "3",
    weeks: ["W11", "W12", "W13"],
    assignments: WEEKS.map((week) => ({ weekId: week.id, assignees: [] })),
  },
]

export function RoadmapGantt() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  const toggleMonth = (month: string) => {
    setCollapsedMonths((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(month)) {
        newSet.delete(month)
      } else {
        newSet.add(month)
      }
      return newSet
    })
  }

  const handleAddTask = (newTask: { name: string; priority: Priority }) => {
    const task: Task = {
      id: Date.now().toString(),
      name: newTask.name,
      priority: newTask.priority,
      weeks: [],
      assignments: WEEKS.map((week) => ({ weekId: week.id, assignees: [] })),
    }
    setTasks((prev) => [...prev, task])
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(tasks, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `roadmap-q4-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedTasks = JSON.parse(e.target?.result as string)
          setTasks(importedTasks)
        } catch (error) {
          console.error("Error importing file:", error)
          alert("Error importing file. Please make sure it's a valid JSON file.")
        }
      }
      reader.readAsText(file)
    }
  }

  const handleAddAssignee = (taskId: string, weekId: string, assignee: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            assignments: task.assignments.map((assignment) => {
              if (assignment.weekId === weekId) {
                const currentAssignees = assignment.assignees
                if (!currentAssignees.includes(assignee) && currentAssignees.length < 2) {
                  return { ...assignment, assignees: [...currentAssignees, assignee] }
                }
              }
              return assignment
            }),
          }
        }
        return task
      }),
    )
  }

  const handleRemoveAssignee = (taskId: string, weekId: string, assignee: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            assignments: task.assignments.map((assignment) => {
              if (assignment.weekId === weekId) {
                return { ...assignment, assignees: assignment.assignees.filter((a) => a !== assignee) }
              }
              return assignment
            }),
          }
        }
        return task
      }),
    )
  }

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "Milestone":
        return "bg-amber-500 text-amber-950 hover:bg-amber-500/80"
      case "1":
        return "bg-red-500 text-white hover:bg-red-500/80"
      case "2":
        return "bg-blue-500 text-white hover:bg-blue-500/80"
      case "3":
        return "bg-emerald-500 text-white hover:bg-emerald-500/80"
    }
  }

  const getMonthWeeks = (month: string) => {
    return WEEKS.filter((week) => week.month === month)
  }

  const months = ["OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <AddTaskModal onAddTask={handleAddTask} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" asChild>
            <label htmlFor="import-file" className="cursor-pointer">
              <Upload className="h-4 w-4" />
              Import
              <input id="import-file" type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="min-w-[1400px]">
          {/* Header */}
          <div
            className="grid border-b border-border bg-muted/50"
            style={{
              gridTemplateColumns: `400px ${WEEKS.map((week) => (collapsedMonths.has(week.month) ? "0px" : "80px")).join(" ")}`,
            }}
          >
            <div className="border-r border-border p-4 font-semibold">TASK</div>
            {months.map((month) => {
              const monthWeeks = getMonthWeeks(month)
              const isCollapsed = collapsedMonths.has(month)
              const colSpan = isCollapsed ? 0 : monthWeeks.length

              if (isCollapsed) return null

              return (
                <div
                  key={month}
                  className="border-r border-border p-4 text-center font-semibold cursor-pointer hover:bg-muted flex items-center justify-center gap-2"
                  style={{ gridColumn: `span ${colSpan}` }}
                  onClick={() => toggleMonth(month)}
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {month}
                </div>
              )
            })}
          </div>

          {/* Week headers */}
          <div
            className="grid border-b border-border bg-muted/30"
            style={{
              gridTemplateColumns: `400px ${WEEKS.map((week) => (collapsedMonths.has(week.month) ? "0px" : "80px")).join(" ")}`,
            }}
          >
            <div className="border-r border-border"></div>
            {WEEKS.map((week) => {
              if (collapsedMonths.has(week.month)) return null

              return (
                <div key={week.id} className="border-r border-border p-2 text-center text-xs">
                  <div className="font-medium">{week.date}</div>
                  <div className="text-muted-foreground">{week.id}</div>
                </div>
              )
            })}
          </div>

          {/* Tasks */}
          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid border-b border-border hover:bg-muted/30"
              style={{
                gridTemplateColumns: `400px ${WEEKS.map((week) => (collapsedMonths.has(week.month) ? "0px" : "80px")).join(" ")}`,
              }}
            >
              <div className="border-r border-border p-4">
                <div className="flex items-start gap-2">
                  <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  <div className="flex-1 text-sm leading-relaxed">{task.name}</div>
                </div>
              </div>
              {WEEKS.map((week) => {
                if (collapsedMonths.has(week.month)) return null

                const assignment = task.assignments.find((a) => a.weekId === week.id)
                const assignees = assignment?.assignees || []
                const canAddMore = assignees.length < 2

                return (
                  <div key={week.id} className="flex flex-col gap-1 border-r border-border p-1">
                    {assignees.map((assignee) => (
                      <Badge
                        key={assignee}
                        variant="secondary"
                        className="flex items-center justify-between gap-1 bg-cyan-500 text-white hover:bg-cyan-600 text-[10px] px-1 py-0.5"
                      >
                        <span className="truncate">{assignee.split(" ")[0]}</span>
                        <button
                          onClick={() => handleRemoveAssignee(task.id, week.id, assignee)}
                          className="hover:bg-cyan-700 rounded-sm p-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}

                    {canAddMore && (
                      <Select onValueChange={(value) => handleAddAssignee(task.id, week.id, value)}>
                        <SelectTrigger className="h-6 w-full border-0 bg-gray-100 hover:bg-gray-200 text-[10px] focus:ring-0">
                          <SelectValue placeholder="+" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEAM_MEMBERS.filter((member) => !assignees.includes(member)).map((member) => (
                            <SelectItem key={member} value={member} className="text-xs">
                              {member}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
