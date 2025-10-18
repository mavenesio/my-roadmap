"use client"

import { useState, useMemo, useEffect } from 'react'
import { useLocalStorage } from './use-local-storage'
import {
  DEFAULT_TRACKS,
  DEFAULT_PRIORITIES,
  DEFAULT_STATUSES,
  DEFAULT_TYPES,
  DEFAULT_SIZES,
  DEFAULT_TEAM_MEMBERS,
  DEFAULT_DEFAULTS,
} from '@/config/default-roadmap-config'

export interface Week {
  id: string
  date: string
  month: string
}

export type AbsenceType = 'vacation' | 'license'

export interface Vacation {
  id: string
  startDate: string // ISO date format
  endDate: string // ISO date format
  description?: string
  type?: AbsenceType // 'vacation' o 'license'
}

export interface Comment {
  id: string
  text: string
  createdAt: number
}

export type GoalRating = "Below" | "Meet" | "Above"

export interface Goal {
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
  vacations?: Vacation[]
  comments?: Comment[]
  goals?: Goal[]
}

export interface RoadmapConfig {
  quarter: number
  year: number
  weeks: Week[]
  teamMembers: TeamMember[]
  // Deprecated: projects is kept for backwards compatibility; prefer tracks
  projects?: string[]
  tracks: Array<{ name: string; color: string }>
  priorities: Array<{ name: string; color: string }>
  statuses: Array<{ name: string; color: string }>
  types: Array<{ name: string; color: string }>
  sizes: string[]
  // Default values for dropdowns
  defaults?: {
    track?: string
    priority?: string
    status?: string
    type?: string
    size?: string
  }
  createdAt: string
  lastModified: string
}

const generateWeeks = (quarter: number, year: number): Week[] => {
  const quarters = {
    1: { startMonth: 0, endMonth: 2 }, // Enero-Marzo
    2: { startMonth: 3, endMonth: 5 }, // Abril-Junio
    3: { startMonth: 6, endMonth: 8 }, // Julio-Septiembre
    4: { startMonth: 9, endMonth: 11 }, // Octubre-Diciembre
  }
  
  const { startMonth, endMonth } = quarters[quarter as keyof typeof quarters]
  const weeks: Week[] = []
  let globalWeekNumber = 1
  
  for (let month = startMonth; month <= endMonth; month++) {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Encontrar el primer lunes del mes
    const firstMonday = new Date(firstDay)
    const dayOfWeek = firstDay.getDay()
    const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    firstMonday.setDate(firstDay.getDate() + daysToMonday)
    
    // Generar semanas desde el primer lunes hasta el final del mes
    let currentWeek = new Date(firstMonday)
    
    while (currentWeek <= lastDay) {
      const weekEnd = new Date(currentWeek)
      weekEnd.setDate(currentWeek.getDate() + 6)
      
      const monthNames = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
      ]
      
      weeks.push({
        id: `W${globalWeekNumber}`,
        date: `${currentWeek.getDate().toString().padStart(2, '0')}-${(currentWeek.getMonth() + 1).toString().padStart(2, '0')}`,
        month: monthNames[month]
      })
      
      currentWeek.setDate(currentWeek.getDate() + 7)
      globalWeekNumber++
    }
  }
  
  return weeks
}

