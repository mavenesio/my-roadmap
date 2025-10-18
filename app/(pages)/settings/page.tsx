"use client"

import { useRoadmapConfig } from "@/hooks/use-roadmap-config"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft, Save, Check, Star } from "lucide-react"
import SettingsRow from "@/components/settings-row"
import { toast } from "sonner"

export default function SettingsPage() {
  const { config, updateConfig } = useRoadmapConfig()
  const [tracks, setTracks] = useState(config?.tracks || [])
  const [priorities, setPriorities] = useState(config?.priorities || [])
  const [statuses, setStatuses] = useState(config?.statuses || [])
  const [types, setTypes] = useState(config?.types || [])
  const [sizes, setSizes] = useState(config?.sizes || [])
  const [defaults, setDefaults] = useState(config?.defaults || {
    track: config?.tracks[0]?.name || "",
    priority: config?.priorities[0]?.name || "",
    status: config?.statuses[0]?.name || "",
    type: config?.types[0]?.name || "",
    size: config?.sizes[0] || "",
  })
  const [isSaving, setIsSaving] = useState(false)

  if (!config) return null

  const handleSave = () => {
    setIsSaving(true)
    
    // Guardar toda la configuración
    updateConfig({ 
      tracks, 
      priorities, 
      statuses, 
      types, 
      sizes,
      defaults
    })
    
    // Mostrar toast de éxito
    toast.success("Configuración guardada", {
      description: "Todos los cambios se han guardado correctamente",
      duration: 3000,
    })
    
    // Resetear el estado después de 2 segundos
    setTimeout(() => {
      setIsSaving(false)
    }, 2000)
  }

  

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link href="/">
            <Button variant="outline" className="gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          </Link>
          <div className="text-lg font-semibold">Configuración del Roadmap</div>
          <Button
            className="gap-2"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Check className="h-4 w-4" /> Guardado
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Guardar cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tracks</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsRow items={tracks} setItems={setTracks} placeholder="Nombre del track" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priorities</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsRow items={priorities} setItems={setPriorities} placeholder="Prioridad" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsRow items={statuses} setItems={setStatuses} placeholder="Status" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Types</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsRow items={types} setItems={setTypes} placeholder="Tipo" />
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Sizes</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsRow items={sizes as any} setItems={setSizes as any} placeholder="Size" withColor={false} />
          </CardContent>
        </Card>

        {/* Defaults Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Valores por Defecto
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Selecciona los valores predeterminados que se usarán al crear nuevas tareas
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="default-track" className="font-medium">Track por defecto</Label>
                <Select
                  value={defaults.track}
                  onValueChange={(value) => setDefaults({ ...defaults, track: value })}
                >
                  <SelectTrigger id="default-track" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks.filter(track => track.name && track.name.trim()).map((track) => (
                      <SelectItem key={track.name} value={track.name}>
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: track.color }} />
                          {track.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-priority" className="font-medium">Priority por defecto</Label>
                <Select
                  value={defaults.priority}
                  onValueChange={(value) => setDefaults({ ...defaults, priority: value })}
                >
                  <SelectTrigger id="default-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.filter(priority => priority.name && priority.name.trim()).map((priority) => (
                      <SelectItem key={priority.name} value={priority.name}>
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: priority.color }} />
                          {priority.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-status" className="font-medium">Status por defecto</Label>
                <Select
                  value={defaults.status}
                  onValueChange={(value) => setDefaults({ ...defaults, status: value })}
                >
                  <SelectTrigger id="default-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.filter(status => status.name && status.name.trim()).map((status) => (
                      <SelectItem key={status.name} value={status.name}>
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-type" className="font-medium">Type por defecto</Label>
                <Select
                  value={defaults.type}
                  onValueChange={(value) => setDefaults({ ...defaults, type: value })}
                >
                  <SelectTrigger id="default-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.filter(type => type.name && type.name.trim()).map((type) => (
                      <SelectItem key={type.name} value={type.name}>
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-size" className="font-medium">Size por defecto</Label>
                <Select
                  value={defaults.size}
                  onValueChange={(value) => setDefaults({ ...defaults, size: value })}
                >
                  <SelectTrigger id="default-size" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes.filter(size => size && size.trim()).map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


