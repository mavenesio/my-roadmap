"use client"

import { useState, useMemo, useEffect } from 'react'
import { useLocalStorage } from './use-local-storage'

export interface Week {
  id: string
  date: string
  month: string
}

export interface RoadmapConfig {
  quarter: number
  year: number
  weeks: Week[]
  teamMembers: string[]
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

  const initializeConfig = (quarter: number, year: number) => {
    const weeks = generateWeeks(quarter, year)
    const newConfig: RoadmapConfig = {
      quarter,
      year,
      weeks,
      teamMembers: ["Sofi", "Nico", "Kai", "Ste", "Peter", "Gabo", "Chiqui", "Marian"],
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
    if (config && !isInitialized) {
      setIsInitialized(true)
    }
  }, [config, isInitialized])

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
