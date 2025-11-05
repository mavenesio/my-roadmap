# 🔧 Plan de Refactoring - Consistencia de Datos

Este documento detalla el plan paso a paso para implementar las correcciones identificadas en `CODE_CONSISTENCY_REPORT.md`.

---

## 📦 FASE 1: Crear Helpers Centralizados

### Step 1.1: Extender `use-roadmap-config.ts` con validaciones

**Archivo**: `hooks/use-roadmap-config.ts`

**Cambios**:

```typescript
// Agregar función de validación
const validateTeamMemberUniqueness = (name: string, existingMembers: TeamMember[]): boolean => {
  const exists = existingMembers.some(m => m.name.toLowerCase() === name.toLowerCase())
  if (exists) {
    console.warn(`⚠️ Team member "${name}" already exists`)
  }
  return !exists
}

// Mejorar addTeamMember
const addTeamMember = (member: TeamMember) => {
  if (!config) return false
  
  // Validar unicidad
  if (!validateTeamMemberUniqueness(member.name, config.teamMembers)) {
    return false
  }
  
  console.log(`➕ Adding team member: ${member.name}`)
  
  updateConfig({
    teamMembers: [...config.teamMembers, member]
  })
  
  return true
}

// Mejorar updateTeamMember
const updateTeamMember = (name: string, updates: Partial<TeamMember>) => {
  if (!config) return false
  
  const exists = config.teamMembers.some(m => m.name === name)
  if (!exists) {
    console.warn(`⚠️ Team member "${name}" not found`)
    return false
  }
  
  console.log(`🔄 Updating team member: ${name}`, updates)
  
  updateConfig({
    teamMembers: config.teamMembers.map(m => 
      m.name === name ? { ...m, ...updates } : m
    )
  })
  
  return true
}

// Agregar función para bulk add (Jira sync)
const addTeamMembers = (members: TeamMember[]) => {
  if (!config) return { added: 0, skipped: 0 }
  
  const currentNames = new Set(config.teamMembers.map(m => m.name.toLowerCase()))
  const uniqueMembers = members.filter(m => !currentNames.has(m.name.toLowerCase()))
  
  const skipped = members.length - uniqueMembers.length
  
  if (skipped > 0) {
    console.warn(`⚠️ Skipped ${skipped} duplicate team members`)
  }
  
  if (uniqueMembers.length > 0) {
    console.log(`➕ Adding ${uniqueMembers.length} team members`)
    
    updateConfig({
      teamMembers: [...config.teamMembers, ...uniqueMembers]
    })
  }
  
  return { added: uniqueMembers.length, skipped }
}

// Exportar funciones actualizadas
return {
  config,
  isInitialized,
  months,
  initializeConfig,
  importConfig,
  exportConfig,
  updateConfig,
  resetConfig,
  addTeamMember,      // ✅ Con validación
  addTeamMembers,     // ✅ Nuevo: bulk add
  updateTeamMember,   // ✅ Con validación
  removeTeamMember,
  getTeamMemberByName,
}
```

### Step 1.2: Crear `use-roadmap-tasks.ts` hook

**Archivo**: `hooks/use-roadmap-tasks.ts` (NUEVO)

