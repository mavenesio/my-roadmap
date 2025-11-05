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
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, Link as LinkIcon, Key, Loader2, CheckCircle2, Info, Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface SavedJiraCredentials {
  boardUrl: string
  email: string
  token: string
}

interface JiraBoard {
  id: string
  name: string
  url: string
}

interface SavedJiraBoards {
  email: string
  boards: JiraBoard[]
}

interface JiraSyncModalProps {
  open: boolean
  onClose: () => void
  onSync: (boardUrl: string, email: string, token: string, rememberToken: boolean) => Promise<void>
  onRefreshExisting?: (boardUrl: string, email: string, token: string) => Promise<void>
  savedCredentials: SavedJiraCredentials | null
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
  savedCredentials,
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
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [rememberToken, setRememberToken] = useState(false)
  const [showTokenInfo, setShowTokenInfo] = useState(false)
  const [validationError, setValidationError] = useState<string>('')

  const hasToken = Boolean(savedCredentials?.token)

  // Load saved email, token (if available), and select first board if available
  useEffect(() => {
    if (savedBoards.email) {
      setEmail(savedBoards.email)
    }
    if (savedBoards.boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(savedBoards.boards[0].id)
    }
    // Pre-load token if saved
    if (savedCredentials?.token) {
      setToken(savedCredentials.token)
      setRememberToken(true)
    }
  }, [savedBoards, savedCredentials, selectedBoardId])
  
  // Clear validation error when fields change
  useEffect(() => {
    if (validationError) {
      setValidationError('')
    }
  }, [selectedBoardId, email, token])
  
  // Reset form when modal closes (but keep saved email and token)
  useEffect(() => {
    if (!open) {
      // Reset only new board fields
      setIsAddingNewBoard(false)
      setNewBoardUrl('')
      setNewBoardName('')
      setValidationError('')
      // Don't reset token if it's saved
      if (!savedCredentials?.token) {
        setToken('')
      }
    } else {
      // Clear errors when opening
      setValidationError('')
    }
  }, [open, savedCredentials])

