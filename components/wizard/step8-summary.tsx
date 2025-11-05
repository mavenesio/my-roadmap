"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, Link as LinkIcon, Users, CheckSquare } from "lucide-react"
import type { WizardData } from "../initialization-wizard"

interface Step8Props {
  data: Partial<WizardData>
  onComplete: () => void
  onBack: () => void
  onUpdateNavigation?: (canGoNext: boolean, isProcessing: boolean) => void
  onBackToStart?: () => void // Callback para volver al inicio cuando se importó un archivo
}

export function Step8Summary({ data, onComplete, onBack, onUpdateNavigation, onBackToStart }: Step8Props) {
  const [isProcessing, setIsProcessing] = useState(false)

  // Debug: log data received
  console.log('📊 Step8Summary - Data received:', {
    selectedEpics: data.selectedEpics?.length || 0,
    selectedUsers: data.selectedUsers?.length || 0,
    jiraBoards: data.jiraBoards?.length || 0,
    quarter: data.quarter,
    year: data.year
  })

  // Group epics by board
  const epicsByBoard = new Map<string, any[]>()
  data.selectedEpics?.forEach(epic => {
    if (!epicsByBoard.has(epic.boardUrl)) {
      epicsByBoard.set(epic.boardUrl, [])
    }
    epicsByBoard.get(epic.boardUrl)!.push(epic)
  })

  const handleFinish = async () => {
    setIsProcessing(true)
    onUpdateNavigation?.(false, true) // Deshabilitar navegación durante procesamiento
    
    try {
      // Simulate processing (fetching stories, etc.)
      await new Promise(resolve => setTimeout(resolve, 1000))
      onComplete()
    } catch (error) {
      console.error("Error completing wizard:", error)
      alert("Error al completar la inicialización")
      onUpdateNavigation?.(true, false) // Rehabilitar navegación después de error
    } finally {
      setIsProcessing(false)
    }
  }

  // Si se importó un archivo, mostrar resumen diferente
  const isFileImported = data.fileImported && data.loadedFile

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">
          {isFileImported ? "Archivo Importado Correctamente" : "Resumen de Configuración"}
        </h2>
        <p className="text-gray-600">
          {isFileImported 
            ? "Tu configuración ha sido cargada desde el archivo" 
            : "Revisa la información antes de finalizar la inicialización"}
        </p>
      </div>

      {isFileImported ? (
        // Mostrar información del archivo importado
        <>
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900">Archivo Importado</CardTitle>
              <CardDescription>
                La configuración ha sido cargada exitosamente desde el archivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.loadedFile?.config && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Tracks:</strong> {data.loadedFile.config.tracks?.length || 0}
                  </div>
                  <div>
                    <strong>Prioridades:</strong> {data.loadedFile.config.priorities?.length || 0}
                  </div>
                  <div>
                    <strong>Estados:</strong> {data.loadedFile.config.statuses?.length || 0}
                  </div>
                  <div>
                    <strong>Tipos:</strong> {data.loadedFile.config.types?.length || 0}
                  </div>
                  <div>
                    <strong>Tamaños:</strong> {data.loadedFile.config.sizes?.length || 0}
                  </div>
                  {data.loadedFile.config.quarter && data.loadedFile.config.year && (
                    <div>
                      <strong>Quarter:</strong> Q{data.loadedFile.config.quarter} {data.loadedFile.config.year}
                    </div>
                  )}
                </div>
              )}
              {data.loadedFile?.tasks && (
                <div className="pt-3 border-t border-green-300">
                  <strong>Tareas importadas:</strong> {data.loadedFile.tasks.length}
                </div>
              )}
              {data.loadedFile?.team && (
                <div>
                  <strong>Miembros del equipo:</strong> {data.loadedFile.team.length}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">¡Todo Listo!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-800">
                Haz clic en <strong>Finalizar</strong> para cargar tu configuración y comenzar a trabajar con tu roadmap.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        // Mostrar resumen de configuración desde cero
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Boards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-8 h-8 text-blue-600" />
                  <span className="text-3xl font-bold">{epicsByBoard.size}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Épicas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-8 h-8 text-green-600" />
                  <span className="text-3xl font-bold">{data.selectedEpics?.length || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="w-8 h-8 text-purple-600" />
                  <span className="text-3xl font-bold">{data.selectedUsers?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Boards and Epics */}
          <Card>
            <CardHeader>
              <CardTitle>Boards y Épicas</CardTitle>
              <CardDescription>Épicas seleccionadas por board</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-60 overflow-y-auto">
              {Array.from(epicsByBoard.entries()).map(([boardUrl, epics], boardIndex) => (
                <div key={boardIndex} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-blue-600" />
                    <p className="font-medium text-sm">Board {boardIndex + 1}</p>
                    <Badge variant="secondary">{epics.length} épicas</Badge>
                  </div>
                  <div className="pl-6 space-y-1">
                    {epics.map((epic, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {epic.epic.key}
                        </span>
                        <span className="text-gray-700 truncate">{epic.epic.summary}</span>
                        <div className="flex gap-1 ml-auto">
                          <Badge variant="outline" className="text-xs">{epic.configuration.track}</Badge>
                          <Badge variant="outline" className="text-xs">{epic.configuration.priority}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader>
              <CardTitle>Usuarios del Equipo</CardTitle>
              <CardDescription>
                {data.selectedUsers?.length || 0} usuarios serán agregados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                {data.selectedUsers?.map((user) => (
                  <div key={user.jiraAccountId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>
                        {user.displayName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{user.displayName}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Configuración del Roadmap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-blue-800">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Quarter:</strong> Q{data.quarter} {data.year}
                </div>
                <div>
                  <strong>Tracks:</strong> {data.tracks?.length || 0}
                </div>
                <div>
                  <strong>Prioridades:</strong> {data.priorities?.length || 0}
                </div>
                <div>
                  <strong>Estados:</strong> {data.statuses?.length || 0}
                </div>
                <div>
                  <strong>Tipos:</strong> {data.types?.length || 0}
                </div>
                <div>
                  <strong>Tamaños:</strong> {data.sizes?.length || 0}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

