"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, CheckCircle2, Info, ExternalLink } from 'lucide-react'
import { saveJiraCredentials, validateJiraCredentials, getSavedEmail } from '@/lib/credentials-manager'

interface JiraCredentialsModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: (email: string) => void
  /** Optional project key for validation. If provided, validates credentials against this project */
  projectKey?: string
  /** If true, requires project key for validation */
  requireProjectKey?: boolean
  /** Custom title for the modal */
  title?: string
  /** Custom description for the modal */
  description?: string
  /** If true, shows this is a first-time setup */
  isFirstTimeSetup?: boolean
}

export function JiraCredentialsModal({
  open,
  onClose,
  onSuccess,
  projectKey: providedProjectKey,
  requireProjectKey = false,
  title,
  description,
  isFirstTimeSetup = false,
}: JiraCredentialsModalProps) {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [projectKey, setProjectKey] = useState(providedProjectKey || '')
  const [rememberToken, setRememberToken] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load saved email on mount
  useEffect(() => {
    if (open) {
      const savedEmail = getSavedEmail()
      if (savedEmail) {
        setEmail(savedEmail)
      }
    }
  }, [open])

  // Update projectKey if providedProjectKey changes
  useEffect(() => {
    if (providedProjectKey) {
      setProjectKey(providedProjectKey)
    }
  }, [providedProjectKey])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setToken('')
      setError(null)
      setSuccess(false)
      setIsValidating(false)
      if (!providedProjectKey) {
        setProjectKey('')
      }
    }
  }, [open, providedProjectKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (!email.trim()) {
      setError('Por favor, ingresa tu email de Jira')
      return
    }

    if (!token.trim()) {
      setError('Por favor, ingresa tu API token de Jira')
      return
    }

    if (requireProjectKey && !projectKey.trim()) {
      setError('Por favor, ingresa el Project Key de Jira')
      return
    }

    setIsValidating(true)

    try {
      // If we have a projectKey, validate credentials
      if (projectKey.trim()) {
        const result = await validateJiraCredentials(
          projectKey.trim().toUpperCase(),
          email.trim(),
          token.trim()
        )

        if (!result.valid) {
          setError(result.error || 'Credenciales inválidas')
          setIsValidating(false)
          return
        }

        // Validation successful
        setSuccess(true)
      }

      // Save credentials
      await saveJiraCredentials({
        email: email.trim(),
        token: token.trim(),
        rememberToken,
      })

      // Wait a bit to show success message
      await new Promise(resolve => setTimeout(resolve, 800))

      // Call success callback
      if (onSuccess) {
        onSuccess(email.trim())
      }

      // Close modal
      onClose()
    } catch (err) {
      console.error('Error saving credentials:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar credenciales')
    } finally {
      setIsValidating(false)
    }
  }

  const handleCancel = () => {
    if (!isValidating) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  {isFirstTimeSetup ? 'Configuración Exitosa' : 'Credenciales Guardadas'}
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  {title || (isFirstTimeSetup ? 'Configurar Jira' : 'Credenciales de Jira')}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {success
                ? 'Tus credenciales han sido guardadas de forma segura.'
                : description || 'Ingresa tus credenciales de Jira para continuar.'
              }
            </DialogDescription>
          </DialogHeader>

          {!success && (
            <div className="space-y-4 py-4">
              {/* Project Key (if required) */}
              {requireProjectKey && (
                <div className="space-y-2">
                  <Label htmlFor="project-key">
                    Project Key *
                  </Label>
                  <Input
                    id="project-key"
                    type="text"
                    placeholder="TMSGWEBSEC"
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                    disabled={isValidating || !!providedProjectKey}
                    required={requireProjectKey}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    El código del proyecto en Jira (ej: TMSGWEBSEC)
                  </p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email de Jira *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu-email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isValidating}
                  autoFocus={!email}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  El email que usas para iniciar sesión en Jira
                </p>
              </div>

              {/* Token */}
              <div className="space-y-2">
                <Label htmlFor="token">
                  API Token de Jira *
                </Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="Tu API token de Jira"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={isValidating}
                  autoFocus={!!email}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Genera tu token en:{' '}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Atlassian API Tokens
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              {/* Remember Token */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="remember-token"
                  checked={rememberToken}
                  onCheckedChange={(checked) => setRememberToken(checked as boolean)}
                  disabled={isValidating}
                />
                <label
                  htmlFor="remember-token"
                  className="text-sm text-muted-foreground cursor-pointer leading-tight"
                >
                  Recordar token (permanece hasta que lo borres manualmente)
                </label>
              </div>

              {/* Info about session storage */}
              {!rememberToken && (
                <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
                    Sin marcar esta opción, el token se guardará solo para esta sesión del navegador
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isValidating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isValidating || !email.trim() || !token.trim() || (requireProjectKey && !projectKey.trim())}
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : success ? (
                'Continuar'
              ) : (
                'Guardar Credenciales'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

