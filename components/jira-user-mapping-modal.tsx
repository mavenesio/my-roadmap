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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Users, UserPlus, Link as LinkIcon, Check, X } from 'lucide-react'
import type { JiraUser } from '@/lib/jira-client'
import type { JiraUserMapping } from '@/hooks/use-jira-sync'
import type { TeamMember } from '@/hooks/use-roadmap-config'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface JiraUserMappingModalProps {
  open: boolean
  onClose: () => void
  jiraUsers: JiraUser[]
  systemUsers: TeamMember[]
  existingMappings: JiraUserMapping[]
  onSaveMappings: (mappings: JiraUserMapping[]) => void
  onCreateUser: (user: { name: string; avatarUrl: string }) => void
}

type MappingState = {
  [jiraAccountId: string]: {
    action: 'link' | 'create' | 'skip'
    systemUserName?: string
    newUserName?: string
  }
}

export function JiraUserMappingModal({
  open,
  onClose,
  jiraUsers,
  systemUsers,
  existingMappings,
  onSaveMappings,
  onCreateUser,
}: JiraUserMappingModalProps) {
  const [mappingState, setMappingState] = useState<MappingState>({})

  // Initialize mapping state with existing mappings
  useEffect(() => {
    const initialState: MappingState = {}
    
    jiraUsers.forEach(jiraUser => {
      const existingMapping = existingMappings.find(
        m => m.jiraAccountId === jiraUser.accountId
      )
      
      if (existingMapping) {
        initialState[jiraUser.accountId] = {
          action: 'link',
          systemUserName: existingMapping.systemUserName,
        }
      } else {
        // Try to find a matching system user by name
        const matchingUser = systemUsers.find(
          u => u.name.toLowerCase() === jiraUser.displayName.toLowerCase()
        )
        
        if (matchingUser) {
          initialState[jiraUser.accountId] = {
            action: 'link',
            systemUserName: matchingUser.name,
          }
        } else {
          initialState[jiraUser.accountId] = {
            action: 'create',
            newUserName: jiraUser.displayName,
          }
        }
      }
    })
    
    setMappingState(initialState)
  }, [jiraUsers, systemUsers, existingMappings])

  const handleActionChange = (jiraAccountId: string, action: 'link' | 'create' | 'skip') => {
    const jiraUser = jiraUsers.find(u => u.accountId === jiraAccountId)
    
    setMappingState(prev => ({
      ...prev,
      [jiraAccountId]: {
        ...prev[jiraAccountId],
        action,
        newUserName: action === 'create' ? (jiraUser?.displayName || '') : undefined,
        systemUserName: action === 'link' ? systemUsers[0]?.name : undefined,
      },
    }))
  }

  const handleSystemUserChange = (jiraAccountId: string, systemUserName: string) => {
    setMappingState(prev => ({
      ...prev,
      [jiraAccountId]: {
        ...prev[jiraAccountId],
        systemUserName,
      },
    }))
  }

  const handleNewUserNameChange = (jiraAccountId: string, newUserName: string) => {
    setMappingState(prev => ({
      ...prev,
      [jiraAccountId]: {
        ...prev[jiraAccountId],
        newUserName,
      },
    }))
  }

  const handleSave = () => {
    const newMappings: JiraUserMapping[] = []
    
    jiraUsers.forEach(jiraUser => {
      const state = mappingState[jiraUser.accountId]
      
      if (!state || state.action === 'skip') {
        return
      }
      
      if (state.action === 'create' && state.newUserName) {
        // Create new user in the system
        onCreateUser({
          name: state.newUserName,
          avatarUrl: jiraUser.avatarUrls['48x48'],
        })
        
        // Add mapping
        newMappings.push({
          jiraAccountId: jiraUser.accountId,
          jiraDisplayName: jiraUser.displayName,
          jiraAvatarUrl: jiraUser.avatarUrls['48x48'],
          systemUserName: state.newUserName,
        })
      } else if (state.action === 'link' && state.systemUserName) {
        // Link to existing user
        newMappings.push({
          jiraAccountId: jiraUser.accountId,
          jiraDisplayName: jiraUser.displayName,
          jiraAvatarUrl: jiraUser.avatarUrls['48x48'],
          systemUserName: state.systemUserName,
        })
      }
    })
    
    onSaveMappings(newMappings)
    onClose()
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Mapear Usuarios de Jira
          </DialogTitle>
          <DialogDescription>
            Vincula los usuarios de Jira con los usuarios del sistema o crea nuevos usuarios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto max-h-[50vh]">
          {jiraUsers.map(jiraUser => {
            const state = mappingState[jiraUser.accountId]
            const action = state?.action || 'skip'
            
            return (
              <div
                key={jiraUser.accountId}
                className="border rounded-lg p-4 space-y-3 bg-card"
              >
                {/* Jira User Info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={jiraUser.avatarUrls['48x48']} alt={jiraUser.displayName} />
                    <AvatarFallback>{getInitials(jiraUser.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold">{jiraUser.displayName}</div>
                    {jiraUser.emailAddress && (
                      <div className="text-xs text-muted-foreground">{jiraUser.emailAddress}</div>
                    )}
                  </div>
                </div>

                {/* Action Selection */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={action === 'link' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleActionChange(jiraUser.accountId, 'link')}
                    className="gap-2"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Vincular
                  </Button>
                  <Button
                    type="button"
                    variant={action === 'create' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleActionChange(jiraUser.accountId, 'create')}
                    className="gap-2"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Crear Nuevo
                  </Button>
                  <Button
                    type="button"
                    variant={action === 'skip' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleActionChange(jiraUser.accountId, 'skip')}
                    className="gap-2"
                  >
                    <X className="h-3.5 w-3.5" />
                    Omitir
                  </Button>
                </div>

                {/* Link Action */}
                {action === 'link' && (
                  <div className="space-y-2">
                    <Label htmlFor={`system-user-${jiraUser.accountId}`} className="text-sm">
                      Vincular con usuario del sistema
                    </Label>
                    <Select
                      value={state?.systemUserName}
                      onValueChange={(value) => handleSystemUserChange(jiraUser.accountId, value)}
                    >
                      <SelectTrigger id={`system-user-${jiraUser.accountId}`}>
                        <SelectValue placeholder="Selecciona un usuario" />
                      </SelectTrigger>
                      <SelectContent>
                        {systemUsers.map(user => (
                          <SelectItem key={user.name} value={user.name}>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ backgroundColor: user.color }}
                              />
                              {user.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Create Action */}
                {action === 'create' && (
                  <div className="space-y-2">
                    <Label htmlFor={`new-user-${jiraUser.accountId}`} className="text-sm">
                      Nombre del nuevo usuario
                    </Label>
                    <Input
                      id={`new-user-${jiraUser.accountId}`}
                      value={state?.newUserName || ''}
                      onChange={(e) => handleNewUserNameChange(jiraUser.accountId, e.target.value)}
                      placeholder="Nombre completo"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se creará un nuevo usuario con la foto de Jira
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Check className="h-4 w-4" />
            Guardar Mapeos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

