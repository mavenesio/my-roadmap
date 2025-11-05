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
  from?: string // Nombre de quien da el feedback
  seniority?: string // Puesto/Seniority
  team?: string // Equipo
}

export type GoalRating = "Below" | "Meet" | "Above"

export interface Goal {
  id: string
  // Campos básicos (legacy)
  description: string
  rating?: GoalRating
  extraMiles: string
  track: string
  completed: boolean
  createdAt: number
  // Nuevos campos extendidos
  objective?: string // Objetivo (multilinea)
  expectations?: string // Expectativas (multilinea)
  deadline?: string // Deadline (date ISO format)
  experienceMapRelation?: string // Relación con experience map (multilinea)
  nextStep?: string // Next step (multilinea)
  justification?: string // Justificación (multilinea)
  associatedTasks?: string[] // IDs de tareas asociadas
}

export interface TeamMember {
  name: string
  color: string
  nationality?: string
  seniority?: string
  vacations?: Vacation[]
  comments?: Comment[]
  goals?: Goal[]
  avatarUrl?: string // Avatar URL from Jira or other sources
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
  console.log('🔧 generateWeeks called with:', { quarter, year, quarterType: typeof quarter, yearType: typeof year })
  
  const quarters = {
    1: { startMonth: 0, endMonth: 2 }, // Enero-Marzo
    2: { startMonth: 3, endMonth: 5 }, // Abril-Junio
    3: { startMonth: 6, endMonth: 8 }, // Julio-Septiembre
    4: { startMonth: 9, endMonth: 11 }, // Octubre-Diciembre
  }
  
  if (!quarters[quarter as keyof typeof quarters]) {
    throw new Error(`Quarter inválido: ${quarter}. Debe ser 1, 2, 3 o 4.`)
  }
  
  const { startMonth, endMonth } = quarters[quarter as keyof typeof quarters]
  const weeks: Week[] = []
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
    projects?: string[],
    masterData?: {
      tracks?: Array<{ name: string; color: string }>
      priorities?: Array<{ name: string; color: string }>
      statuses?: Array<{ name: string; color: string }>
      types?: Array<{ name: string; color: string }>
      sizes?: Array<{ name: string; color: string }>
      defaults?: any
    }
  ): RoadmapConfig => {
    const weeks = generateWeeks(quarter, year)
    
    // If projects are provided, create tracks from them; otherwise use default tracks or provided tracks
    const tracks = masterData?.tracks 
      ? masterData.tracks
      : projects && projects.length > 0
      ? projects.map((p, i) => ({
          name: p,
          color: DEFAULT_TRACKS[i % DEFAULT_TRACKS.length]?.color || generateColorFromName(p),
        }))
      : DEFAULT_TRACKS
    
    const newConfig: RoadmapConfig = {
      quarter,
      year,
      weeks,
      // Only use DEFAULT_TEAM_MEMBERS if teamMembers is undefined/null, not if it's empty array
      // This allows users to have zero team members if they want
      teamMembers: teamMembers !== undefined && teamMembers !== null ? teamMembers : DEFAULT_TEAM_MEMBERS,
      projects: projects && projects.length > 0 ? projects : tracks.map(t => t.name),
      tracks,
      priorities: masterData?.priorities || DEFAULT_PRIORITIES,
      statuses: masterData?.statuses || DEFAULT_STATUSES,
      types: masterData?.types || DEFAULT_TYPES,
      sizes: masterData?.sizes || DEFAULT_SIZES,
      defaults: masterData?.defaults || DEFAULT_DEFAULTS,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
    setConfig(newConfig)
    setIsInitialized(true)
    return newConfig
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

  const addTeamMember = (member: TeamMember): boolean => {
    if (!config) {
      console.warn('⚠️ Cannot add team member: config not initialized')
      return false
    }
    
    // Check if member already exists (case-insensitive)
    const exists = config.teamMembers.some(m => m.name.toLowerCase() === member.name.toLowerCase())
    if (exists) {
      console.warn(`⚠️ Team member "${member.name}" already exists`)
      return false
    }
    
    console.log(`➕ Adding team member: ${member.name}`)
    
    updateConfig({
      teamMembers: [...config.teamMembers, member]
    })
    
    return true
  }

  const addTeamMembers = (members: TeamMember[]): { added: number; skipped: number; errors: string[] } => {
    if (!config) {
      console.warn('⚠️ Cannot add team members: config not initialized')
      return { added: 0, skipped: members.length, errors: ['Config not initialized'] }
    }
    
    const currentNames = new Set(config.teamMembers.map(m => m.name.toLowerCase()))
    const errors: string[] = []
    
    // Filter out duplicates
    const uniqueMembers = members.filter(member => {
      const nameLower = member.name.toLowerCase()
      
      if (currentNames.has(nameLower)) {
        errors.push(`Duplicate: ${member.name}`)
        return false
      }
      
      // Add to set to prevent duplicates within the new members array
      currentNames.add(nameLower)
      return true
    })
    
    const skipped = members.length - uniqueMembers.length
    
    if (skipped > 0) {
      console.warn(`⚠️ Skipped ${skipped} duplicate team members`)
    }
    
    if (uniqueMembers.length > 0) {
      console.log(`➕ Adding ${uniqueMembers.length} team members`)
      
      updateConfig({
        teamMembers: [...config.teamMembers, ...uniqueMembers]
      })
    }
    
    return { added: uniqueMembers.length, skipped, errors }
  }

  const updateTeamMember = (name: string, updates: Partial<TeamMember>): boolean => {
    if (!config) {
      console.warn('⚠️ Cannot update team member: config not initialized')
      return false
    }
    
    const exists = config.teamMembers.some(m => m.name === name)
    if (!exists) {
      console.warn(`⚠️ Team member "${name}" not found`)
      return false
    }
    
    console.log(`🔄 Updating team member: ${name}`)
    
    updateConfig({
      teamMembers: config.teamMembers.map(m => 
        m.name === name ? { ...m, ...updates } : m
      )
    })
    
    return true
  }

  const removeTeamMember = (name: string) => {
    if (!config) return
    
    updateConfig({
      teamMembers: config.teamMembers.filter(m => m.name !== name)
    })
  }

  const getTeamMemberByName = (name: string): TeamMember | undefined => {
    if (!config) return undefined
    return config.teamMembers.find(m => m.name === name)
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
    resetConfig,
    addTeamMember,
    addTeamMembers,
    updateTeamMember,
    removeTeamMember,
    getTeamMemberByName,
  }
}