  const handleAddNewBoard = () => {
    if (!newBoardUrl.trim() || !newBoardName.trim() || !email.trim()) {
      return
    }
    
    // Parse URL to get board ID
    try {
      const url = new URL(newBoardUrl)
      const boardMatch = url.pathname.match(/\/boards\/(\d+)/)
      const boardId = boardMatch ? boardMatch[1] : Date.now().toString()
      
      const newBoard: JiraBoard = {
        id: boardId,
        name: newBoardName.trim(),
        url: newBoardUrl.trim()
      }
      
      if (onAddBoard) {
        onAddBoard(newBoard, email.trim())
      }
      
      setSelectedBoardId(boardId)
      setIsAddingNewBoard(false)
      setNewBoardUrl('')
      setNewBoardName('')
    } catch (err) {
      console.error('Invalid URL:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')
    
    const selectedBoard = savedBoards.boards.find(b => b.id === selectedBoardId)
    const boardUrl = selectedBoard?.url || ''
    
    // Validar todos los campos requeridos
    if (!boardUrl.trim()) {
      setValidationError('Por favor selecciona un tablero')
      return
    }
    
    if (!email.trim()) {
      setValidationError('Por favor ingresa tu email')
      return
    }
    
    if (!token.trim()) {
      setValidationError('Por favor ingresa tu token')
      return
    }

    try {
      await onSync(boardUrl.trim(), email.trim(), token.trim(), rememberToken)
      setValidationError('')
    } catch (err) {
      // Error is handled by the parent component
      console.error('Sync error:', err)
    }
  }

  const handleRefresh = async () => {
    setValidationError('')
    
    const selectedBoard = savedBoards.boards.find(b => b.id === selectedBoardId)
    const boardUrl = selectedBoard?.url || ''
    
    // Validar todos los campos requeridos
    if (!boardUrl.trim()) {
      setValidationError('Por favor selecciona un tablero')
      return
    }
    
    if (!email.trim()) {
      setValidationError('Por favor ingresa tu email')
      return
    }
    
    if (!token.trim()) {
      setValidationError('Por favor ingresa tu token')
      return
    }

    try {
      if (onRefreshExisting) {
        await onRefreshExisting(boardUrl.trim(), email.trim(), token.trim())
      }
      setValidationError('')
    } catch (err) {
      // Error is handled by the parent component
      console.error('Refresh error:', err)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const selectedBoard = savedBoards.boards.find(b => b.id === selectedBoardId)
  const isFormValid = (selectedBoard || isAddingNewBoard) && email.trim() !== '' && token.trim() !== ''
  const showBoardSelection = !isAddingNewBoard && savedBoards.boards.length > 0

  return (
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
          {/* Board Selection or Add New */}
          {!isAddingNewBoard ? (
            <div className="space-y-2">
              <Label htmlFor="board" className="text-sm font-medium">
                Tablero
              </Label>
              
              {showBoardSelection ? (
                <div className="flex gap-2">
                  <Select
                    value={selectedBoardId}
                    onValueChange={setSelectedBoardId}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-10 flex-1">
                      <SelectValue placeholder="Selecciona un tablero" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedBoards.boards.map((board) => (
                        <SelectItem key={board.id} value={board.id}>
                          {board.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAddingNewBoard(true)}
                    disabled={isLoading}
                    className="h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  {selectedBoardId && onRemoveBoard && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (confirm('¿Eliminar este tablero?')) {
                          onRemoveBoard(selectedBoardId)
                          setSelectedBoardId('')
                        }
                      }}
                      disabled={isLoading}
                      className="h-10 w-10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingNewBoard(true)}
                  disabled={isLoading}
                  className="w-full h-10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar tablero
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Nuevo Tablero</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingNewBoard(false)
                    setNewBoardName('')
                    setNewBoardUrl('')
                  }}
                  className="h-7 px-2"
                >
                  Cancelar
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newBoardName" className="text-sm">
                  Nombre
                </Label>
                <Input
                  id="newBoardName"
                  type="text"
                  placeholder="Security Team"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newBoardUrl" className="text-sm">
                  URL
                </Label>
                <Input
                  id="newBoardUrl"
                  type="url"
                  placeholder="https://company.atlassian.net/..."
                  value={newBoardUrl}
                  onChange={(e) => setNewBoardUrl(e.target.value)}
                  className="h-9"
                />
              </div>
              
              <Button
                type="button"
                onClick={handleAddNewBoard}
                disabled={!newBoardName.trim() || !newBoardUrl.trim() || !email.trim()}
                className="w-full h-9"
                size="sm"
              >
                Guardar
              </Button>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu-email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-10"
              required
            />
          </div>

          {/* Token Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="token" className="text-sm font-medium">
                Token de API
              </Label>
              {!hasToken && (
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  Obtener token
                </a>
              )}
            </div>
            {hasToken ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-900 dark:text-green-100">
                  Usando token guardado
                </span>
              </div>
            ) : (
              <>
                <Input
                  id="token"
                  type="password"
                  placeholder="Ingresa tu token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={isLoading}
                  className="h-10"
                  required
                />
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="remember-token"
                    checked={rememberToken}
                    onCheckedChange={(checked) => setRememberToken(checked as boolean)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="remember-token"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Recordar token para futuras sincronizaciones
                  </label>
                </div>
              </>
            )}
          </div>

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
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs ml-2">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {!isLoading && progress && progress.current === 100 && !error && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <AlertDescription className="text-xs text-green-900 dark:text-green-100 ml-2">
                Sincronización completada
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              size="sm"
            >
              {progress?.current === 100 ? 'Cerrar' : 'Cancelar'}
            </Button>
            {hasExistingEpics && onRefreshExisting && !isAddingNewBoard && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleRefresh}
                disabled={!isFormValid || isLoading}
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Actualizar'
                )}
              </Button>
            )}
            {!isAddingNewBoard && (
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  hasExistingEpics ? 'Agregar' : 'Sincronizar'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