```typescript
import { useState, useCallback } from 'react'
import { useLocalStorage } from './use-local-storage'

export interface Task {
  id: string
  name: string
  priority: Priority
  track: string
  status: Status
  size: Size
  type: TaskType
  order: number
  weeks: string[]
  assignments: Assignment[]
  comments?: Comment[]
  createdAt: number
  jiraEpicKey?: string
  jiraEpicId?: string
  jiraSubtasks?: JiraSubtask[]
}

export function useRoadmapTasks(initialTasks: Task[] = []) {
  const [tasks, setTasks] = useLocalStorage<Task[]>('roadmap-tasks', initialTasks)
  
  // Helper: Validar ID único
  const validateUniqueId = useCallback((id: string, existingTasks: Task[]): boolean => {
    const exists = existingTasks.some(t => t.id === id)
    if (exists) {
      console.warn(`⚠️ Task with ID "${id}" already exists`)
    }
    return !exists
  }, [])
  
  // Helper: Validar Jira epic key única
  const validateUniqueJiraKey = useCallback((jiraKey: string | undefined, existingTasks: Task[]): boolean => {
    if (!jiraKey) return true
    
    const exists = existingTasks.some(t => t.jiraEpicKey === jiraKey)
    if (exists) {
      console.warn(`⚠️ Task with Jira key "${jiraKey}" already exists`)
    }
    return !exists
  }, [])
  
  // Add single task
  const addTask = useCallback((newTask: Task): boolean => {
    let success = false
    
    setTasks(prevTasks => {
      // Validar ID único
      if (!validateUniqueId(newTask.id, prevTasks)) {
        success = false
        return prevTasks
      }
      
      // Validar Jira key única (si aplica)
      if (!validateUniqueJiraKey(newTask.jiraEpicKey, prevTasks)) {
        success = false
        return prevTasks
      }
      
      console.log(`➕ Adding task: ${newTask.name}`)
      success = true
      return [...prevTasks, newTask]
    })
    
    return success
  }, [validateUniqueId, validateUniqueJiraKey])
  
  // Add multiple tasks (bulk)
  const addTasks = useCallback((newTasks: Task[]): { added: number; skipped: number } => {
    let result = { added: 0, skipped: 0 }
    
    setTasks(prevTasks => {
      const existingIds = new Set(prevTasks.map(t => t.id))
      const existingJiraKeys = new Set(
        prevTasks.filter(t => t.jiraEpicKey).map(t => t.jiraEpicKey)
      )
      
      const uniqueTasks = newTasks.filter(task => {
        // Validar ID
        if (existingIds.has(task.id)) {
          console.warn(`⚠️ Skipping duplicate task ID: ${task.id}`)
          return false
        }
        
        // Validar Jira key
        if (task.jiraEpicKey && existingJiraKeys.has(task.jiraEpicKey)) {
          console.warn(`⚠️ Skipping duplicate Jira key: ${task.jiraEpicKey}`)
          return false
        }
        
        return true
      })
      
      result.added = uniqueTasks.length
      result.skipped = newTasks.length - uniqueTasks.length
      
      if (result.skipped > 0) {
        console.warn(`⚠️ Skipped ${result.skipped} duplicate tasks`)
      }
      
      if (result.added > 0) {
        console.log(`➕ Adding ${result.added} tasks`)
      }
      
      return [...prevTasks, ...uniqueTasks]
    })
    
    return result
  }, [])
  
  // Update task
  const updateTask = useCallback((taskId: string, updates: Partial<Task>): boolean => {
    let success = false
    
    setTasks(prevTasks => {
      const taskExists = prevTasks.some(t => t.id === taskId)
      
      if (!taskExists) {
        console.warn(`⚠️ Task "${taskId}" not found`)
        success = false
        return prevTasks
      }
      
      console.log(`🔄 Updating task: ${taskId}`)
      success = true
      
      return prevTasks.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      )
    })
    
    return success
  }, [])
  
  // Update multiple tasks
  const updateTasks = useCallback((updates: { id: string; updates: Partial<Task> }[]): number => {
    let updatedCount = 0
    
    setTasks(prevTasks => {
      const updatesMap = new Map(updates.map(u => [u.id, u.updates]))
      
      return prevTasks.map(task => {
        if (updatesMap.has(task.id)) {
          updatedCount++
          return { ...task, ...updatesMap.get(task.id) }
        }
        return task
      })
    })
    
    console.log(`🔄 Updated ${updatedCount} tasks`)
    return updatedCount
  }, [])
  
  // Remove task
  const removeTask = useCallback((taskId: string): boolean => {
    let success = false
    
    setTasks(prevTasks => {
      const taskExists = prevTasks.some(t => t.id === taskId)
      
      if (!taskExists) {
        console.warn(`⚠️ Task "${taskId}" not found`)
        success = false
        return prevTasks
      }
      
      console.log(`🗑️ Removing task: ${taskId}`)
      success = true
      
      return prevTasks.filter(t => t.id !== taskId)
    })
    
    return success
  }, [])
  
  // Remove multiple tasks
  const removeTasks = useCallback((taskIds: string[]): number => {
    let removedCount = 0
    
    setTasks(prevTasks => {
      const idsToRemove = new Set(taskIds)
      const filtered = prevTasks.filter(t => {
        if (idsToRemove.has(t.id)) {
          removedCount++
          return false
        }
        return true
      })
      
      console.log(`🗑️ Removed ${removedCount} tasks`)
      return filtered
    })
    
    return removedCount
  }, [])
  
  // Replace all tasks (for import)
  const replaceTasks = useCallback((newTasks: Task[]) => {
    console.log(`🔄 Replacing all tasks with ${newTasks.length} new tasks`)
    setTasks(newTasks)
  }, [])
  
  return {
    tasks,
    addTask,
    addTasks,
    updateTask,
    updateTasks,
    removeTask,
    removeTasks,
    replaceTasks,
  }
}
```

### Step 1.3: Crear utilidad de validación de integridad

**Archivo**: `lib/data-integrity.ts` (NUEVO)

