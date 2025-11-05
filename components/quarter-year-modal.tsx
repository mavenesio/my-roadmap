"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, FileUp, Plus, Trash2 } from "lucide-react"
import {
  DEFAULT_TRACKS,
  DEFAULT_TEAM_MEMBERS,
} from '@/config/default-roadmap-config'

interface QuarterYearModalProps {
  open: boolean
  onConfirm: (
    quarter: number,
    year: number,
    teamMembers?: Array<{ name: string; color: string }>,
    projects?: string[]
  ) => void
  onImport: (file: File) => void
}

export function QuarterYearModal({ open, onConfirm, onImport }: QuarterYearModalProps) {
  const [quarter, setQuarter] = useState<number>(4)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [members, setMembers] = useState<Array<{ name: string; color: string }>>(DEFAULT_TEAM_MEMBERS)
  const [projects, setProjects] = useState<string[]>(DEFAULT_TRACKS.map(t => t.name))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(quarter, year, members, projects)
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImport(file)
    }
  }

  const generateWeeks = (quarter: number, year: number) => {
    const quarters = {
      1: { startMonth: 0, endMonth: 2 }, // Enero-Marzo
      2: { startMonth: 3, endMonth: 5 }, // Abril-Junio
      3: { startMonth: 6, endMonth: 8 }, // Julio-Septiembre
      4: { startMonth: 9, endMonth: 11 }, // Octubre-Diciembre
    }
    
    const { startMonth, endMonth } = quarters[quarter as keyof typeof quarters]
    const weeks = []
    let globalWeekNumber = 1
    
    const monthNames = [
      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
      "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ]
    
    // Primer día del trimestre
    const quarterStart = new Date(year, startMonth, 1)
    
    // Encontrar el primer lunes del trimestre (o el lunes anterior si el trimestre no empieza en lunes)
    const firstMonday = new Date(quarterStart)
    const dayOfWeek = quarterStart.getDay()
    const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
    firstMonday.setDate(quarterStart.getDate() + daysToMonday)
    
    // Último día del trimestre
    const quarterEnd = new Date(year, endMonth + 1, 0)
    
    // Generar semanas continuas desde el primer lunes hasta cubrir todo el trimestre
    let currentMonday = new Date(firstMonday)
    
    while (currentMonday <= quarterEnd) {
      const weekEnd = new Date(currentMonday)
      weekEnd.setDate(currentMonday.getDate() + 6) // Domingo de esa semana
      
      // Determinar a qué mes pertenece la semana
      // Usamos el criterio: el mes donde cae el lunes de la semana
      const weekMonth = currentMonday.getMonth()
      
      // Solo incluir la semana si el lunes está dentro del rango del trimestre o después
      if (currentMonday >= quarterStart || weekEnd >= quarterStart) {
        weeks.push({
          id: `W${globalWeekNumber}`,
          date: `${currentMonday.getDate().toString().padStart(2, '0')}-${(currentMonday.getMonth() + 1).toString().padStart(2, '0')}`,
          month: monthNames[weekMonth]
        })
        globalWeekNumber++
      }
      
      // Avanzar al siguiente lunes
      currentMonday.setDate(currentMonday.getDate() + 7)
    }
    
    return weeks
  }

  const previewWeeks = generateWeeks(quarter, year)
  
  // Group weeks by month
  const weeksByMonth = previewWeeks.reduce((acc, week) => {
    if (!acc[week.month]) {
      acc[week.month] = []
    }
    acc[week.month].push(week)
    return acc
  }, {} as Record<string, typeof previewWeeks>)

  // Format week range for display
  const getWeekRange = (week: { date: string }) => {
    const [day, month] = week.date.split('-')
    const startDate = new Date(year, parseInt(month) - 1, parseInt(day))
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 4) // Monday to Friday
    
    const formatDate = (date: Date) => {
      const d = date.getDate().toString().padStart(2, '0')
      const m = (date.getMonth() + 1).toString().padStart(2, '0')
      return `${d}/${m}`
    }
    
    return `${formatDate(startDate)} a ${formatDate(endDate)}`
  }

  return (
    <div className="min-h-screen w-full bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Calendar className="h-8 w-8" />
            Configurar Roadmap
          </h1>
          <p className="mt-2 text-muted-foreground">
            Comienza tu planificación trimestral
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Import */}
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 flex flex-col items-center justify-center text-center space-y-4 bg-muted/10 hover:bg-muted/20 transition-colors">
            <FileUp className="h-16 w-16 text-muted-foreground" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">¿Ya tienes tu roadmap?</h2>
              <p className="text-muted-foreground">
                Compártenos tu JSON y continúa donde lo dejaste
              </p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              <Label htmlFor="import-file" className="sr-only">
                Importar archivo
              </Label>
              <input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Importa tu configuración completa con tareas y asignaciones
              </p>
            </div>
          </div>

          {/* Right Column - Manual Configuration */}
          <form onSubmit={handleSubmit} className="rounded-lg border p-6 bg-card space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Tu primera configuración</h2>
              <p className="text-sm text-muted-foreground">
                Define el período, tu equipo y proyectos
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quarter">Cuarto</Label>
                <Select value={quarter.toString()} onValueChange={(value) => setQuarter(parseInt(value))}>
                  <SelectTrigger id="quarter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (Enero - Marzo)</SelectItem>
                    <SelectItem value="2">Q2 (Abril - Junio)</SelectItem>
                    <SelectItem value="3">Q3 (Julio - Septiembre)</SelectItem>
                    <SelectItem value="4">Q4 (Octubre - Diciembre)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="year">Año</Label>
                <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                  <SelectTrigger id="year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => {
                      const yearOption = new Date().getFullYear() - 1 + i
                      return (
                        <SelectItem key={yearOption} value={yearOption.toString()}>
                          {yearOption}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Vista previa de semanas</Label>
              <div className="border rounded-md p-3 bg-muted/30 max-h-[200px] overflow-y-auto">
                <div className="text-sm text-muted-foreground mb-3">
                  {previewWeeks.length} semanas generadas:
                </div>
                <div className="space-y-3">
                  {Object.entries(weeksByMonth).map(([month, weeks]) => (
                    <div key={month} className="space-y-1">
                      <div className="text-xs font-semibold uppercase text-foreground">{month}</div>
                      <div className="text-xs space-y-0.5">
                        {weeks.map((week, index) => (
                          <div key={index} className="text-muted-foreground">
                            W{index + 1}: {getWeekRange(week)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Team members with colors */}
            <div className="grid gap-3">
              <Label>Miembros del equipo y color</Label>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                {members.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={m.color}
                      onChange={(e) => {
                        const next = [...members]
                        next[idx] = { ...next[idx], color: e.target.value }
                        setMembers(next)
                      }}
                      className="h-8 w-10 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => {
                        const next = [...members]
                        next[idx] = { ...next[idx], name: e.target.value }
                        setMembers(next)
                      }}
                      placeholder="Nombre"
                      className="flex-1 rounded border px-2 py-1 bg-background text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setMembers(members.filter((_, i) => i !== idx))}
                      className="p-2 rounded border hover:bg-muted"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setMembers([...members, { name: "", color: "#64748b" }])}
                  className="inline-flex items-center gap-2 rounded border px-2 py-1 text-sm hover:bg-muted w-full justify-center"
                >
                  <Plus className="h-4 w-4" /> Agregar persona
                </button>
              </div>
            </div>

            {/* Projects */}
            <div className="grid gap-3">
              <Label>Proyectos / Tracks</Label>
              <div className="space-y-2">
                {projects.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p}
                      onChange={(e) => {
                        const next = [...projects]
                        next[idx] = e.target.value
                        setProjects(next)
                      }}
                      placeholder="Nombre del proyecto"
                      className="flex-1 rounded border px-2 py-1 bg-background text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setProjects(projects.filter((_, i) => i !== idx))}
                      className="p-2 rounded border hover:bg-muted"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setProjects([...projects, ""])}
                  className="inline-flex items-center gap-2 rounded border px-2 py-1 text-sm hover:bg-muted w-full justify-center"
                >
                  <Plus className="h-4 w-4" /> Agregar proyecto
                </button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button type="submit" className="w-full">
                Crear Roadmap
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
