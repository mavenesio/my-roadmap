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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, FileUp } from "lucide-react"

interface QuarterYearModalProps {
  open: boolean
  onConfirm: (quarter: number, year: number) => void
  onImport: (file: File) => void
}

export function QuarterYearModal({ open, onConfirm, onImport }: QuarterYearModalProps) {
  const [quarter, setQuarter] = useState<number>(4)
  const [year, setYear] = useState<number>(new Date().getFullYear())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(quarter, year)
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

  const previewWeeks = generateWeeks(quarter, year)

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Configurar Roadmap
            </DialogTitle>
            <DialogDescription>
              Selecciona el cuarto y año para tu roadmap, o importa un archivo existente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
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
              <div className="max-h-32 overflow-y-auto border rounded-md p-3 bg-muted/30">
                <div className="text-sm text-muted-foreground">
                  {previewWeeks.length} semanas generadas:
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {previewWeeks.slice(0, 12).map((week, index) => (
                    <span key={index} className="text-xs bg-background px-2 py-1 rounded border">
                      {week.date} ({week.month})
                    </span>
                  ))}
                  {previewWeeks.length > 12 && (
                    <span className="text-xs text-muted-foreground">
                      +{previewWeeks.length - 12} más...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid gap-2">
                <Label htmlFor="import-file" className="flex items-center gap-2">
                  <FileUp className="h-4 w-4" />
                  O importar archivo existente
                </Label>
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="text-sm text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  ⚠️ Importar reemplazará todos los datos actuales
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full">
              Crear Roadmap
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
