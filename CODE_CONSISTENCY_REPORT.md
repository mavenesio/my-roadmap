# 🔍 Code Consistency Analysis Report

Este reporte analiza el código en busca de inconsistencias que puedan causar duplicados, huérfanos y problemas de sincronización.

## 📊 Resumen Ejecutivo

### ⚠️ **PROBLEMAS CRÍTICOS ENCONTRADOS**

| Categoría | Severidad | Ubicaciones | Impacto |
|-----------|-----------|-------------|---------|
| **Múltiples escritores de `teamMembers`** | 🔴 ALTA | 14 lugares | Duplicados, race conditions |
| **Múltiples escritores de `tasks`** | 🔴 ALTA | 18+ lugares | Inconsistencias |
| **Estado local duplicado** | 🟡 MEDIA | 3 componentes | Desincronización |
| **Falta validación duplicados** | 🟡 MEDIA | 5 funciones | Permite duplicados |
| **No usa transacciones** | 🟠 BAJA | Global | Inconsistencias temporales |

---

## 1️⃣ PROBLEMA: Múltiples Escritores de `teamMembers`

### 🔍 Análisis

`teamMembers` se modifica en **14 lugares diferentes**:

#### **A. Hook Central (`use-roadmap-config.ts`)**
✅ **CORRECTO** - Debería ser el único lugar

```typescript
// Línea 262 - addTeamMember
updateConfig({
  teamMembers: [...config.teamMembers, member]
})

// Línea 270 - updateTeamMember
updateConfig({
  teamMembers: config.teamMembers.map(m => 
    m.name === name ? { ...m, ...updates } : m
  )
})

// Línea 280 - removeTeamMember
updateConfig({
  teamMembers: config.teamMembers.filter(m => m.name !== name)
})
```

#### **B. Gantt Component (`components/roadmap-gantt.tsx`)**
⚠️ **INCONSISTENTE** - Modifica directamente

```typescript
// Línea 651 - handleUserMappingSave
updateConfig({
  teamMembers: updatedMembers  // ⚠️ Construye array completo localmente
})
```

**Problema**: No usa `addTeamMember` del hook, construye el array manualmente.

#### **C. Team Detail Page (`app/(pages)/team/[memberName]/page.tsx`)**
❌ **INCORRECTO** - 5 lugares diferentes

```typescript
// Línea 149 - handleSaveMemberData
updateConfig({ teamMembers: updatedMembers })

// Línea 186 - handleAddFeedback
updateConfig({ teamMembers: updatedMembers })

// Línea 211 - handleDeleteFeedback
updateConfig({ teamMembers: updatedMembers })

// Línea 252 - handleSaveGoal
updateConfig({ teamMembers: updatedMembers })

// Línea 301 - handleDeleteGoal
updateConfig({ teamMembers: updatedMembers })
```

**Problema**: Cada función reconstruye `updatedMembers` manualmente.

#### **D. Team List Page (`app/(pages)/team/page.tsx`)**
❌ **INCORRECTO** - 5 lugares diferentes

```typescript
// Línea 54 - handleAddMember
updateConfig({ teamMembers: updatedMembers })

// Línea 66 - handleEditMember
updateConfig({ teamMembers: updatedMembers })

// Línea 80 - handleUpdateMemberGoals
updateConfig({ teamMembers: updatedMembers })

// Línea 94 - handleDeleteMember
updateConfig({ teamMembers: updatedMembers })

// Línea 330 - Modal inline
updateConfig({ teamMembers: updatedMembers })
```

**Problema**: Duplica lógica que ya existe en `use-roadmap-config`.

### 💥 Consecuencias

1. **Race Conditions**: Si dos componentes actualizan al mismo tiempo, uno sobreescribe al otro
2. **Duplicados**: Sin validación centralizada, pueden crearse duplicados
3. **Lógica duplicada**: El mismo código se repite en 3 lugares
4. **Difícil mantenimiento**: Cambiar lógica requiere actualizar 14 lugares

### ✅ Solución Recomendada

```typescript
// ❌ NO HACER ESTO (actual)
const updatedMembers = config.teamMembers.map(m => 
  m.name === memberName ? { ...m, ...updates } : m
)
updateConfig({ teamMembers: updatedMembers })

// ✅ HACER ESTO (correcto)
updateTeamMember(memberName, updates)
```

**Acción**: Refactorizar todos los componentes para usar las funciones del hook:
- `addTeamMember()`
- `updateTeamMember()`
- `removeTeamMember()`

---

## 2️⃣ PROBLEMA: Múltiples Escritores de `tasks`

