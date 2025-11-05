"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import type { WizardData } from "../initialization-wizard"
import {
  DEFAULT_TRACKS,
  DEFAULT_PRIORITIES,
  DEFAULT_STATUSES,
  DEFAULT_TYPES,
  DEFAULT_SIZES,
  DEFAULT_DEFAULTS,
} from "@/config/default-roadmap-config"

interface Step2Props {
  data: Partial<WizardData>
  onUpdate: (updates: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}

export function Step2MasterData({ data, onUpdate, onNext, onBack }: Step2Props) {
  const [tracks, setTracks] = useState(data.tracks || DEFAULT_TRACKS)
  const [priorities, setPriorities] = useState(data.priorities || DEFAULT_PRIORITIES)
  const [statuses, setStatuses] = useState(data.statuses || DEFAULT_STATUSES)
  const [types, setTypes] = useState(data.types || DEFAULT_TYPES)
  const [sizes, setSizes] = useState(data.sizes || DEFAULT_SIZES)
  const [defaults, setDefaults] = useState(data.defaults || DEFAULT_DEFAULTS)

  useEffect(() => {
    onUpdate({
      tracks,
      priorities,
      statuses,
      types,
      sizes,
      defaults,
    })
  }, [tracks, priorities, statuses, types, sizes, defaults, onUpdate])

  const addTrack = () => {
    setTracks([...tracks, { name: "", color: "#3b82f6" }])
  }

  const removeTrack = (index: number) => {
    setTracks(tracks.filter((_, i) => i !== index))
  }

  const updateTrack = (index: number, field: "name" | "color", value: string) => {
    const updated = [...tracks]
    updated[index][field] = value
    setTracks(updated)
  }

  const addPriority = () => {
    setPriorities([...priorities, { name: "", color: "#6b7280" }])
  }

  const removePriority = (index: number) => {
    setPriorities(priorities.filter((_, i) => i !== index))
  }

  const updatePriority = (index: number, field: "name" | "color", value: string) => {
    const updated = [...priorities]
    updated[index][field] = value
    setPriorities(updated)
  }

  const addStatus = () => {
    setStatuses([...statuses, { name: "", color: "#6b7280" }])
  }

  const removeStatus = (index: number) => {
    setStatuses(statuses.filter((_, i) => i !== index))
  }

  const updateStatus = (index: number, field: "name" | "color", value: string) => {
    const updated = [...statuses]
    updated[index][field] = value
    setStatuses(updated)
  }

  const addType = () => {
    setTypes([...types, { name: "", color: "#6b7280" }])
  }

  const removeType = (index: number) => {
    setTypes(types.filter((_, i) => i !== index))
  }

  const updateType = (index: number, field: "name" | "color", value: string) => {
    const updated = [...types]
    updated[index][field] = value
    setTypes(updated)
  }

  const addSize = () => {
    setSizes([...sizes, ""])
  }

  const removeSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index))
  }

  const updateSize = (index: number, value: string) => {
    const updated = [...sizes]
    updated[index] = value
    setSizes(updated)
  }

  const handleContinue = () => {
    // Validar que haya al menos un elemento en cada categoría
    if (tracks.length === 0 || priorities.length === 0 || statuses.length === 0 || types.length === 0 || sizes.length === 0) {
      alert("Por favor, asegúrate de tener al menos un elemento en cada categoría")
      return
    }

    // Validar que todos tengan nombre
    if (tracks.some(t => !t.name.trim()) || priorities.some(p => !p.name.trim()) || 
        statuses.some(s => !s.name.trim()) || types.some(t => !t.name.trim()) || 
        sizes.some(s => !s.trim())) {
      alert("Por favor, completa todos los nombres")
      return
    }

    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Configuración de Datos Maestros</h2>
        <p className="text-gray-600">
          Define los valores que utilizarás en tu roadmap
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tracks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Tracks
              <Button size="sm" variant="outline" onClick={addTrack}>
                <Plus className="w-4 h-4" />
              </Button>
            </CardTitle>
            <CardDescription>Equipos o áreas de trabajo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {tracks.map((track, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={track.name}
                  onChange={(e) => updateTrack(index, "name", e.target.value)}
                  placeholder="Nombre del track"
                />
                <input
                  type="color"
                  value={track.color}
                  onChange={(e) => updateTrack(index, "color", e.target.value)}
                  className="w-12 h-10 rounded border"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeTrack(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Priorities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Prioridades
              <Button size="sm" variant="outline" onClick={addPriority}>
                <Plus className="w-4 h-4" />
              </Button>
            </CardTitle>
            <CardDescription>Niveles de prioridad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {priorities.map((priority, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={priority.name}
                  onChange={(e) => updatePriority(index, "name", e.target.value)}
                  placeholder="Nombre"
                />
                <input
                  type="color"
                  value={priority.color}
                  onChange={(e) => updatePriority(index, "color", e.target.value)}
                  className="w-12 h-10 rounded border"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removePriority(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Statuses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Estados
              <Button size="sm" variant="outline" onClick={addStatus}>
                <Plus className="w-4 h-4" />
              </Button>
            </CardTitle>
            <CardDescription>Estados de las tareas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {statuses.map((status, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={status.name}
                  onChange={(e) => updateStatus(index, "name", e.target.value)}
                  placeholder="Nombre"
                />
                <input
                  type="color"
                  value={status.color}
                  onChange={(e) => updateStatus(index, "color", e.target.value)}
                  className="w-12 h-10 rounded border"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeStatus(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Tipos
              <Button size="sm" variant="outline" onClick={addType}>
                <Plus className="w-4 h-4" />
              </Button>
            </CardTitle>
            <CardDescription>Tipos de tareas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {types.map((type, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={type.name}
                  onChange={(e) => updateType(index, "name", e.target.value)}
                  placeholder="Nombre"
                />
                <input
                  type="color"
                  value={type.color}
                  onChange={(e) => updateType(index, "color", e.target.value)}
                  className="w-12 h-10 rounded border"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeType(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Sizes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Tamaños
            <Button size="sm" variant="outline" onClick={addSize}>
              <Plus className="w-4 h-4" />
            </Button>
          </CardTitle>
          <CardDescription>Tamaños de las tareas (ej: XS, S, M, L, XL)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={size}
                  onChange={(e) => updateSize(index, e.target.value)}
                  placeholder="Tamaño"
                  className="w-20"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSize(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Valores por Defecto</CardTitle>
          <CardDescription>Valores que se utilizarán por defecto al crear nuevas tareas</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <Label>Track</Label>
            <Select
              value={defaults.track}
              onValueChange={(value) => setDefaults({ ...defaults, track: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {tracks.filter(track => track.name.trim() !== "").map((track) => (
                  <SelectItem key={track.name} value={track.name}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Prioridad</Label>
            <Select
              value={defaults.priority}
              onValueChange={(value) => setDefaults({ ...defaults, priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {priorities.filter(priority => priority.name.trim() !== "").map((priority) => (
                  <SelectItem key={priority.name} value={priority.name}>
                    {priority.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Estado</Label>
            <Select
              value={defaults.status}
              onValueChange={(value) => setDefaults({ ...defaults, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {statuses.filter(status => status.name.trim() !== "").map((status) => (
                  <SelectItem key={status.name} value={status.name}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo</Label>
            <Select
              value={defaults.type}
              onValueChange={(value) => setDefaults({ ...defaults, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {types.filter(type => type.name.trim() !== "").map((type) => (
                  <SelectItem key={type.name} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tamaño</Label>
            <Select
              value={defaults.size}
              onValueChange={(value) => setDefaults({ ...defaults, size: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {sizes.filter(size => size.trim() !== "").map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

