"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link as LinkIcon, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { WizardData } from "../initialization-wizard"
import { parseJiraBoardUrl, fetchEpicsFromBoard } from "@/lib/jira-client"
import { useJiraSync } from "@/hooks/use-jira-sync"
import { JiraCredentialsModal } from "@/components/jira-credentials-modal"
import { getSavedEmail, addBoard } from "@/lib/credentials-manager"

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
  
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [credentialsConfigured, setCredentialsConfigured] = useState(false)

  // Check if credentials are already configured
  useEffect(() => {
    const checkCredentials = async () => {
      const email = getSavedEmail()
      const token = await jiraSync.getToken()
      setCredentialsConfigured(!!(email && token))
    }
    checkCredentials()
  }, [jiraSync])

  const handleOpenModal = () => {
    setShowCredentialsModal(true)
  }

  const handleCredentialsSuccess = async (email: string) => {
    setShowCredentialsModal(false)
    setCredentialsConfigured(true)
    setSuccess(true)
    
    // Auto-continue to next step after a short delay
    setTimeout(() => {
      handleContinue()
    }, 1000)
  }

  const handleContinue = useCallback(async () => {
    setError("")
    setSuccess(false)

    // Check if credentials are configured
    const email = getSavedEmail()
    const token = await jiraSync.getToken()
    
    if (!email || !token) {
      setError("Por favor, configura tus credenciales de Jira primero")
      return
    }

    // Get the first board URL from saved boards, or ask user to configure
    const savedBoards = jiraSync.getBoards()
    if (!savedBoards.boards || savedBoards.boards.length === 0) {
      setError("No hay boards configurados. Por favor, configura al menos un board.")
      return
    }

    const boardUrl = savedBoards.boards[0].url

    // Validate by fetching epics
    setIsValidating(true)
    onUpdateNavigation?.(false, true)
    
    try {
      console.log('🔍 Validando conexión con Jira...')
      
      const epics = await fetchEpicsFromBoard(boardUrl)
      console.log(`✅ Conexión exitosa! Se encontraron ${epics.length} épicas`)
      
      if (!epics || epics.length === 0) {
        setError("No se encontraron épicas en este proyecto. Verifica que el proyecto tenga épicas creadas.")
        onUpdateNavigation?.(true, false)
        return
      }
      
      setSuccess(true)
      
      const parsed = parseJiraBoardUrl(boardUrl)
      const newBoard = {
        boardUrl: boardUrl,
        email: email,
        domain: parsed.domain,
        projectKey: parsed.projectKey,
        epics: epics,
      }

      // Agregar o actualizar el board en wizard data
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
      }
      
      setError(errorMessage)
      onUpdateNavigation?.(true, false)
    } finally {
      setIsValidating(false)
    }
  }, [data.jiraBoards, onUpdate, onNext, onUpdateNavigation, jiraSync])

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
            Configura tus credenciales de forma segura para acceder a Jira
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {credentialsConfigured ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-300">
                  Credenciales configuradas correctamente
                </AlertDescription>
              </Alert>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenModal}
                className="w-full"
              >
                Reconfigurar Credenciales
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Necesitas configurar tus credenciales de Jira para continuar. 
                Tus credenciales se guardarán de forma segura.
              </p>
              
              <Button
                type="button"
                onClick={handleOpenModal}
                className="w-full"
              >
                Configurar Credenciales
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isValidating && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Validando conexión con Jira...
              </span>
            </div>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                ¡Conexión exitosa con Jira!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          disabled={isValidating}
        >
          Anterior
        </Button>
        <Button 
          type="button"
          onClick={handleContinue}
          disabled={!credentialsConfigured || isValidating}
        >
          {isValidating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Validando...
            </>
          ) : (
            'Continuar'
          )}
        </Button>
      </div>

      {/* Centralized Credentials Modal */}
      <JiraCredentialsModal
        open={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        onSuccess={handleCredentialsSuccess}
        requireProjectKey={true}
        title="Configurar Jira"
        description="Ingresa tus credenciales y el Project Key para comenzar"
        isFirstTimeSetup={true}
      />
    </div>
  )
}
