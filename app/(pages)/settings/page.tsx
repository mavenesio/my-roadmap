"use client"

import { useRoadmapConfig } from "@/hooks/use-roadmap-config"
import { useJiraSync } from "@/hooks/use-jira-sync"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft, Save, Check, Star, Link as LinkIcon, Trash2, Plus, Key, Settings as SettingsIcon } from "lucide-react"
import SettingsRow from "@/components/settings-row"
import { toast } from "sonner"
import { JiraCredentialsModal } from "@/components/jira-credentials-modal"
import { getSavedEmail, hasValidToken, clearJiraCredentials } from "@/lib/credentials-manager"

export default function SettingsPage() {
  const { config, updateConfig } = useRoadmapConfig()
  const jiraSync = useJiraSync()
  
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

  // Jira settings state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const [isAddingBoard, setIsAddingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")
  const [newBoardUrl, setNewBoardUrl] = useState("")

  // Check if credentials are configured
  useEffect(() => {
    const checkCredentials = async () => {
      const email = getSavedEmail()
      const token = await hasValidToken()
      setHasCredentials(!!(email && token))
      setSavedEmail(email)
    }
    checkCredentials()
  }, [])

  // Sync local state with config when it changes
  useEffect(() => {
    if (config) {
      setTracks(config.tracks || [])
      setPriorities(config.priorities || [])
      setStatuses(config.statuses || [])
      setTypes(config.types || [])
      setSizes(config.sizes || [])
      setDefaults(config.defaults || {
        track: config.tracks[0]?.name || "",
        priority: config.priorities[0]?.name || "",
        status: config.statuses[0]?.name || "",
        type: config.types[0]?.name || "",
        size: config.sizes[0] || "",
      })
    }
  }, [config])

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

  const handleAddBoard = () => {
    if (!newBoardName.trim() || !newBoardUrl.trim()) {
      toast.error("Error", {
        description: "Por favor completa todos los campos",
      })
      return
    }

    const email = getSavedEmail()
    if (!email) {
      toast.error("Error", {
        description: "No hay email configurado. Por favor, configura tus credenciales primero.",
      })
      return
    }

    // Treat newBoardUrl as a project key (e.g., TMSGWEBSEC)
    const projectKey = newBoardUrl.trim().toUpperCase()
    
    // Validate project key format (letters and numbers only)
    if (!/^[A-Z0-9]+$/.test(projectKey)) {
      toast.error("Error", {
        description: "El Project Key debe contener solo letras mayúsculas y números (ej: TMSGWEBSEC)",
      })
      return
    }

    jiraSync.addBoard({
      id: projectKey, // Use project key as ID
      name: newBoardName.trim(),
      projectKey: projectKey,
    }, email)

    toast.success("Board agregado", {
      description: `${newBoardName} se agregó correctamente`,
    })

    setIsAddingBoard(false)
    setNewBoardName("")
    setNewBoardUrl("")
  }

  const handleRemoveBoard = (boardId: string) => {
    const board = jiraSync.savedBoards.boards.find(b => b.id === boardId)
    if (confirm(`¿Eliminar el board "${board?.name}"?`)) {
      jiraSync.removeBoard(boardId)
      toast.success("Board eliminado", {
        description: "El board se eliminó correctamente",
      })
    }
  }

  const handleClearCredentials = async () => {
    if (confirm("¿Estás seguro de que quieres borrar todas las credenciales guardadas?")) {
      await clearJiraCredentials()
      setHasCredentials(false)
      setSavedEmail(null)
      toast.success("Credenciales borradas", {
        description: "Deberás configurar tus credenciales nuevamente",
      })
    }
  }

  const handleCredentialsSuccess = async (email: string) => {
    setShowCredentialsModal(false)
    setHasCredentials(true)
    setSavedEmail(email)
    toast.success("Credenciales guardadas", {
      description: "Tus credenciales se han configurado correctamente",
    })
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

        {/* Jira Integration Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-blue-500" />
              Integración con Jira
            </CardTitle>
            <CardDescription>
              Gestiona tus credenciales y boards de Jira
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Credentials Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Credenciales</span>
                  </div>
                  {hasCredentials ? (
                    <p className="text-xs text-muted-foreground">
                      Email: {savedEmail}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No hay credenciales configuradas
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCredentialsModal(true)}
                    className="h-8"
                  >
                    <SettingsIcon className="h-3.5 w-3.5 mr-1" />
                    {hasCredentials ? 'Reconfigurar' : 'Configurar'}
                  </Button>
                  {hasCredentials && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCredentials}
                      className="text-red-600 hover:text-red-700 h-8"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Boards List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Boards Configurados</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingBoard(!isAddingBoard)}
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar
                </Button>
              </div>

              {/* Add Board Form */}
              {isAddingBoard && (
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-board-name" className="text-sm">Nombre del Board</Label>
                    <Input
                      id="new-board-name"
                      placeholder="Security Team"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-board-url" className="text-sm">Project Key</Label>
                    <Input
                      id="new-board-url"
                      placeholder="TMSGWEBSEC"
                      value={newBoardUrl}
                      onChange={(e) => setNewBoardUrl(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      El código del proyecto en Jira
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddBoard} size="sm" className="flex-1">
                      Guardar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setIsAddingBoard(false)
                        setNewBoardName("")
                        setNewBoardUrl("")
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Boards List */}
              {jiraSync.savedBoards.boards.length > 0 ? (
                <div className="space-y-2">
                  {jiraSync.savedBoards.boards.map((board) => (
                    <div
                      key={board.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{board.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {board.projectKey}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBoard(board.id)}
                        className="text-red-600 hover:text-red-700 h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay boards configurados
                </p>
              )}
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Centralized Credentials Modal */}
      <JiraCredentialsModal
        open={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        onSuccess={handleCredentialsSuccess}
        requireProjectKey={false}
        title="Configurar Credenciales de Jira"
        description="Actualiza o configura tus credenciales para acceder a Jira"
      />
    </div>
  )
}