```typescript
import type { Task, TeamMember, RoadmapConfig } from '@/hooks/use-roadmap-config'

export interface IntegrityReport {
  isValid: boolean
  errors: string[]
  warnings: string[]
  fixed: string[]
}

/**
 * Valida y limpia una tarea para asegurar integridad referencial
 */
export function validateTaskIntegrity(
  task: Task,
  config: RoadmapConfig
): { task: Task; report: IntegrityReport } {
  const report: IntegrityReport = {
    isValid: true,
    errors: [],
    warnings: [],
    fixed: []
  }
  
  let cleanedTask = { ...task }
  
  // Validar track
  const validTracks = new Set(config.tracks.map(t => t.name))
  if (!validTracks.has(task.track)) {
    report.warnings.push(`Invalid track "${task.track}"`)
    cleanedTask.track = config.tracks[0]?.name || 'Guardians'
    report.fixed.push(`Changed track to "${cleanedTask.track}"`)
  }
  
  // Validar assignees
  const validMembers = new Set(config.teamMembers.map(m => m.name))
  const cleanedAssignments = task.assignments.map(assignment => {
    const validAssignees = assignment.assignees.filter(assignee => {
      if (!validMembers.has(assignee)) {
        report.warnings.push(`Orphaned assignee "${assignee}" in task "${task.name}"`)
        report.fixed.push(`Removed assignee "${assignee}"`)
        return false
      }
      return true
    })
    
    return {
      ...assignment,
      assignees: validAssignees
    }
  })
  
  cleanedTask.assignments = cleanedAssignments
  
  // Validar priority
  const validPriorities = new Set(config.priorities.map(p => p.value))
  if (!validPriorities.has(task.priority)) {
    report.warnings.push(`Invalid priority "${task.priority}"`)
    cleanedTask.priority = config.defaults?.priority || "3"
    report.fixed.push(`Changed priority to "${cleanedTask.priority}"`)
  }
  
  report.isValid = report.errors.length === 0
  
  return { task: cleanedTask, report }
}

/**
 * Valida todas las tareas y retorna versiones limpias
 */
export function validateAllTasks(
  tasks: Task[],
  config: RoadmapConfig
): { tasks: Task[]; report: IntegrityReport } {
  const aggregatedReport: IntegrityReport = {
    isValid: true,
    errors: [],
    warnings: [],
    fixed: []
  }
  
  const validatedTasks = tasks.map(task => {
    const { task: cleanedTask, report } = validateTaskIntegrity(task, config)
    
    aggregatedReport.errors.push(...report.errors)
    aggregatedReport.warnings.push(...report.warnings)
    aggregatedReport.fixed.push(...report.fixed)
    
    return cleanedTask
  })
  
  aggregatedReport.isValid = aggregatedReport.errors.length === 0
  
  if (aggregatedReport.warnings.length > 0) {
    console.warn(`⚠️ Data integrity check found ${aggregatedReport.warnings.length} warnings`)
  }
  
  if (aggregatedReport.fixed.length > 0) {
    console.log(`🔧 Fixed ${aggregatedReport.fixed.length} issues`)
  }
  
  return { tasks: validatedTasks, report: aggregatedReport }
}

/**
 * Encuentra y reporta duplicados en teamMembers
 */
export function findDuplicateMembers(members: TeamMember[]): string[] {
  const seen = new Set<string>()
  const duplicates: string[] = []
  
  members.forEach(member => {
    const key = member.name.toLowerCase()
    if (seen.has(key)) {
      duplicates.push(member.name)
    } else {
      seen.add(key)
    }
  })
  
  return duplicates
}

/**
 * Encuentra y reporta duplicados en tasks
 */
export function findDuplicateTasks(tasks: Task[]): { byId: string[]; byJiraKey: string[] } {
  const seenIds = new Set<string>()
  const seenJiraKeys = new Set<string>()
  const duplicateIds: string[] = []
  const duplicateJiraKeys: string[] = []
  
  tasks.forEach(task => {
    // Check ID
    if (seenIds.has(task.id)) {
      duplicateIds.push(task.id)
    } else {
      seenIds.add(task.id)
    }
    
    // Check Jira key
    if (task.jiraEpicKey) {
      if (seenJiraKeys.has(task.jiraEpicKey)) {
        duplicateJiraKeys.push(task.jiraEpicKey)
      } else {
        seenJiraKeys.add(task.jiraEpicKey)
      }
    }
  })
  
  return { byId: duplicateIds, byJiraKey: duplicateJiraKeys }
}
```

---

## 📝 FASE 2: Refactorizar Componentes

### Step 2.1: Refactorizar `roadmap-gantt.tsx`

