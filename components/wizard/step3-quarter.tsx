"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"
import type { WizardData } from "../initialization-wizard"

interface Step3Props {
  data: Partial<WizardData>
  onUpdate: (updates: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
  onRegisterHandler?: (handler: (() => void | Promise<void>) | null) => void
}

const generateWeeks = (quarter: number, year: number) => {
  const quarters = {
    1: { startMonth: 0, endMonth: 2 },
    2: { startMonth: 3, endMonth: 5 },
    3: { startMonth: 6, endMonth: 8 },
    4: { startMonth: 9, endMonth: 11 },
  }
  
  const { startMonth, endMonth } = quarters[quarter as keyof typeof quarters]
  const weeks: Array<{ id: string; date: string; month: string }> = []
  let globalWeekNumber = 1
  
  const monthNames = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ]
  
  const quarterStart = new Date(year, startMonth, 1)
  const firstMonday = new Date(quarterStart)
  const dayOfWeek = quarterStart.getDay()
  const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
  firstMonday.setDate(quarterStart.getDate() + daysToMonday)
  
  const quarterEnd = new Date(year, endMonth + 1, 0)
  let currentMonday = new Date(firstMonday)
  
  while (currentMonday <= quarterEnd) {
    const weekEnd = new Date(currentMonday)
    weekEnd.setDate(currentMonday.getDate() + 6)
    
    const weekMonth = currentMonday.getMonth()
    
    if (currentMonday >= quarterStart || weekEnd >= quarterStart) {
      weeks.push({
        id: `W${globalWeekNumber}`,
        date: `${currentMonday.getDate().toString().padStart(2, '0')}-${(currentMonday.getMonth() + 1).toString().padStart(2, '0')}`,
        month: monthNames[weekMonth]
      })
      globalWeekNumber++
    }
    
    currentMonday.setDate(currentMonday.getDate() + 7)
  }
  
  return weeks
}

export function Step3Quarter({ data, onUpdate, onNext, onBack, onRegisterHandler }: Step3Props) {
  const currentYear = new Date().getFullYear()
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
  
  const [quarter, setQuarter] = useState(data.quarter || currentQuarter)
  const [year, setYear] = useState(data.year || currentYear)
  
  const weeks = generateWeeks(quarter, year)
  
  const handleContinue = useCallback(() => {
    console.log('📅 Saving quarter and year:', { quarter, year })
    onUpdate({ quarter, year })
    onNext()
  }, [quarter, year, onUpdate, onNext])

  // Register this step's continue handler with the wizard
  useEffect(() => {
    onRegisterHandler?.(handleContinue)
    
    // Cleanup: unregister on unmount
    return () => {
      onRegisterHandler?.(null)
    }
  }, [handleContinue, onRegisterHandler])
  
  const getQuarterMonths = (q: number) => {
    const quarters = {
      1: "Enero - Marzo",
      2: "Abril - Junio",
      3: "Julio - Septiembre",
      4: "Octubre - Diciembre",
    }
    return quarters[q as keyof typeof quarters]
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Selecciona el Quarter</h2>
        <p className="text-gray-600">
          Define el período de tiempo para tu roadmap
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Período de Trabajo
          </CardTitle>
          <CardDescription>
            Selecciona el quarter y año para tu planificación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Quarter</Label>
              <Select
                value={quarter.toString()}
                onValueChange={(value) => setQuarter(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 - Enero a Marzo</SelectItem>
                  <SelectItem value="2">Q2 - Abril a Junio</SelectItem>
                  <SelectItem value="3">Q3 - Julio a Septiembre</SelectItem>
                  <SelectItem value="4">Q4 - Octubre a Diciembre</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                {getQuarterMonths(quarter)}
              </p>
            </div>

            <div>
              <Label>Año</Label>
              <Select
                value={year.toString()}
                onValueChange={(value) => setYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">
              Semanas incluidas en este quarter ({weeks.length} semanas):
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {weeks.map((week) => (
                <div
                  key={week.id}
                  className="bg-white border border-blue-300 rounded px-2 py-1 text-center"
                >
                  <div className="font-semibold text-blue-900 text-sm">{week.id}</div>
                  <div className="text-xs text-gray-600">{week.date}</div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 space-y-1">
              <div className="text-sm text-gray-700">
                <strong>Meses:</strong> {[...new Set(weeks.map(w => w.month))].join(", ")}
              </div>
              <div className="text-sm text-gray-700">
                <strong>Total de semanas:</strong> {weeks.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

