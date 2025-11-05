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
import { ArrowLeft, Save, Check, Star, Link as LinkIcon, Trash2, Plus, Key, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import SettingsRow from "@/components/settings-row"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const [jiraEmail, setJiraEmail] = useState(jiraSync.savedBoards.email || "")
  const [isAddingBoard, setIsAddingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")
  const [newBoardUrl, setNewBoardUrl] = useState("")
  const [testToken, setTestToken] = useState("")
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

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
    
    // Guardar email de Jira si cambió
    if (jiraEmail !== jiraSync.savedBoards.email) {
      jiraSync.addBoard(jiraSync.savedBoards.boards[0] || { id: '', name: '', url: '' }, jiraEmail)
    }
    
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
    if (!newBoardName.trim() || !newBoardUrl.trim() || !jiraEmail.trim()) {
      toast.error("Error", {
        description: "Por favor completa todos los campos",
      })
      return
    }

    try {
      const url = new URL(newBoardUrl)
      const boardMatch = url.pathname.match(/\/boards\/(\d+)/)
      const boardId = boardMatch ? boardMatch[1] : Date.now().toString()

      jiraSync.addBoard({
        id: boardId,
        name: newBoardName.trim(),
        url: newBoardUrl.trim()
      }, jiraEmail.trim())

      toast.success("Board agregado", {
        description: `${newBoardName} se agregó correctamente`,
      })

      setIsAddingBoard(false)
      setNewBoardName("")
      setNewBoardUrl("")
    } catch (err) {
      toast.error("Error", {
        description: "URL inválida. Verifica el formato",
      })
    }
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

  const handleClearToken = () => {
    if (confirm("¿Estás seguro de que quieres borrar el token guardado?")) {
      jiraSync.saveCredentials(null)
      toast.success("Token borrado", {
        description: "Deberás ingresar el token en la próxima sincronización",
      })
    }
  }

  const handleTestConnection = async () => {
    if (!jiraEmail.trim() || !testToken.trim()) {
      setTestResult({
        success: false,
        message: "Por favor ingresa email y token"
      })
      return
    }

    if (jiraSync.savedBoards.boards.length === 0) {
      setTestResult({
        success: false,
        message: "Debes tener al menos un board configurado"
      })
      return
    }

    setIsTestingConnection(true)
    setTestResult(null)

    try {
      const firstBoard = jiraSync.savedBoards.boards[0]
      const { fetchEpicsFromBoard } = await import('@/lib/jira-client')
      const epics = await fetchEpicsFromBoard(firstBoard.url, jiraEmail.trim(), testToken.trim())
      
      setTestResult({
        success: true,
        message: `Conexión exitosa! Se encontraron ${epics.length} épicas`
      })
      setTestToken("")
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Error al conectar con Jira"
      })
    } finally {
      setIsTestingConnection(false)
    }
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
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="jira-email" className="font-medium">Email de Jira</Label>
              <Input
                id="jira-email"
                type="email"
                placeholder="tu-email@empresa.com"
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
              />
            </div>

            {/* Token Status */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Token de API</span>
              </div>
              <div className="flex items-center gap-2">
                {jiraSync.savedCredentials?.token ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Token guardado</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearToken}
                      className="text-red-600 hover:text-red-700 h-7"
                    >
                      Borrar
                    </Button>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-muted-foreground">Sin token guardado</span>
                  </>
                )}
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
                    <Label htmlFor="new-board-url" className="text-sm">URL del Board</Label>
                    <Input
                      id="new-board-url"
                      placeholder="https://company.atlassian.net/..."
                      value={newBoardUrl}
                      onChange={(e) => setNewBoardUrl(e.target.value)}
                    />
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
                          <p className="text-xs text-muted-foreground truncate max-w-md">
                            {board.url}
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

            {/* Test Connection */}
            <div className="pt-4 border-t space-y-3">
              <Label className="font-medium">Probar Conexión</Label>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Ingresa tu token para probar"
                  value={testToken}
                  onChange={(e) => setTestToken(e.target.value)}
                />
                <Button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !jiraEmail.trim() || !testToken.trim()}
                  className="w-full"
                  size="sm"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    'Probar Conexión'
                  )}
                </Button>

                {testResult && (
                  <Alert variant={testResult.success ? "default" : "destructive"} className="py-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}
                    <AlertDescription className="text-xs ml-2">
                      {testResult.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