export function useRoadmapConfig() {
  const [config, setConfig, removeConfig] = useLocalStorage<RoadmapConfig | null>('roadmap-config', null)
  const [isInitialized, setIsInitialized] = useState(false)

  const generateColorFromName = (name: string): string => {
    if (!name) return '#999999'
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    const saturation = 75 + (Math.abs(hash) % 15)
    const lightness = 40 + (Math.abs(hash) % 20)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  const initializeConfig = (
    quarter: number,
    year: number,
    teamMembers?: TeamMember[],
    projects?: string[]
  ) => {
    const weeks = generateWeeks(quarter, year)
    
    // If projects are provided, create tracks from them; otherwise use default tracks
    const tracks = projects && projects.length > 0
      ? projects.map((p, i) => ({
          name: p,
          color: DEFAULT_TRACKS[i % DEFAULT_TRACKS.length]?.color || generateColorFromName(p),
        }))
      : DEFAULT_TRACKS
    
    const newConfig: RoadmapConfig = {
      quarter,
      year,
      weeks,
      teamMembers: teamMembers && teamMembers.length > 0 ? teamMembers : DEFAULT_TEAM_MEMBERS,
      projects: projects && projects.length > 0 ? projects : DEFAULT_TRACKS.map(t => t.name),
      tracks,
      priorities: DEFAULT_PRIORITIES,
      statuses: DEFAULT_STATUSES,
      types: DEFAULT_TYPES,
      sizes: DEFAULT_SIZES,
      defaults: DEFAULT_DEFAULTS,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
    setConfig(newConfig)
    setIsInitialized(true)
  }

  const updateConfig = (updates: Partial<RoadmapConfig>) => {
    if (config) {
      setConfig({
        ...config,
        ...updates,
        lastModified: new Date().toISOString()
      })
    }
  }

  const importConfig = (importedData: any) => {
    // Validar que el archivo importado tenga la estructura correcta
    if (importedData && typeof importedData === 'object') {
      if (importedData.config) {
        // Formato nuevo con metadatos
        setConfig(importedData.config)
      } else if (importedData.quarter && importedData.year && importedData.weeks) {
        // Formato de configuración directa
        setConfig(importedData)
      } else {
        // Formato antiguo - crear configuración por defecto
        const currentYear = new Date().getFullYear()
        const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
        initializeConfig(currentQuarter, currentYear)
      }
      setIsInitialized(true)
    }
  }

  const exportConfig = () => {
    if (!config) return null
    
    return {
      config,
      tasks: [], // Se llenará con las tareas actuales
      exportedAt: new Date().toISOString(),
      version: "1.0.0"
    }
  }

  const resetConfig = () => {
    removeConfig()
    setIsInitialized(false)
  }

  // Verificar si ya hay una configuración guardada
  useEffect(() => {
    if (!config) return

    let updated = false
    const newConfig: any = { ...config }

    // Migración: teamMembers de string[] a {name,color}[]
    if (Array.isArray((config as any).teamMembers) && typeof (config as any).teamMembers[0] === 'string') {
      newConfig.teamMembers = (config as any).teamMembers.map((name: string) => ({ name, color: generateColorFromName(name) }))
      updated = true
    }

    // Migración: proyectos por defecto si faltan
    if (!Array.isArray((config as any).projects)) {
      newConfig.projects = ["Swiper", "TM", "Guardians"]
      updated = true
    }

    // Migración: tracks a partir de projects o crear por defecto
    if (!Array.isArray((config as any).tracks)) {
      const base = (config as any).projects || ["Swiper", "TM", "Guardians"]
      newConfig.tracks = base.map((p: string, i: number) => ({ name: p, color: ["#3b82f6", "#10b981", "#8b5cf6"][i % 3] }))
      updated = true
    }

    // Migración: prioridades/estados/tipos/sizes por defecto si faltan
    if (!Array.isArray((config as any).priorities)) {
      newConfig.priorities = [
        { name: "Milestone", color: "#f59e0b" },
        { name: "1", color: "#ef4444" },
        { name: "2", color: "#3b82f6" },
        { name: "3", color: "#10b981" },
      ]
      updated = true
    }
    if (!Array.isArray((config as any).statuses)) {
      newConfig.statuses = [
        { name: "TODO", color: "#9ca3af" },
        { name: "PREWORK", color: "#64748b" },
        { name: "WIP", color: "#3b82f6" },
        { name: "TESTING", color: "#a855f7" },
        { name: "LAST LAP", color: "#f59e0b" },
        { name: "DONE", color: "#10b981" },
        { name: "ROLLOUT", color: "#22d3ee" },
        { name: "DISMISSED", color: "#ef4444" },
        { name: "ON HOLD", color: "#6b7280" },
      ]
      updated = true
    }
    if (!Array.isArray((config as any).types)) {
      newConfig.types = [
        { name: "DEUDA TECNICA", color: "#ef4444" },
        { name: "CARRY OVER", color: "#f59e0b" },
        { name: "EXTRA MILE", color: "#22d3ee" },
        { name: "OVNI", color: "#a855f7" },
        { name: "POROTO", color: "#9ca3af" },
      ]
      updated = true
    }
    if (!Array.isArray((config as any).sizes)) {
      newConfig.sizes = ["XS", "S", "M", "L", "XL"]
      updated = true
    }

    if (updated) {
      setConfig(newConfig)
    }

    if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [config, isInitialized, setConfig])

  const months = useMemo(() => {
    if (!config) return []
    const uniqueMonths = [...new Set(config.weeks.map(week => week.month))]
    return uniqueMonths
  }, [config])

  return {
    config,
    isInitialized,
    months,
    initializeConfig,
    updateConfig,
    importConfig,
    exportConfig,
    resetConfig
  }
}