### 🔍 Análisis

`tasks` se modifica en **18+ lugares**:

#### **A. Gantt Component (`components/roadmap-gantt.tsx`)**

```typescript
// Línea 143 - Inicialización
const [tasks, setTasks] = useLocalStorage<Task[]>('roadmap-tasks', INITIAL_TASKS)

// Línea 551 - processJiraData - Update
setTasks(prevTasks => prevTasks.map(t => 
  t.jiraEpicKey === epic.key ? { ...t, name: epic.summary, jiraSubtasks, jiraEpicId: epic.id } : t
))

// Línea 588 - processJiraData - Add
setTasks(prevTasks => [...prevTasks, ...newTasks])

// Línea 740 - handleSyncTaskFromJira - Update
setTasks(prevTasks => prevTasks.map(t => {
  if (t.id === taskId) {
    return { ...t, name: `${t.name} (Actualizando...)` }
  }
  return t
}))

// Línea 768 - handleSyncTaskFromJira - Update with Jira data
setTasks(prevTasks => prevTasks.map(t => {
  if (t.id === taskId && t.jiraEpicKey === jiraEpicKey) {
    return { ...t, name: cleanName, jiraSubtasks }
  }
  return t
}))

// Línea 787 - handleSyncTaskFromJira - Error recovery
setTasks(prevTasks => prevTasks.map(t => {
  if (t.id === taskId) {
    return { ...t, name: t.name.replace(' (Actualizando...)', '') }
  }
  return t
}))

// Más líneas: 800, 810, 819, 830, 835, 852, 857, 862, 870...
```

**Problema**: 18+ `setTasks()` dispersos por el componente sin función centralizada.

### 💥 Consecuencias

1. **No hay validación de duplicados**: `setTasks([...prevTasks, ...newTasks])` sin verificar IDs
2. **Lógica repetida**: El mismo pattern `.map(t => ...)` se repite múltiples veces
3. **Difícil debuggear**: No hay un lugar único donde ver todas las mutaciones
4. **Sin auditoría**: No hay logs consistentes de cambios

### ✅ Solución Recomendada

Crear funciones helper centralizadas:

```typescript
// ✅ Crear estas funciones
const taskHelpers = {
  addTask: (newTask: Task) => {
    setTasks(prevTasks => {
      // Validar no duplicado
      if (prevTasks.some(t => t.id === newTask.id)) {
        console.warn(`Task ${newTask.id} already exists`)
        return prevTasks
      }
      console.log(`➕ Adding task: ${newTask.name}`)
      return [...prevTasks, newTask]
    })
  },
  
  updateTask: (taskId: string, updates: Partial<Task>) => {
    setTasks(prevTasks => prevTasks.map(t => {
      if (t.id === taskId) {
        console.log(`🔄 Updating task: ${t.name}`)
        return { ...t, ...updates }
      }
      return t
    }))
  },
  
  removeTask: (taskId: string) => {
    setTasks(prevTasks => {
      console.log(`🗑️ Removing task: ${taskId}`)
      return prevTasks.filter(t => t.id !== taskId)
    })
  },
  
  bulkAddTasks: (newTasks: Task[]) => {
    setTasks(prevTasks => {
      const existingIds = new Set(prevTasks.map(t => t.id))
      const uniqueNewTasks = newTasks.filter(t => !existingIds.has(t.id))
      
      if (uniqueNewTasks.length !== newTasks.length) {
        console.warn(`⚠️ Filtered ${newTasks.length - uniqueNewTasks.length} duplicate tasks`)
      }
      
      console.log(`➕ Adding ${uniqueNewTasks.length} tasks`)
      return [...prevTasks, ...uniqueNewTasks]
    })
  }
}
```

---

## 3️⃣ PROBLEMA: Estado Local Duplicado

### 🔍 Análisis

Varios componentes mantienen copias locales de datos globales:

#### **A. Team Page (`app/(pages)/team/page.tsx`)**

```typescript
// Línea 36
const [members, setMembers] = useState<TeamMemberType[]>(config?.teamMembers || [])

// Luego actualiza AMBOS:
const handleAddMember = (member: TeamMemberType) => {
  const updatedMembers = [...members, member]
  setMembers(updatedMembers)          // ⚠️ Estado local
  updateConfig({ teamMembers: updatedMembers })  // ⚠️ Estado global
}
```

**Problema**: Dos fuentes de verdad para los mismos datos.

#### **B. Team Detail Page (`app/(pages)/team/[memberName]/page.tsx`)**