**Cambios principales**:

1. Usar `useRoadmapTasks()` en lugar de `useLocalStorage` directamente
2. Usar `addTeamMembers()` en lugar de construir array manualmente
3. Usar `addTasks()` en lugar de `setTasks([...prevTasks, ...newTasks])`

```typescript
// ❌ Antes
const [tasks, setTasks] = useLocalStorage<Task[]>('roadmap-tasks', INITIAL_TASKS)

// ✅ Después
const { 
  tasks, 
  addTask, 
  addTasks, 
  updateTask, 
  removeTask 
} = useRoadmapTasks(INITIAL_TASKS)

// ❌ Antes (línea 588)
setTasks(prevTasks => [...prevTasks, ...newTasks])

// ✅ Después
const result = addTasks(newTasks)
if (result.skipped > 0) {
  alert(`⚠️ Se omitieron ${result.skipped} tareas duplicadas`)
}

// ❌ Antes (línea 651)
updateConfig({
  teamMembers: updatedMembers
})

// ✅ Después
const result = addTeamMembers(newMembers)
if (result.skipped > 0) {
  alert(`⚠️ Se omitieron ${result.skipped} usuarios duplicados`)
}
```

### Step 2.2: Refactorizar `app/(pages)/team/page.tsx`

**Cambios principales**:

1. Eliminar estado local `members`
2. Usar directamente `config.teamMembers`
3. Usar helpers del hook

```typescript
// ❌ Antes
const [members, setMembers] = useState<TeamMemberType[]>(config?.teamMembers || [])

const handleAddMember = (member: TeamMemberType) => {
  const updatedMembers = [...members, member]
  setMembers(updatedMembers)
  updateConfig({ teamMembers: updatedMembers })
}

// ✅ Después
const members = useMemo(() => config?.teamMembers || [], [config?.teamMembers])

const handleAddMember = (member: TeamMemberType) => {
  const success = addTeamMember(member)
  if (!success) {
    toast.error("Error", {
      description: `El miembro ${member.name} ya existe`,
    })
  } else {
    toast.success("Miembro agregado", {
      description: `${member.name} ha sido agregado al equipo`,
    })
  }
}

// Similar para handleEditMember, handleDeleteMember, etc.
```

### Step 2.3: Refactorizar `app/(pages)/team/[memberName]/page.tsx`

**Cambios principales**:

1. Usar `updateTeamMember()` del hook
2. Eliminar construcción manual de arrays

```typescript
// ❌ Antes (línea 149)
const updatedMembers = config.teamMembers.map(m =>
  m.name === memberName ? updatedMember : m
)
updateConfig({ teamMembers: updatedMembers })

// ✅ Después
const success = updateTeamMember(memberName, {
  nationality: editedNationality === "none" ? undefined : editedNationality,
  seniority: editedSeniority === "none" ? undefined : editedSeniority,
})

if (!success) {
  toast.error("Error al actualizar")
} else {
  toast.success("Datos actualizados")
}

// Similar para todas las otras funciones de update
```

---

## 🧪 FASE 3: Agregar Validación Automática

### Step 3.1: Agregar validación en `initializeConfig`

**Archivo**: `hooks/use-roadmap-config.ts`

```typescript
useEffect(() => {
  if (config && !isInitialized) {
    // Validar duplicados en teamMembers
    const duplicateMembers = findDuplicateMembers(config.teamMembers)
    if (duplicateMembers.length > 0) {
      console.error(`🔴 Found duplicate team members:`, duplicateMembers)
      
      // Auto-fix: remover duplicados
      const uniqueMembers = config.teamMembers.filter((member, index, self) =>
        index === self.findIndex(m => m.name.toLowerCase() === member.name.toLowerCase())
      )
      
      updateConfig({ teamMembers: uniqueMembers })
      console.log(`🔧 Removed ${duplicateMembers.length} duplicate members`)
    }
    
    setIsInitialized(true)
  }
}, [config, isInitialized])
```

### Step 3.2: Agregar validación periódica en `RoadmapGantt`

```typescript
useEffect(() => {
  if (config && tasks.length > 0) {
    // Validar integridad cada vez que cambian config o tasks
    const { tasks: validatedTasks, report } = validateAllTasks(tasks, config)
    
    if (!report.isValid || report.fixed.length > 0) {
      console.warn('⚠️ Data integrity issues detected and fixed:', report)
      
      // Si se hicieron fixes, actualizar tasks
      if (report.fixed.length > 0) {
        replaceTasks(validatedTasks)
      }
    }
  }
}, [config?.teamMembers, config?.tracks]) // Solo cuando cambian referencias
```

---

## ✅ FASE 4: Testing

