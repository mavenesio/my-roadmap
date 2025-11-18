"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, CheckSquare, Square, Search, X } from "lucide-react"
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
  const [searchQuery, setSearchQuery] = useState("")

  const currentBoard = data.jiraBoards?.[data.jiraBoards.length - 1]

  // Filtrar y ordenar épicas
  const filteredAndSortedEpics = useMemo(() => {
    let filtered = epics

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = epics.filter(epic => 
        epic.summary.toLowerCase().includes(query) ||
        epic.key.toLowerCase().includes(query) ||
        epic.status.toLowerCase().includes(query)
      )
    }

    // Ordenar por ID descendente (más nuevo primero)
    // Los IDs de Jira suelen ser números crecientes
    return [...filtered].sort((a, b) => {
      const aNum = parseInt(a.id) || 0
      const bNum = parseInt(b.id) || 0
      return bNum - aNum // Descendente
    })
  }, [epics, searchQuery])

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
    setSelectedEpics(new Set(filteredAndSortedEpics.map(e => e.key)))
  }

  const deselectAll = () => {
    setSelectedEpics(new Set())
  }

  const clearSearch = () => {
    setSearchQuery("")
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
    <div className="space-y-4">
      {/* Header con título y búsqueda en la misma línea */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-2xl font-bold shrink-0">Selecciona Épicas</h2>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre, clave o estado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={selectAll} className="whitespace-nowrap">
            <CheckSquare className="w-4 h-4 mr-1.5" />
            Todas
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll} className="whitespace-nowrap">
            <Square className="w-4 h-4 mr-1.5" />
            Ninguna
          </Button>
        </div>
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-gray-600">
          {selectedEpics.size} de {epics.length} épicas seleccionadas
          {searchQuery && filteredAndSortedEpics.length < epics.length && (
            <span className="ml-2 text-gray-500">
              ({filteredAndSortedEpics.length} en resultados)
            </span>
          )}
        </p>
      </div>

      {/* Lista de épicas */}
      <div className="space-y-3 max-h-[calc(100vh-450px)] min-h-[400px] overflow-y-auto pr-2">
        {filteredAndSortedEpics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron épicas que coincidan con la búsqueda</p>
            <Button variant="ghost" size="sm" onClick={clearSearch} className="mt-2">
              Limpiar búsqueda
            </Button>
          </div>
        ) : (
          filteredAndSortedEpics.map((epic) => {
          const isSelected = selectedEpics.has(epic.key)
          const config = epicConfigs.get(epic.key)

          return (
            <Card key={epic.key} className={`transition-all ${isSelected ? "border-2 border-primary shadow-md" : "border"}`}>
              <CardHeader className="py-4 px-5">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleEpic(epic.key)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold break-words leading-tight">{epic.summary}</CardTitle>
                    <CardDescription className="flex items-center flex-wrap gap-2 mt-1.5">
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">
                        {epic.key}
                      </span>
                      <span className="text-xs text-gray-500">
                        <span className="text-gray-400">•</span> {epic.status}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              {isSelected && config && (
                <CardContent className="pt-0 pb-5 px-5 border-t">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
                    <div className="min-w-0 w-full">
                      <Label className="text-xs font-medium mb-1 block text-gray-600">Track</Label>
                      <Select
                        value={config.track}
                        onValueChange={(value) => updateEpicConfig(epic.key, "track", value)}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {data.tracks?.filter(t => t.name && t.name.trim() !== '').map((t) => (
                            <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0 w-full">
                      <Label className="text-xs font-medium mb-1 block text-gray-600">Prioridad</Label>
                      <Select
                        value={config.priority}
                        onValueChange={(value) => updateEpicConfig(epic.key, "priority", value)}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {data.priorities?.filter(p => p.name && p.name.trim() !== '').map((p) => (
                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0 w-full">
                      <Label className="text-xs font-medium mb-1 block text-gray-600">Estado</Label>
                      <Select
                        value={config.status}
                        onValueChange={(value) => updateEpicConfig(epic.key, "status", value)}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {data.statuses?.filter(s => s.name && s.name.trim() !== '').map((s) => (
                            <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0 w-full">
                      <Label className="text-xs font-medium mb-1 block text-gray-600">Tipo</Label>
                      <Select
                        value={config.type}
                        onValueChange={(value) => updateEpicConfig(epic.key, "type", value)}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {data.types?.filter(t => t.name && t.name.trim() !== '').map((t) => (
                            <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0 w-full">
                      <Label className="text-xs font-medium mb-1 block text-gray-600">Tamaño</Label>
                      <Select
                        value={config.size}
                        onValueChange={(value) => updateEpicConfig(epic.key, "size", value)}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
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
        })
        )}
      </div>
    </div>
  )
}

