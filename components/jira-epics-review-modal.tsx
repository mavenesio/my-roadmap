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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, List, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import type { JiraEpic, JiraStory } from '@/lib/jira-client'

type Priority = "Milestone" | "1" | "2" | "3"
type Size = "XS" | "S" | "M" | "L" | "XL"

export interface EpicConfiguration {
  epicKey: string
  priority: Priority
  track: string
  size: Size
  type: string
}

interface JiraEpicsReviewModalProps {
  open: boolean
  onClose: () => void
  epics: JiraEpic[]
  stories: { epicKey: string; stories: JiraStory[] }[]
  tracks: string[]
  priorities: Array<{ name: string; color: string }>
  sizes: string[]
  types: Array<{ name: string; color: string }>
  defaultPriority?: Priority
  defaultTrack?: string
  defaultSize?: Size
  defaultType?: string
  onConfirm: (selectedEpicKeys: string[], configurations: EpicConfiguration[]) => Promise<void>
}

export function JiraEpicsReviewModal({
  open,
  onClose,
  epics,
  stories,
  tracks,
  priorities,
  sizes,
  types,
  defaultPriority = "3",
  defaultTrack,
  defaultSize = "M",
  defaultType,
  onConfirm,
}: JiraEpicsReviewModalProps) {
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set())
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set())
  const [epicConfigurations, setEpicConfigurations] = useState<Map<string, EpicConfiguration>>(new Map())
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize epic configurations with defaults
  useEffect(() => {
    if (epics.length > 0) {
      setSelectedEpics(new Set(epics.map(e => e.key)))
      
      const initialConfigs = new Map<string, EpicConfiguration>()
      epics.forEach(epic => {
        initialConfigs.set(epic.key, {
          epicKey: epic.key,
          priority: defaultPriority,
          track: defaultTrack || tracks[0] || "",
          size: defaultSize,
          type: defaultType || types[0]?.name || "",
        })
      })
      setEpicConfigurations(initialConfigs)
    }
  }, [epics, defaultPriority, defaultTrack, defaultSize, defaultType, tracks, types])

  const toggleEpic = (epicKey: string) => {
    setSelectedEpics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(epicKey)) {
        newSet.delete(epicKey)
      } else {
        newSet.add(epicKey)
      }
      return newSet
    })
  }

  const toggleExpanded = (epicKey: string) => {
    setExpandedEpics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(epicKey)) {
        newSet.delete(epicKey)
      } else {
        newSet.add(epicKey)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    setSelectedEpics(new Set(epics.map(e => e.key)))
  }

  const handleDeselectAll = () => {
    setSelectedEpics(new Set())
  }

  const updateEpicConfig = (epicKey: string, field: keyof Omit<EpicConfiguration, 'epicKey'>, value: string) => {
    setEpicConfigurations(prev => {
      const newMap = new Map(prev)
      const currentConfig = newMap.get(epicKey)
      if (currentConfig) {
        newMap.set(epicKey, {
          ...currentConfig,
          [field]: value,
        })
      }
      return newMap
    })
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      const selectedKeys = Array.from(selectedEpics)
      const selectedConfigs = selectedKeys
        .map(key => epicConfigurations.get(key))
        .filter((config): config is EpicConfiguration => config !== undefined)
      
      await onConfirm(selectedKeys, selectedConfigs)
      // Modal will be closed by parent component after processing
    } catch (error) {
      console.error('Error confirming epics:', error)
      setIsProcessing(false)
    }
  }

  const getStoriesForEpic = (epicKey: string) => {
    return stories.find(s => s.epicKey === epicKey)?.stories || []
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    
    if (statusLower.includes('done') || statusLower.includes('completado')) {
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-100'
    }
    if (statusLower.includes('progress') || statusLower.includes('wip')) {
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-100'
    }
    if (statusLower.includes('todo') || statusLower.includes('backlog')) {
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-100'
    }
    
    return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-100'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <List className="h-5 w-5 text-primary" />
            </div>
            Revisar Épicas de Jira
          </DialogTitle>
          <DialogDescription>
            Selecciona las épicas que deseas importar al roadmap. Luego obtendremos las stories de cada épica seleccionada.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Actions */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="text-sm text-muted-foreground">
            {selectedEpics.size} de {epics.length} épicas seleccionadas
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={selectedEpics.size === epics.length}
            >
              Seleccionar Todas
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={selectedEpics.size === 0}
            >
              Deseleccionar Todas
            </Button>
          </div>
        </div>

        {/* Epics List */}
        <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
          {epics.map((epic) => {
            const epicStories = getStoriesForEpic(epic.key)
            const isSelected = selectedEpics.has(epic.key)
            const isExpanded = expandedEpics.has(epic.key)
            
            return (
              <div
                key={epic.key}
                className={`border rounded-lg p-4 transition-all ${
                  isSelected 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'bg-muted/30 border-border'
                }`}
              >
                {/* Epic Header */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`epic-${epic.key}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleEpic(epic.key)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-xs font-mono bg-background px-1.5 py-0.5 rounded border">
                        {epic.key}
                      </code>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${getStatusColor(epic.status)}`}
                      >
                        {epic.status}
                      </Badge>
                      {epicStories.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {epicStories.length} {epicStories.length === 1 ? 'story' : 'stories'}
                        </Badge>
                      )}
                    </div>
                    <label 
                      htmlFor={`epic-${epic.key}`}
                      className="font-medium text-sm leading-snug cursor-pointer block"
                    >
                      {epic.summary}
                    </label>

                    {/* Configuration Fields - Only visible when selected */}
                    {isSelected && epicConfigurations.has(epic.key) && (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {/* Priority */}
                        <div className="space-y-1">
                          <Label htmlFor={`priority-${epic.key}`} className="text-xs text-muted-foreground">
                            Prioridad
                          </Label>
                          <Select
                            value={epicConfigurations.get(epic.key)?.priority}
                            onValueChange={(value) => updateEpicConfig(epic.key, 'priority', value)}
                          >
                            <SelectTrigger id={`priority-${epic.key}`} className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {priorities.map(priority => (
                                <SelectItem key={priority.name} value={priority.name}>
                                  {priority.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Track */}
                        <div className="space-y-1">
                          <Label htmlFor={`track-${epic.key}`} className="text-xs text-muted-foreground">
                            Track
                          </Label>
                          <Select
                            value={epicConfigurations.get(epic.key)?.track}
                            onValueChange={(value) => updateEpicConfig(epic.key, 'track', value)}
                          >
                            <SelectTrigger id={`track-${epic.key}`} className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {tracks.map(track => (
                                <SelectItem key={track} value={track}>
                                  {track}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Size */}
                        <div className="space-y-1">
                          <Label htmlFor={`size-${epic.key}`} className="text-xs text-muted-foreground">
                            Tamaño
                          </Label>
                          <Select
                            value={epicConfigurations.get(epic.key)?.size}
                            onValueChange={(value) => updateEpicConfig(epic.key, 'size', value)}
                          >
                            <SelectTrigger id={`size-${epic.key}`} className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {sizes.map(size => (
                                <SelectItem key={size} value={size}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Type */}
                        <div className="space-y-1">
                          <Label htmlFor={`type-${epic.key}`} className="text-xs text-muted-foreground">
                            Tipo
                          </Label>
                          <Select
                            value={epicConfigurations.get(epic.key)?.type}
                            onValueChange={(value) => updateEpicConfig(epic.key, 'type', value)}
                          >
                            <SelectTrigger id={`type-${epic.key}`} className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {types.map(type => (
                                <SelectItem key={type.name} value={type.name}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Toggle Stories Button */}
                    {epicStories.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(epic.key)}
                        className="mt-2 h-7 px-2 text-xs"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Ocultar Stories
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3 w-3 mr-1" />
                            Ver {epicStories.length} Stories
                          </>
                        )}
                      </Button>
                    )}

                    {/* Stories List */}
                    {isExpanded && epicStories.length > 0 && (
                      <div className="mt-3 ml-6 space-y-2 border-l-2 border-border pl-4">
                        {epicStories.map((story) => (
                          <div key={story.key} className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="font-mono bg-background px-1 py-0.5 rounded border text-[10px]">
                                {story.key}
                              </code>
                              <Badge 
                                variant="outline"
                                className={`text-[10px] h-5 ${getStatusColor(story.status)}`}
                              >
                                {story.status}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground">{story.summary}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedEpics.size === 0 || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Importar {selectedEpics.size} {selectedEpics.size === 1 ? 'Épica' : 'Épicas'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