### Test Suite 1: Team Members

```typescript
describe('Team Members', () => {
  test('should not add duplicate member', () => {
    const { addTeamMember } = useRoadmapConfig()
    
    const member = { name: 'John Doe', color: '#ff0000' }
    
    const first = addTeamMember(member)
    expect(first).toBe(true)
    
    const second = addTeamMember(member)
    expect(second).toBe(false)
  })
  
  test('should update existing member', () => {
    const { updateTeamMember, getTeamMemberByName } = useRoadmapConfig()
    
    updateTeamMember('John Doe', { nationality: 'USA' })
    
    const member = getTeamMemberByName('John Doe')
    expect(member?.nationality).toBe('USA')
  })
})
```

### Test Suite 2: Tasks

```typescript
describe('Tasks', () => {
  test('should not add task with duplicate ID', () => {
    const { addTask, addTasks } = useRoadmapTasks()
    
    const task = { id: 'task-1', name: 'Test', /* ... */ }
    
    const first = addTask(task)
    expect(first).toBe(true)
    
    const second = addTask(task)
    expect(second).toBe(false)
  })
  
  test('should skip duplicate tasks in bulk add', () => {
    const { addTasks } = useRoadmapTasks()
    
    const tasks = [
      { id: 'task-1', /* ... */ },
      { id: 'task-2', /* ... */ },
      { id: 'task-1', /* ... */ }, // duplicate
    ]
    
    const result = addTasks(tasks)
    expect(result.added).toBe(2)
    expect(result.skipped).toBe(1)
  })
})
```

---

## 📊 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Helpers
- [ ] Extender `use-roadmap-config.ts` con validaciones
- [ ] Crear `hooks/use-roadmap-tasks.ts`
- [ ] Crear `lib/data-integrity.ts`
- [ ] Probar helpers en consola

### Fase 2: Refactoring
- [ ] Refactorizar `components/roadmap-gantt.tsx`
- [ ] Refactorizar `app/(pages)/team/page.tsx`
- [ ] Refactorizar `app/(pages)/team/[memberName]/page.tsx`
- [ ] Probar flujo completo manualmente

### Fase 3: Validación
- [ ] Agregar validación en `initializeConfig`
- [ ] Agregar validación periódica en `RoadmapGantt`
- [ ] Ejecutar `validateStorage()` y confirmar 0 errores

### Fase 4: Testing
- [ ] Crear test suite para team members
- [ ] Crear test suite para tasks
- [ ] Crear test suite para integridad
- [ ] Coverage > 80%

---

## ⚠️ RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Breaking changes en producción** | Alta | Crítico | Exportar backup antes, feature flag |
| **Pérdida de datos existentes** | Media | Crítico | Auto-fix con validación, no eliminar datos |
| **Usuarios reportan nuevos bugs** | Media | Alto | Testing exhaustivo, rollback plan |
| **Refactoring toma más tiempo** | Alta | Medio | Hacer por fases, releases incrementales |

---

## 🚀 ESTRATEGIA DE DEPLOY

### Opción 1: Big Bang (No recomendado)
- Deploy todo a la vez
- Alto riesgo
- Difícil rollback

### Opción 2: Incremental (Recomendado)
1. **Release 1**: Helpers + validación (sin refactoring)
2. **Release 2**: Refactor `team/page.tsx`
3. **Release 3**: Refactor `team/[memberName]/page.tsx`
4. **Release 4**: Refactor `roadmap-gantt.tsx`
5. **Release 5**: Habilitar validación automática

### Opción 3: Feature Flag
- Todo el código nuevo detrás de feature flag
- Testear en producción con subset de usuarios
- Gradual rollout

**Recomendación**: Opción 2 (Incremental)

---

## 📈 KPIs DE ÉXITO

| Métrica | Antes | Después | Objetivo |
|---------|-------|---------|----------|
| Reportes de usuarios duplicados | 3/semana | 0/semana | 0 |
| Reportes de huérfanos | 2/semana | 0/semana | 0 |
| Tiempo de debugging | 4h/semana | 1h/semana | -75% |
| Lugares con `setConfig` | 14 | 3 | -78% |
| Lugares con `setTasks` | 18 | 4 | -78% |
| Cobertura de tests | 0% | 80% | >80% |

---

## 🎯 SIGUIENTES PASOS

1. **Review** este plan con el equipo
2. **Estimar** tiempo real necesario
3. **Decidir** estrategia de deploy
4. **Exportar backup** de todos los datos
5. **Comenzar** con Fase 1

**Tiempo estimado total**: 10-13 horas de desarrollo + 4-6 horas de testing = **14-19 horas**

