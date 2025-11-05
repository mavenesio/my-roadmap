"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, ArrowRight, Loader2, AlertCircle } from "lucide-react"
import type { WizardData } from "../initialization-wizard"
import { fetchJiraUsers, fetchStoriesFromEpic } from "@/lib/jira-client"
import type { JiraUser, JiraStory } from "@/lib/jira-client"

interface Step6Props {
  data: Partial<WizardData>
  onUpdate: (updates: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
  onAddMore: () => void
  onUpdateNavigation?: (canGoNext: boolean, isProcessing: boolean) => void
  onRegisterHandler?: (handler: (() => void | Promise<void>) | null) => void
}

export function Step6AddMoreBoards({ data, onUpdate, onNext, onBack, onAddMore, onUpdateNavigation, onRegisterHandler }: Step6Props) {
  const totalEpics = data.selectedEpics?.length || 0
  const totalBoards = data.jiraBoards?.length || 0
  const [isFetchingUsers, setIsFetchingUsers] = useState(false)
  const [error, setError] = useState("")

  const handleContinue = useCallback(async () => {
    setError("")
    setIsFetchingUsers(true)
    onUpdateNavigation?.(false, true) // Deshabilitar navegación durante fetch

    try {
      // STEP 1: Fetch stories for all selected epics
      console.log('📚 Fetching stories for all selected epics...')
      const selectedEpicsWithStories = []
      
      if (data.selectedEpics && data.selectedEpics.length > 0) {
        for (let i = 0; i < data.selectedEpics.length; i++) {
          const epicData = data.selectedEpics[i]
          const epic = epicData.epic
          const boardUrl = epicData.boardUrl
          
          // Find the board to get credentials
          const board = data.jiraBoards?.find(b => b.boardUrl === boardUrl)
          if (!board) {
            console.warn(`⚠️ Board not found for epic ${epic.key}`)
            selectedEpicsWithStories.push(epicData)
            continue
          }
          
          console.log(`  Fetching stories for ${epic.key} (${i + 1}/${data.selectedEpics.length})`)
          
          try {
            const domain = boardUrl.match(/^https?:\/\/[^\/]+/)?.[0] || ''
            const stories = await fetchStoriesFromEpic(
              epic.key,
              domain,
              board.email,
              board.token
            )
            
            console.log(`  ✅ Fetched ${stories.length} stories for ${epic.key}`)
            
            // Add stories to epic data
            selectedEpicsWithStories.push({
              ...epicData,
              stories: stories
            })
          } catch (err) {
            console.error(`  ❌ Error fetching stories for ${epic.key}:`, err)
            // Still add the epic without stories
            selectedEpicsWithStories.push(epicData)
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        console.log(`✅ Fetched stories for ${selectedEpicsWithStories.length} epics`)
      }
      
      // STEP 2: Fetch ALL users from all boards
      console.log('👥 Fetching all users from boards...')
      const allUsers: JiraUser[] = []
      const seenIds = new Set<string>()
      const usersWithAssignments = new Set<string>()

      // First, identify users with assignments
      for (const epicData of selectedEpicsWithStories) {
        if (epicData.stories && Array.isArray(epicData.stories)) {
          epicData.stories.forEach((story: any) => {
            if (story.assignee) {
              usersWithAssignments.add(story.assignee.accountId)
            }
          })
        }
      }

      console.log(`✅ Found ${usersWithAssignments.size} users with assigned tasks`)

      // Now fetch ALL users from each board
      if (data.jiraBoards && data.jiraBoards.length > 0) {
        for (const board of data.jiraBoards) {
          try {
            console.log(`  Fetching all users from board: ${board.boardUrl}`)
            const boardUsers = await fetchJiraUsers(
              board.boardUrl,
              board.email,
              board.token
            )
            
            // Add users to the list (avoiding duplicates)
            boardUsers.forEach(user => {
              if (!seenIds.has(user.accountId)) {
                seenIds.add(user.accountId)
                allUsers.push(user)
              }
            })
            
            console.log(`  ✅ Fetched ${boardUsers.length} users from board`)
          } catch (err) {
            console.error(`  ⚠️ Error fetching users from board ${board.boardUrl}:`, err)
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      console.log(`✅ Found ${allUsers.length} total users from all boards`)
      console.log(`   ${usersWithAssignments.size} users have assigned tasks`)
      
      // Save both stories and users to wizard data
      onUpdate({ 
        selectedEpics: selectedEpicsWithStories,
        jiraUsers: allUsers,
        usersWithAssignments: Array.from(usersWithAssignments)
      })
      
      // Proceed to next step
      setTimeout(() => {
        onNext()
      }, 500)
    } catch (err) {
      console.error('❌ Error fetching data:', err)
      setError(
        err instanceof Error 
          ? err.message 
          : "No se pudo obtener la información de Jira. Por favor intenta de nuevo."
      )
      onUpdateNavigation?.(true, false) // Rehabilitar navegación después de error
    } finally {
      setIsFetchingUsers(false)
    }
  }, [data.jiraBoards, data.selectedEpics, onUpdate, onNext, onUpdateNavigation])

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
        <h2 className="text-2xl font-bold mb-2">¿Agregar Más Boards?</h2>
        <p className="text-gray-600">
          Puedes agregar épicas de otro board de Jira o continuar con las seleccionadas
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isFetchingUsers && (
        <Alert className="border-blue-500 bg-blue-50 text-blue-900">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription>
            Obteniendo información de Jira (stories, subtasks y usuarios)... Esto puede tomar unos segundos.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Resumen Actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-blue-800">
            <strong>{totalBoards}</strong> board(s) configurado(s)
          </p>
          <p className="text-sm text-blue-800">
            <strong>{totalEpics}</strong> épica(s) seleccionada(s)
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={`cursor-pointer hover:shadow-lg transition-all ${isFetchingUsers ? 'opacity-50 pointer-events-none' : ''}`} onClick={onAddMore}>
          <CardHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-100">
              <Plus className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-center">Agregar Otro Board</CardTitle>
            <CardDescription className="text-center">
              Importa épicas desde otro board de Jira
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled={isFetchingUsers}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Board
            </Button>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:shadow-lg transition-all ${isFetchingUsers ? 'opacity-50 pointer-events-none' : ''}`} onClick={handleContinue}>
          <CardHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100">
              {isFetchingUsers ? <Loader2 className="w-8 h-8 text-blue-600 animate-spin" /> : <ArrowRight className="w-8 h-8 text-blue-600" />}
            </div>
            <CardTitle className="text-center">Continuar</CardTitle>
            <CardDescription className="text-center">
              Proceder con las épicas seleccionadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled={isFetchingUsers}>
              {isFetchingUsers ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Obteniendo usuarios...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Continuar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

