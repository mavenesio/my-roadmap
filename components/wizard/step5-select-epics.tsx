"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, CheckSquare, Square } from "lucide-react"
import type { WizardData } from "../initialization-wizard"
import type { JiraEpic } from "@/lib/jira-client"

interface Step5Props {
  data: Partial<WizardData>
  onUpdate: (updates: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
  onUpdateNavigation?: (canGoNext: boolean, isProcessing: boolean) => void
  onRegisterHandler?: (handler: (() => void | Promise<void>) | null) => void
}

export function Step5SelectEpics({ data, onUpdate, onNext, onBack, onUpdateNavigation, onRegisterHandler }: Step5Props) {
  const [epics, setEpics] = useState<JiraEpic[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set())
  const [epicConfigs, setEpicConfigs] = useState<Map<string, any>>(new Map())

  const currentBoard = data.jiraBoards?.[data.jiraBoards.length - 1]

  useEffect(() => {
    // Usar las épicas que ya vienen del paso 4 (validación)
    if (currentBoard?.epics) {
      console.log('📦 Usando épicas del paso anterior:', currentBoard.epics.length)
      setEpics(currentBoard.epics)
      
      // Inicializar configs con valores por defecto
      const configs = new Map()
      
      // Helper to get first valid (non-empty) value
      const getFirstValid = (arr: any[], prop?: string): string => {
        if (!arr || arr.length === 0) return "N/A"
        const validItems = prop 
          ? arr.filter(item => item[prop] && item[prop].trim() !== '')
          : arr.filter(item => item && item.trim() !== '')
        return prop 
          ? (validItems.length > 0 ? validItems[0][prop] : "N/A")
          : (validItems.length > 0 ? validItems[0] : "N/A")
      }
      
      currentBoard.epics.forEach((epic: JiraEpic) => {
        configs.set(epic.key, {
          track: data.defaults?.track || getFirstValid(data.tracks || [], 'name'),
          priority: data.defaults?.priority || getFirstValid(data.priorities || [], 'name'),
          status: data.defaults?.status || getFirstValid(data.statuses || [], 'name'),
          type: data.defaults?.type || getFirstValid(data.types || [], 'name'),
          size: data.defaults?.size || getFirstValid(data.sizes || []),
        })
      })
      setEpicConfigs(configs)
    } else {
      console.warn('⚠️ No se encontraron épicas en el board actual')
    }
  }, [currentBoard])

  // Notify wizard about selection state
  useEffect(() => {
    onUpdateNavigation?.(selectedEpics.size > 0, false)
  }, [selectedEpics, onUpdateNavigation])

  const toggleEpic = (epicKey: string) => {
    const newSelected = new Set(selectedEpics)
    if (newSelected.has(epicKey)) {
      newSelected.delete(epicKey)
    } else {
      newSelected.add(epicKey)
    }
    setSelectedEpics(newSelected)
  }

  const selectAll = () => {
    setSelectedEpics(new Set(epics.map(e => e.key)))
  }

  const deselectAll = () => {
    setSelectedEpics(new Set())
  }

  const updateEpicConfig = (epicKey: string, field: string, value: string) => {
    const newConfigs = new Map(epicConfigs)
    const config = newConfigs.get(epicKey) || {}
    config[field] = value
    newConfigs.set(epicKey, config)
    setEpicConfigs(newConfigs)
  }

  const handleContinue = useCallback(() => {
    if (selectedEpics.size === 0) {
      alert("Por favor, selecciona al menos una épica")
      return
    }

    const selectedEpicsData = Array.from(selectedEpics).map(epicKey => {
      const epic = epics.find(e => e.key === epicKey)
      return {
        boardUrl: currentBoard!.boardUrl,
        epic,
        configuration: epicConfigs.get(epicKey),
      }
    })

    const existingSelected = data.selectedEpics || []
    onUpdate({
      selectedEpics: [...existingSelected, ...selectedEpicsData],
    })

    onNext()
  }, [selectedEpics, epics, currentBoard, epicConfigs, data.selectedEpics, onUpdate, onNext])

  // Register this step's continue handler with the wizard
  useEffect(() => {
    onRegisterHandler?.(handleContinue)
    
    // Cleanup: unregister on unmount
    return () => {
      onRegisterHandler?.(null)
    }
  }, [handleContinue, onRegisterHandler])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-gray-600">Cargando épicas desde Jira...</p>
      </div>
    )
  }

  if (epics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">No se encontraron épicas</h2>
          <p className="text-gray-600 mb-6">
            No se encontraron épicas en el board de Jira. Verifica que el proyecto tenga épicas creadas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Selecciona Épicas</h2>
        <p className="text-gray-600">
          Elige las épicas que quieres importar y configura sus propiedades
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            {selectedEpics.size} de {epics.length} épicas seleccionadas
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            <CheckSquare className="w-4 h-4 mr-2" />
            Seleccionar todas
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            <Square className="w-4 h-4 mr-2" />
            Deseleccionar todas
          </Button>
        </div>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {epics.map((epic) => {
          const isSelected = selectedEpics.has(epic.key)
          const config = epicConfigs.get(epic.key)

          return (
            <Card key={epic.key} className={isSelected ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleEpic(epic.key)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <CardTitle className="text-base">{epic.summary}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {epic.key}
                      </span>
                      <span className="text-xs">Estado: {epic.status}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              {isSelected && config && (
                <CardContent className="pt-0 pb-6 px-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="min-w-0">
                      <Label className="text-xs font-medium mb-1.5 block">Track</Label>
                      <Select
                        value={config.track}
                        onValueChange={(value) => updateEpicConfig(epic.key, "track", value)}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {data.tracks?.filter(t => t.name && t.name.trim() !== '').map((t) => (
                            <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0">
                      <Label className="text-xs font-medium mb-1.5 block">Prioridad</Label>
                      <Select
                        value={config.priority}
                        onValueChange={(value) => updateEpicConfig(epic.key, "priority", value)}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {data.priorities?.filter(p => p.name && p.name.trim() !== '').map((p) => (
                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0">
                      <Label className="text-xs font-medium mb-1.5 block">Estado</Label>
                      <Select
                        value={config.status}
                        onValueChange={(value) => updateEpicConfig(epic.key, "status", value)}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {data.statuses?.filter(s => s.name && s.name.trim() !== '').map((s) => (
                            <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0">
                      <Label className="text-xs font-medium mb-1.5 block">Tipo</Label>
                      <Select
                        value={config.type}
                        onValueChange={(value) => updateEpicConfig(epic.key, "type", value)}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {data.types?.filter(t => t.name && t.name.trim() !== '').map((t) => (
                            <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0">
                      <Label className="text-xs font-medium mb-1.5 block">Tamaño</Label>
                      <Select
                        value={config.size}
                        onValueChange={(value) => updateEpicConfig(epic.key, "size", value)}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {data.sizes?.filter(s => s && s.trim() !== '').map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

