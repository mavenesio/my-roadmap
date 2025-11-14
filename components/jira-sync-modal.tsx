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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Link as LinkIcon, Loader2, Plus, Trash2, Settings } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { JiraCredentialsModal } from '@/components/jira-credentials-modal'
import { hasValidToken, getSavedEmail, type JiraBoard, type SavedJiraBoards } from '@/lib/credentials-manager'

interface JiraSyncModalProps {
  open: boolean
  onClose: () => void
  onSync: (boardUrl: string) => Promise<void>
  onRefreshExisting?: (boardUrl: string) => Promise<void>
  savedBoards: SavedJiraBoards
  hasExistingEpics?: boolean
  isLoading: boolean
  error: string | null
  progress: {
    current: number
    total: number
    message: string
  } | null
  onAddBoard?: (board: JiraBoard, email: string) => void
  onRemoveBoard?: (boardId: string) => void
}

export function JiraSyncModal({
  open,
  onClose,
  onSync,
  onRefreshExisting,
  savedBoards,
  hasExistingEpics = false,
  isLoading,
  error,
  progress,
  onAddBoard,
  onRemoveBoard,
}: JiraSyncModalProps) {
  const [isAddingNewBoard, setIsAddingNewBoard] = useState(false)
  const [selectedBoardId, setSelectedBoardId] = useState<string>('')
  const [newBoardUrl, setNewBoardUrl] = useState('')
  const [newBoardName, setNewBoardName] = useState('')
  const [validationError, setValidationError] = useState<string>('')
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)

  // Check if we have credentials
  useEffect(() => {
    const checkCredentials = async () => {
      const email = getSavedEmail()
      const token = await hasValidToken()
      setHasCredentials(!!(email && token))
    }
    checkCredentials()
  }, [open])

  // Select first board if available
  useEffect(() => {
    if (savedBoards.boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(savedBoards.boards[0].id)
    }
  }, [savedBoards, selectedBoardId])
  
  // Clear validation error when fields change
  useEffect(() => {
    if (validationError) {
      setValidationError('')
    }
  }, [selectedBoardId])
  
  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setIsAddingNewBoard(false)
      setNewBoardUrl('')
      setNewBoardName('')
      setValidationError('')
    } else {
      setValidationError('')
    }
  }, [open])

  const handleAddNewBoard = () => {
    if (!newBoardUrl.trim() || !newBoardName.trim()) {
      return
    }
    
    const email = getSavedEmail()
    if (!email) {
      setValidationError('No hay email configurado. Por favor, configura tus credenciales primero.')
      return
    }
    
    // Treat newBoardUrl as a project key (e.g., TMSGWEBSEC)
    const projectKey = newBoardUrl.trim().toUpperCase()
    
    // Validate project key format
    if (!/^[A-Z0-9]+$/.test(projectKey)) {
      setValidationError('El Project Key debe contener solo letras mayúsculas y números (ej: TMSGWEBSEC)')
      return
    }
    
    const newBoard: JiraBoard = {
      id: projectKey, // Use project key as ID
      name: newBoardName.trim(),
      projectKey: projectKey,
    }
    
    if (onAddBoard) {
      onAddBoard(newBoard, email)
    }
    
    setSelectedBoardId(projectKey)
    setIsAddingNewBoard(false)
    setNewBoardUrl('')
    setNewBoardName('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')
    
    // Check if we have credentials
    if (!hasCredentials) {
      setValidationError('No hay credenciales configuradas. Por favor, configura tus credenciales primero.')
      setShowCredentialsModal(true)
      return
    }
    
    const selectedBoard = savedBoards.boards.find(b => b.id === selectedBoardId)
    const boardUrl = selectedBoard?.url || ''
    
    if (!boardUrl.trim()) {
      setValidationError('Por favor selecciona un tablero')
      return
    }

    try {
      await onSync(boardUrl.trim())
      setValidationError('')
    } catch (err) {
      console.error('Sync error:', err)
    }
  }

  const handleRefresh = async () => {
    setValidationError('')
    
    // Check if we have credentials
    if (!hasCredentials) {
      setValidationError('No hay credenciales configuradas. Por favor, configura tus credenciales primero.')
      setShowCredentialsModal(true)
      return
    }
    
    const selectedBoard = savedBoards.boards.find(b => b.id === selectedBoardId)
    const boardUrl = selectedBoard?.url || ''
    
    if (!boardUrl.trim()) {
      setValidationError('Por favor selecciona un tablero')
      return
    }

    try {
      if (onRefreshExisting) {
        await onRefreshExisting(boardUrl.trim())
      }
      setValidationError('')
    } catch (err) {
      console.error('Refresh error:', err)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const handleCredentialsSuccess = async () => {
    setShowCredentialsModal(false)
    const email = getSavedEmail()
    const token = await hasValidToken()
    setHasCredentials(!!(email && token))
  }

  const selectedBoard = savedBoards.boards.find(b => b.id === selectedBoardId)
  const showBoardSelection = !isAddingNewBoard && savedBoards.boards.length > 0

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <LinkIcon className="h-5 w-5 text-primary" />
              </div>
              Sincronizar con Jira
            </DialogTitle>
            <DialogDescription>
              Conecta tu tablero de Jira para importar épicas y stories al roadmap
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            {/* Credentials Status */}
            {!hasCredentials && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No hay credenciales configuradas.{' '}
                  <button
                    type="button"
                    onClick={() => setShowCredentialsModal(true)}
                    className="underline font-medium"
                  >
                    Configurar ahora
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {/* Board Selection or Add New */}
            {!isAddingNewBoard ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="board" className="text-sm font-medium">
                    Tablero
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCredentialsModal(true)}
                    className="h-8 px-2 text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Credenciales
                  </Button>
                </div>
                
                {showBoardSelection ? (
                  <div className="space-y-3">
                    <Select value={selectedBoardId} onValueChange={setSelectedBoardId} disabled={isLoading}>
                      <SelectTrigger id="board" className="h-10">
                        <SelectValue placeholder="Selecciona un tablero" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedBoards.boards.map((board) => (
                          <SelectItem key={board.id} value={board.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{board.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedBoard && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <LinkIcon className="h-3 w-3" />
                        <span className="truncate">{selectedBoard.projectKey}</span>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingNewBoard(true)}
                      disabled={isLoading}
                      className="w-full h-9"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar nuevo tablero
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingNewBoard(true)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar un tablero
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="new-board-name">Nombre del Tablero</Label>
                  <Input
                    id="new-board-name"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="Mi Proyecto"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-board-url">Project Key</Label>
                  <Input
                    id="new-board-url"
                    value={newBoardUrl}
                    onChange={(e) => setNewBoardUrl(e.target.value.toUpperCase())}
                    placeholder="TMSGWEBSEC"
                    disabled={isLoading}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    El código del proyecto en Jira
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingNewBoard(false)
                      setNewBoardUrl('')
                      setNewBoardName('')
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddNewBoard}
                    disabled={!newBoardName.trim() || !newBoardUrl.trim() || isLoading}
                    className="flex-1"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isLoading && progress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{progress.message}</span>
                  <span className="font-medium">{Math.round(progress.current)}%</span>
                </div>
                <Progress value={progress.current} className="h-1.5" />
              </div>
            )}

            {/* Validation Error Message */}
            {validationError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs ml-2">
                  {validationError}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm whitespace-pre-line">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </form>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            {hasExistingEpics && onRefreshExisting && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleRefresh}
                disabled={!selectedBoard || isLoading || !hasCredentials}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  'Actualizar Existentes'
                )}
              </Button>
            )}
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={!selectedBoard || isLoading || !hasCredentials}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                hasExistingEpics ? 'Importar Nuevas' : 'Sincronizar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Centralized Credentials Modal */}
      <JiraCredentialsModal
        open={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        onSuccess={handleCredentialsSuccess}
        requireProjectKey={false}
        title="Configurar Credenciales de Jira"
        description="Actualiza o configura tus credenciales para acceder a Jira"
      />
    </>
  )
}