```typescript
// Línea 59-67
const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
const [goals, setGoals] = useState<Goal[]>([])

// Inicializa desde member
useEffect(() => {
  if (member) {
    setFeedbacks(member.comments || [])
    setGoals(member.goals || [])
  }
}, [member])
```

**Problema**: Estado local que debe sincronizarse con `config.teamMembers`.

### 💥 Consecuencias

1. **Desincronización**: Estado local y global pueden divergir
2. **Updates dobles**: Hay que actualizar en dos lugares
3. **Bugs sutiles**: Si olvidas actualizar uno, hay inconsistencia

### ✅ Solución Recomendada

```typescript
// ❌ NO HACER ESTO
const [members, setMembers] = useState(config?.teamMembers || [])

// ✅ HACER ESTO
const members = useMemo(() => config?.teamMembers || [], [config?.teamMembers])

// O mejor aún, usar directamente
// config.teamMembers
```

---

## 4️⃣ PROBLEMA: Falta Validación de Duplicados

### 🔍 Análisis

Funciones que deberían validar duplicados pero no lo hacen:

#### **A. `processJiraData` (`roadmap-gantt.tsx:588`)**

```typescript
// ❌ Sin validación
if (newTasks.length > 0) {
  setTasks(prevTasks => {
    const updated = [...prevTasks, ...newTasks]  // ⚠️ No valida duplicados
    return updated
  })
}
```

**Problema**: Si sincronizas dos veces, duplica las tareas.

#### **B. `handleUserMappingSave` (`roadmap-gantt.tsx:647`)**

```typescript
// ❌ Sin validación robusta
const updatedMembers = [...currentMembers, ...newMembers]
updateConfig({
  teamMembers: updatedMembers  // ⚠️ No valida duplicados globalmente
})
```

**Problema**: Puede crear duplicados si mappings se procesan mal.

### ✅ Solución Recomendada

```typescript
// ✅ Con validación
const bulkAddTasks = (newTasks: Task[]) => {
  setTasks(prevTasks => {
    // Validar duplicados por ID
    const existingIds = new Set(prevTasks.map(t => t.id))
    const uniqueNewTasks = newTasks.filter(t => !existingIds.has(t.id))
    
    // Validar duplicados por jiraEpicKey (si aplica)
    const existingJiraKeys = new Set(
      prevTasks.filter(t => t.jiraEpicKey).map(t => t.jiraEpicKey)
    )
    const fullyUniqueTasks = uniqueNewTasks.filter(t => 
      !t.jiraEpicKey || !existingJiraKeys.has(t.jiraEpicKey)
    )
    
    if (fullyUniqueTasks.length !== newTasks.length) {
      console.warn(`⚠️ Filtered ${newTasks.length - fullyUniqueTasks.length} duplicate tasks`)
    }
    
    return [...prevTasks, ...fullyUniqueTasks]
  })
}
```

---

## 5️⃣ PROBLEMA: Assignees y Tracks Huérfanos

### 🔍 Análisis

No hay validación cuando se asignan usuarios o tracks a tareas:

#### **A. Assignments sin validación**

```typescript
// En cualquier lugar donde se actualicen assignments
// No hay código que valide:
// 1. ¿El assignee existe en teamMembers?
// 2. ¿El track existe en config.tracks?
```

### 💥 Consecuencias

1. **Assignees huérfanos**: Tareas asignadas a usuarios eliminados
2. **Tracks huérfanos**: Tareas con tracks que ya no existen
3. **Errores en UI**: Al renderizar nombres inexistentes

### ✅ Solución Recomendada

```typescript
// Validador de integridad
const validateTaskIntegrity = (task: Task, config: RoadmapConfig): Task => {
  const validTeamMembers = new Set(config.teamMembers.map(m => m.name))
  const validTracks = new Set(config.tracks.map(t => t.name))
  
  // Validar y limpiar assignees
  const cleanedAssignments = task.assignments.map(assignment => ({
    ...assignment,
    assignees: assignment.assignees.filter(a => {
      if (!validTeamMembers.has(a)) {
        console.warn(`⚠️ Removing orphaned assignee: ${a}`)
        return false
      }
      return true
    })
  }))
  
  // Validar track
  let cleanedTrack = task.track
  if (!validTracks.has(task.track)) {
    console.warn(`⚠️ Invalid track ${task.track}, using default`)
    cleanedTrack = config.tracks[0]?.name || 'Guardians'
  }
  
  return {
    ...task,
    assignments: cleanedAssignments,
    track: cleanedTrack
  }
}

// Aplicar en cada actualización de tasks
setTasks(prevTasks => prevTasks.map(t => validateTaskIntegrity(t, config)))
```

