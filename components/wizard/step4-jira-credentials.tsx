"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Link as LinkIcon, Mail, Key, AlertCircle, Loader2, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { WizardData } from "../initialization-wizard"
import { parseJiraBoardUrl, fetchEpicsFromBoard } from "@/lib/jira-client"
import { useJiraSync } from "@/hooks/use-jira-sync"

interface Step4Props {
  data: Partial<WizardData>
  onUpdate: (updates: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
  onUpdateNavigation?: (canGoNext: boolean, isProcessing: boolean) => void
  onRegisterHandler?: (handler: (() => void | Promise<void>) | null) => void
}

export function Step4JiraCredentials({ data, onUpdate, onNext, onBack, onUpdateNavigation, onRegisterHandler }: Step4Props) {
  const jiraSync = useJiraSync()
  
  const [boardUrl, setBoardUrl] = useState("")
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [saveToken, setSaveToken] = useState(false)
  const [error, setError] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Pre-load email and token if saved
  useEffect(() => {
    const savedBoards = jiraSync.getBoards()
    const savedCredentials = jiraSync.getCredentials()
    
    if (savedBoards.email && !email) {
      setEmail(savedBoards.email)
    }
    
    if (savedCredentials?.token && !token) {
      setToken(savedCredentials.token)
      setSaveToken(true)
    }
  }, [jiraSync, email, token])

  const handleContinue = useCallback(async () => {
    setError("")
    setSuccess(false)

    // Validar campos
    if (!boardUrl.trim()) {
      setError("Por favor, ingresa la URL del board de Jira")
      return
    }

    if (!email.trim()) {
      setError("Por favor, ingresa tu email de Jira")
      return
    }

    if (!token.trim()) {
      setError("Por favor, ingresa tu API token de Jira")
      return
    }

    // Parsear URL
    let parsed
    try {
      parsed = parseJiraBoardUrl(boardUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "URL de Jira inválida")
      return
    }

    // Probar conexión con Jira
    setIsValidating(true)
    onUpdateNavigation?.(false, true) // Deshabilitar navegación durante validación
    
    try {
      console.log('🔍 Validando conexión con Jira...')
      console.log('📋 Datos a enviar:', { 
        boardUrl: boardUrl.trim(), 
        email: email.trim() ? '***' : 'vacío', 
        token: token.trim() ? '***' : 'vacío',
        parsed 
      })
      
      const epics = await fetchEpicsFromBoard(boardUrl.trim(), email.trim(), token.trim())
      console.log(`✅ Conexión exitosa! Se encontraron ${epics.length} épicas`)
      
      if (!epics || epics.length === 0) {
        setError("No se encontraron épicas en este proyecto. Verifica que el proyecto tenga épicas creadas.")
        onUpdateNavigation?.(true, false)
        return
      }
      
      setSuccess(true)
      
      const newBoard = {
        boardUrl: boardUrl.trim(),
        email: email.trim(),
        token: token.trim(),
        saveToken,
        domain: parsed.domain,
        projectKey: parsed.projectKey,
        epics: epics, // Guardar las épicas obtenidas
      }

      // Agregar o actualizar el board
      const existingBoards = data.jiraBoards || []
      const updatedBoards = [...existingBoards, newBoard]
      
      onUpdate({ jiraBoards: updatedBoards })
      
      // Pequeño delay para mostrar el mensaje de éxito
      setTimeout(() => {
        onNext()
      }, 800)
    } catch (err) {
      console.error('❌ Error al validar conexión:', err)
      
      let errorMessage = "No se pudo conectar con Jira. Verifica tus credenciales y la URL del board."
      
      if (err instanceof Error) {
        errorMessage = err.message
        
        // Agregar sugerencias específicas según el tipo de error
        if (errorMessage.includes('Could not establish connection')) {
          errorMessage = "Error de conexión. Posibles causas:\n• El servidor de desarrollo no está corriendo\n• Una extensión del navegador está bloqueando la solicitud\n• Problema de red\n\nIntenta recargar la página o deshabilita las extensiones temporalmente."
        } else if (errorMessage.includes('401')) {
          errorMessage = "Credenciales inválidas. Verifica tu email y API token de Jira."
        } else if (errorMessage.includes('403')) {
          errorMessage = "No tienes permisos para acceder a este proyecto."
        } else if (errorMessage.includes('404')) {
          errorMessage = "No se encontró el proyecto. Verifica la URL del board."
        }
      }
      
      setError(errorMessage)
      onUpdateNavigation?.(true, false) // Rehabilitar navegación después de error
    } finally {
      setIsValidating(false)
    }
  }, [boardUrl, email, token, saveToken, data.jiraBoards, onUpdate, onNext, onUpdateNavigation])

  // Register this step's continue handler with the wizard
  useEffect(() => {
    onRegisterHandler?.(handleContinue)
    
    // Cleanup: unregister on unmount
    return () => {
      onRegisterHandler?.(null)
    }
  }, [handleContinue, onRegisterHandler])

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Conexión con Jira</h2>
        <p className="text-gray-600">
          Conecta tu board de Jira para importar épicas y tareas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Credenciales de Jira
          </CardTitle>
          <CardDescription>
            Ingresa los datos de tu cuenta de Jira para sincronizar épicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-500 bg-green-50 text-green-900">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                ✅ Conexión exitosa con Jira! Redirigiendo...
              </AlertDescription>
            </Alert>
          )}
          
          {isValidating && (
            <Alert className="border-blue-500 bg-blue-50 text-blue-900">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription>
                Validando conexión con Jira... Esto puede tomar unos segundos.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="boardUrl">URL del Board de Jira *</Label>
            <Input
              id="boardUrl"
              value={boardUrl}
              onChange={(e) => setBoardUrl(e.target.value)}
              placeholder="https://company.atlassian.net/jira/software/c/projects/PROJ/boards/123"
              className="mt-1"
              disabled={isValidating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Copia la URL completa de tu board de Jira desde el navegador
            </p>
          </div>

          <div>
            <Label htmlFor="email">Email de Jira *</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-email@company.com"
                className="pl-10"
                disabled={isValidating}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              El email que usas para iniciar sesión en Jira
            </p>
          </div>

          <div>
            <Label htmlFor="token">API Token de Jira *</Label>
            <div className="relative mt-1">
              <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Tu API token de Jira"
                className="pl-10"
                disabled={isValidating}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Genera un token en{" "}
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Atlassian Security
              </a>
            </p>
          </div>

          <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="saveToken"
              checked={saveToken}
              onCheckedChange={(checked) => setSaveToken(checked as boolean)}
              disabled={isValidating}
            />
            <label
              htmlFor="saveToken"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Guardar credenciales en el navegador
            </label>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Nota de seguridad:</strong> Si guardas las credenciales, se almacenarán 
              en el localStorage de tu navegador. Solo hazlo en dispositivos de confianza.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 text-base">¿Cómo obtener un API Token?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Ve a tu perfil de Atlassian</li>
            <li>Navega a Seguridad → API tokens</li>
            <li>Click en "Crear API token"</li>
            <li>Dale un nombre y copia el token generado</li>
            <li>Pega el token en el campo de arriba</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

