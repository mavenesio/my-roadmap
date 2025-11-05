"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Loader2, CheckSquare, Square, Search } from "lucide-react"
import type { WizardData } from "../initialization-wizard"
import type { JiraUser } from "@/lib/jira-client"

interface Step7Props {
  data: Partial<WizardData>
  onUpdate: (updates: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
  onRegisterHandler?: (handler: (() => void | Promise<void>) | null) => void
}

export function Step7SelectUsers({ data, onUpdate, onNext, onBack, onRegisterHandler }: Step7Props) {
  const [users, setUsers] = useState<JiraUser[]>([])
  const [usersWithAssignments, setUsersWithAssignments] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    // Use users from wizard data (fetched in step 6)
    if (data.jiraUsers) {
      console.log('👥 Using users from previous step:', data.jiraUsers.length)
      setUsers(data.jiraUsers)
      
      // Mark users with assignments
      const assignedSet = new Set(data.usersWithAssignments || [])
      setUsersWithAssignments(assignedSet)
      
      // Preselect only users with assignments
      setSelectedUsers(assignedSet)
      
      console.log(`  ${assignedSet.size} users with assignments (preselected)`)
      console.log(`  ${data.jiraUsers.length - assignedSet.size} users without assignments`)
    } else {
      console.warn('⚠️ No users found in wizard data')
    }
  }, [data.jiraUsers, data.usersWithAssignments])

  const toggleUser = (accountId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId)
    } else {
      newSelected.add(accountId)
    }
    setSelectedUsers(newSelected)
  }

  const selectAllAssigned = () => {
    setSelectedUsers(new Set(usersWithAssignments))
  }

  const selectAllUsers = () => {
    setSelectedUsers(new Set(users.map(u => u.accountId)))
  }

  const deselectAll = () => {
    setSelectedUsers(new Set())
  }

  // Separate users into two groups and sort selected first
  const assignedUsers = users
    .filter(u => usersWithAssignments.has(u.accountId))
    .sort((a, b) => {
      const aSelected = selectedUsers.has(a.accountId)
      const bSelected = selectedUsers.has(b.accountId)
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      return 0
    })
    
  const unassignedUsers = users.filter(u => !usersWithAssignments.has(u.accountId))

  // Filter unassigned users by search term
  const filteredUnassignedUsers = unassignedUsers
    .filter(user => 
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    // Sort: selected users first, then unselected
    .sort((a, b) => {
      const aSelected = selectedUsers.has(a.accountId)
      const bSelected = selectedUsers.has(b.accountId)
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      return 0
    })

  const handleContinue = useCallback(() => {
    const selectedUsersData = users
      .filter(u => selectedUsers.has(u.accountId))
      .map(u => ({
        jiraAccountId: u.accountId,
        displayName: u.displayName,
        email: u.emailAddress || "",
        avatarUrl: u.avatarUrls?.["48x48"] || "",
        systemUserName: u.displayName, // Use Jira name as system name
      }))

    onUpdate({ selectedUsers: selectedUsersData })
    onNext()
  }, [users, selectedUsers, onUpdate, onNext])

  // Register this step's continue handler with the wizard
  useEffect(() => {
    onRegisterHandler?.(handleContinue)
    
    // Cleanup: unregister on unmount
    return () => {
      onRegisterHandler?.(null)
    }
  }, [handleContinue, onRegisterHandler])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-gray-600">Cargando usuarios desde Jira...</p>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">No se encontraron usuarios</h2>
          <p className="text-gray-600 mb-6">
            No hay usuarios asignados a las stories de las épicas seleccionadas.
          </p>
          <p className="text-sm text-muted-foreground">
            Esto puede ocurrir si las stories no tienen asignados. Puedes continuar sin agregar usuarios o volver atrás para seleccionar otras épicas.
          </p>
        </div>
      </div>
    )
  }

  const renderUserCard = (user: JiraUser) => {
    const isSelected = selectedUsers.has(user.accountId)
    
    return (
      <Card
        key={user.accountId}
        className={`cursor-pointer transition-all ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => toggleUser(user.accountId)}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleUser(user.accountId)}
          />
          <Avatar>
            <AvatarImage src={user.avatarUrls?.["48x48"]} />
            <AvatarFallback>
              {user.displayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user.displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user.emailAddress}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Selecciona Usuarios</h2>
        <p className="text-gray-600">
          Usuarios con tareas asignadas en las épicas seleccionadas
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            {selectedUsers.size} de {users.length} usuarios seleccionados
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {assignedUsers.length} con tareas asignadas • {unassignedUsers.length} sin asignaciones
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={selectAllUsers}>
            <CheckSquare className="w-4 h-4 mr-2" />
            Seleccionar todos
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            <Square className="w-4 h-4 mr-2" />
            Deseleccionar todos
          </Button>
        </div>
      </div>

      {/* Users with assignments - Preselected */}
      {assignedUsers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                Usuarios con Tareas Asignadas ({assignedUsers.filter(u => selectedUsers.has(u.accountId)).length}/{assignedUsers.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Los seleccionados aparecen primero
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={selectAllAssigned}
              className="text-xs"
            >
              Seleccionar todos con tareas
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-200 dark:border-green-800">
            {assignedUsers.map(renderUserCard)}
          </div>
        </div>
      )}

      {/* Users without assignments - Not preselected */}
      {unassignedUsers.length > 0 && (
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Otros Usuarios Disponibles ({unassignedUsers.filter(u => selectedUsers.has(u.accountId)).length}/{unassignedUsers.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Los seleccionados aparecen primero • Usa el buscador para encontrar usuarios
              </p>
            </div>
            <div className="relative w-64 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-h-[400px] max-h-[600px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            {filteredUnassignedUsers.length > 0 ? (
              filteredUnassignedUsers.map(renderUserCard)
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                {searchTerm ? "No se encontraron usuarios con ese criterio" : "No hay usuarios adicionales"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

