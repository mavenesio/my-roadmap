"use client"

import { useState } from 'react'
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
import { AlertCircle } from 'lucide-react'

interface TokenRequestModalProps {
  open: boolean
  onSubmit: (token: string, rememberToken: boolean) => void
  onCancel: () => void
}

export function TokenRequestModal({ open, onSubmit, onCancel }: TokenRequestModalProps) {
  const [token, setToken] = useState('')
  const [rememberToken, setRememberToken] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (token.trim()) {
      onSubmit(token.trim(), rememberToken)
      setToken('')
      setRememberToken(false)
    }
  }

  const handleClose = () => {
    setToken('')
    setRememberToken(false)
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Token de Jira Requerido
            </DialogTitle>
            <DialogDescription>
              No hay token guardado. Por favor ingresa tu token de Jira:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token-input">Token de API</Label>
              <Input
                id="token-input"
                type="password"
                placeholder="Ingresa tu token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoFocus
                required
              />
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="remember-token-modal"
                  checked={rememberToken}
                  onCheckedChange={(checked) => setRememberToken(checked as boolean)}
                />
                <label
                  htmlFor="remember-token-modal"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Recordar token para futuras sincronizaciones
                </label>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Puedes obtener tu token en:{' '}
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Atlassian API Tokens
              </a>
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!token.trim()}>
              Aceptar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