---

## 📋 PLAN DE ACCIÓN

### 🔴 **Prioridad 1: Crítico**

1. **Centralizar escritura de `teamMembers`**
   - [ ] Refactorizar `app/(pages)/team/page.tsx` para usar `addTeamMember/updateTeamMember/removeTeamMember`
   - [ ] Refactorizar `app/(pages)/team/[memberName]/page.tsx` para usar helpers del hook
   - [ ] Refactorizar `components/roadmap-gantt.tsx` para usar helpers del hook
   - [ ] Eliminar estado local `members` en `team/page.tsx`

2. **Agregar validación de duplicados**
   - [ ] En `addTeamMember`: validar nombre único
   - [ ] En `processJiraData`: validar IDs y jiraEpicKeys únicos
   - [ ] En `handleUserMappingSave`: validar no duplicar usuarios

### 🟡 **Prioridad 2: Importante**

3. **Crear helpers para `tasks`**
   - [ ] Crear `taskHelpers` con `addTask`, `updateTask`, `removeTask`, `bulkAddTasks`
   - [ ] Refactorizar todas las llamadas a `setTasks` para usar helpers
   - [ ] Agregar validación automática en cada helper

4. **Eliminar estado duplicado**
   - [ ] Convertir `useState` a `useMemo` en `team/page.tsx`
   - [ ] Usar directamente `config.teamMembers` donde sea posible
   - [ ] Eliminar sincronización manual de estado

### 🟠 **Prioridad 3: Mejoras**

5. **Agregar validación de integridad**
   - [ ] Crear `validateTaskIntegrity` function
   - [ ] Ejecutar al cargar tasks
   - [ ] Ejecutar después de eliminar teamMembers o tracks
   - [ ] Mostrar warnings al usuario

6. **Agregar auditoría**
   - [ ] Logs consistentes en todas las mutaciones
   - [ ] Contador de operaciones
   - [ ] Tracking de errores

---

## 🧪 TESTS RECOMENDADOS

### Test 1: No Duplicados
```typescript
// 1. Agregar usuario "Test User"
// 2. Intentar agregar "Test User" otra vez
// 3. Verificar que solo existe una vez
```

### Test 2: Sincronización Jira
```typescript
// 1. Sincronizar épicas de Jira
// 2. Sincronizar las mismas épicas otra vez
// 3. Verificar que no se duplican
```

### Test 3: Integridad Referencial
```typescript
// 1. Crear tarea asignada a "User A"
// 2. Eliminar "User A"
// 3. Verificar que assignment se limpia o muestra warning
```

---

## 📊 MÉTRICAS ACTUALES

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Lugares que modifican `teamMembers`** | 14 | 🔴 Crítico |
| **Lugares que modifican `tasks`** | 18+ | 🔴 Crítico |
| **Estados duplicados** | 3 | 🟡 Medio |
| **Funciones sin validación** | 5+ | 🟡 Medio |
| **Cobertura de tests** | 0% | 🔴 Crítico |

## 📊 MÉTRICAS OBJETIVO

| Métrica | Valor Objetivo | Mejora |
|---------|----------------|--------|
| **Lugares que modifican `teamMembers`** | 3 (solo hook) | -78% |
| **Lugares que modifican `tasks`** | 4 (helpers) | -78% |
| **Estados duplicados** | 0 | -100% |
| **Funciones sin validación** | 0 | -100% |
| **Cobertura de tests** | 80% | +80% |

---

## 🎯 RESUMEN EJECUTIVO

El código presenta **problemas significativos de consistencia** que explican los duplicados y huérfanos reportados:

1. **14 lugares diferentes** modifican `teamMembers` → causa duplicados
2. **18+ lugares** modifican `tasks` → falta validación centralizada
3. **Estado duplicado** en 3 componentes → desincronización
4. **Falta validación** de duplicados y referencias → permite inconsistencias

**Recomendación**: Priorizar refactoring de Prioridad 1 (centralizar writers) antes de agregar nuevas features.

**Tiempo estimado**: 
- Prioridad 1: 4-6 horas
- Prioridad 2: 3-4 horas  
- Prioridad 3: 2-3 horas
- **Total: ~10-13 horas**

**Impacto esperado**:
- ✅ Eliminar duplicados
- ✅ Eliminar huérfanos
- ✅ Código más mantenible
- ✅ Menos bugs
- ✅ Mejor DX (Developer Experience)

