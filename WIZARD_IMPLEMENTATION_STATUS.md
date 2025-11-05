# 🧙‍♂️ Estado de Implementación del Wizard de Inicialización

**Fecha**: Noviembre 2025  
**Estado**: 🟡 80% Completado - Falta integración final

---

## ✅ **LO QUE ESTÁ COMPLETADO**

### 📁 **Archivos Creados (10 archivos)**

#### 1. Componente Principal
- ✅ **`components/initialization-wizard.tsx`**
  - Estructura completa de 8 pasos
  - Progress bar visual
  - Navegación entre pasos
  - Estado global del wizard (`WizardData`)
  - Manejo de datos entre pasos

#### 2. Pasos del Wizard (8 componentes)
- ✅ **`components/wizard/step1-load-or-start.tsx`**
  - Opción: Cargar archivo JSON
  - Opción: Empezar desde cero
  - Validación de archivo
  - UI con cards seleccionables

- ✅ **`components/wizard/step2-master-data.tsx`**
  - Configuración de Tracks (con colores)
  - Configuración de Priorities (con colores)
  - Configuración de Statuses (con colores)
  - Configuración de Types (con colores)
  - Configuración de Sizes
  - Valores por defecto configurables
  - Agregar/eliminar dinámicamente
  - Pre-cargado con valores por defecto

- ✅ **`components/wizard/step3-quarter.tsx`**
  - Selección de Quarter (Q1-Q4)
  - Selección de Año
  - Generación automática de semanas
  - Vista previa de semanas del quarter
  - Muestra meses incluidos

- ✅ **`components/wizard/step4-jira-credentials.tsx`**
  - Input de URL del board
  - Input de email
  - Input de API token (password field)
  - Checkbox para guardar credenciales
  - Validación de campos
  - Parsing de URL de Jira
  - Instrucciones para obtener token
  - Alertas de seguridad

- ✅ **`components/wizard/step5-select-epics.tsx`**
  - Fetch automático de épicas desde Jira
  - Lista de épicas con checkbox
  - Configuración individual por épica:
    - Track
    - Priority
    - Status
    - Type
    - Size
  - Valores por defecto pre-cargados
  - Seleccionar/Deseleccionar todas
  - Contador de épicas seleccionadas
  - Loading state

- ✅ **`components/wizard/step6-add-more-boards.tsx`**
  - Opción: Agregar otro board (vuelve al paso 4)
  - Opción: Continuar con las épicas actuales
  - Resumen de boards y épicas configurados
  - UI con cards seleccionables

- ✅ **`components/wizard/step7-select-users.tsx`**
  - Fetch automático de usuarios desde Jira
  - Deduplicación de usuarios de múltiples boards
  - Grid de usuarios con avatares
  - Checkbox por usuario
  - Seleccionar/Deseleccionar todos
  - Muestra email y nombre
  - Contador de usuarios seleccionados
  - Loading state

- ✅ **`components/wizard/step8-summary.tsx`**
  - Resumen visual con números grandes
  - Lista de boards con épicas por board
  - Grid de usuarios seleccionados
  - Configuración del roadmap
  - Botón de finalizar
  - Loading state al procesar

#### 3. Interfaces y Types
- ✅ **`WizardData` interface** completa en `initialization-wizard.tsx`
- ✅ **`Task` interface** actualizada con `jiraEpicUrl` en `use-roadmap-tasks.ts`

---

## 🟡 **LO QUE FALTA POR IMPLEMENTAR**

### 1. Integración en RoadmapGantt ⏳

**Archivo**: `components/roadmap-gantt.tsx`

```typescript
// Agregar al inicio del componente:
const [showInitWizard, setShowInitWizard] = useState(false)

// Detectar si NO hay configuración
useEffect(() => {
  if (!isInitialized || !config) {
    setShowInitWizard(true)
  }
}, [isInitialized, config])

// Agregar en el render:
<InitializationWizard
  open={showInitWizard}
  onComplete={handleWizardComplete}
/>
```

### 2. Función `handleWizardComplete` ⏳

**Ubicación**: `components/roadmap-gantt.tsx`

Necesita:
- ✅ Crear configuración con `initializeConfig()`
- ✅ Guardar credenciales de Jira en localStorage (si el usuario lo autorizó)
- ⏳ Fetch de stories para cada épica seleccionada
- ⏳ Crear tareas con los datos de épicas
- ⏳ Agregar usuarios al equipo
- ⏳ Generar `jiraEpicUrl` para cada tarea

```typescript
const handleWizardComplete = async (wizardData: WizardData) => {
  try {
    // 1. Inicializar configuración
    initializeConfig(
      wizardData.quarter,
      wizardData.year,
      wizardData.selectedUsers.map(u => ({
        name: u.systemUserName,
        color: generateColorFromName(u.systemUserName),
        avatarUrl: u.avatarUrl,
      })),
      undefined // projects deprecated
    )
    
    // 2. Actualizar config con datos maestros
    updateConfig({
      tracks: wizardData.tracks,
      priorities: wizardData.priorities,
      statuses: wizardData.statuses,
      types: wizardData.types,
      sizes: wizardData.sizes,
      defaults: wizardData.defaults,
    })
    
    // 3. Guardar credenciales de Jira (si autorizado)
    wizardData.jiraBoards.forEach(board => {
      if (board.saveToken) {
        localStorage.setItem('jira-credentials', JSON.stringify({
          boardUrl: board.boardUrl,
          email: board.email,
          token: board.token,
        }))
      } else {
        localStorage.setItem('jira-credentials', JSON.stringify({
          boardUrl: board.boardUrl,
          email: board.email,
          token: '', // No guardar token
        }))
      }
    })
    
    // 4. Fetch stories y crear tareas
    const tasksToCreate = []
    for (const epicData of wizardData.selectedEpics) {
      const { epic, configuration, boardUrl } = epicData
      const board = wizardData.jiraBoards.find(b => b.boardUrl === boardUrl)
      
      if (!board) continue
      
      // Fetch stories
      const { fetchStoriesFromEpic } = await import('@/lib/jira-client')
      const stories = await fetchStoriesFromEpic(
        epic.key,
        board.domain,
        board.email,
        board.token
      )
      
      // Create task
      const jiraSubtasks = stories.map(story => ({
        id: story.id,
        key: story.key,
        title: story.summary,
        status: story.status,
        assignee: story.assignee ? {
          id: story.assignee.accountId,
          displayName: story.assignee.displayName,
          avatarUrl: story.assignee.avatarUrls['48x48'],
        } : undefined,
        startDate: story.startDate,
        endDate: story.dueDate,
        createdAt: story.created,
        updatedAt: story.updated,
        description: story.description,
      }))
      
      // Generate Jira URL
      const jiraEpicUrl = `${board.domain}/browse/${epic.key}`
      
      const task: Task = {
        id: `jira-${epic.id}-${Date.now()}`,
        name: epic.summary,
        priority: configuration.priority as Priority,
        track: configuration.track,
        status: configuration.status as Status,
        size: configuration.size as Size,
        type: configuration.type as TaskType,
        order: tasksToCreate.length + 1,
        weeks: [],
        assignments: config.weeks.map(week => ({ weekId: week.id, assignees: [] })),
        createdAt: Date.now(),
        jiraEpicKey: epic.key,
        jiraEpicId: epic.id,
        jiraEpicUrl,
        jiraSubtasks,
      }
      
      tasksToCreate.push(task)
    }
    
    // 5. Add all tasks
    const result = addTasks(tasksToCreate)
    
    // 6. Close wizard
    setShowInitWizard(false)
    
    // 7. Show success message
    alert(`✅ Inicialización completada!\n${result.added} tareas creadas\n${wizardData.selectedUsers.length} usuarios agregados`)
    
  } catch (error) {
    console.error('Error completing wizard:', error)
    alert(`❌ Error en la inicialización: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}
```

### 3. Mostrar Link de Jira en Tareas ⏳

**Archivo**: `components/edit-task-modal.tsx`

Agregar en el header del modal:

```typescript
{task.jiraEpicUrl && (
  <a
    href={task.jiraEpicUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
  >
    <LinkIcon className="w-4 h-4" />
    Ver en Jira
  </a>
)}
```

### 4. Caso: Cargar desde Archivo ⏳

**En**: `step1-load-or-start.tsx`

Si el usuario selecciona "Cargar archivo", el wizard debería:
- Parsear el archivo
- Saltar directamente al paso 8 (resumen) o cerrar el wizard
- Aplicar la configuración importada

```typescript
// En handleContinue de step1
if (selectedOption === "load" && data.loadedFile) {
  // Aplicar configuración del archivo
  importConfig(data.loadedFile.config)
  
  if (data.loadedFile.tasks) {
    replaceTasks(data.loadedFile.tasks)
  }
  
  // Cerrar wizard directamente
  onComplete(data as WizardData)
  return
}
```

---

## 📊 **FLUJO COMPLETO DEL WIZARD**

```
┌─────────────────────────────────────────────────────────────┐
│                    INICIO DEL WIZARD                         │
│           (Detecta que no hay configuración)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 1: ¿Cargar archivo o empezar desde 0?                 │
│  ┌──────────────────┐      ┌──────────────────┐             │
│  │ Cargar Archivo   │      │ Empezar desde 0  │             │
│  └────────┬─────────┘      └────────┬─────────┘             │
│           │                          │                        │
│           │                          ▼                        │
│           │         ┌────────────────────────────┐           │
│           │         │  PASO 2: Datos Maestros    │           │
│           │         │  - Tracks                  │           │
│           │         │  - Priorities              │           │
│           │         │  - Statuses                │           │
│           │         │  - Types                   │           │
│           │         │  - Sizes                   │           │
│           │         │  - Defaults                │           │
│           │         └────────────┬───────────────┘           │
│           │                      │                            │
│           │                      ▼                            │
│           │         ┌────────────────────────────┐           │
│           │         │  PASO 3: Quarter           │           │
│           │         │  - Seleccionar Q1-Q4       │           │
│           │         │  - Seleccionar Año         │           │
│           │         │  - Ver semanas             │           │
│           │         └────────────┬───────────────┘           │
│           │                      │                            │
│           │                      ▼                            │
│           │         ┌────────────────────────────┐           │
│           │    ┌───│  PASO 4: Jira              │           │
│           │    │   │  - Board URL               │           │
│           │    │   │  - Email                   │           │
│           │    │   │  - Token                   │           │
│           │    │   │  - ¿Guardar?               │           │
│           │    │   └────────────┬───────────────┘           │
│           │    │                │                            │
│           │    │                ▼                            │
│           │    │   ┌────────────────────────────┐           │
│           │    │   │  PASO 5: Épicas            │           │
│           │    │   │  - Fetch desde Jira        │           │
│           │    │   │  - Seleccionar épicas      │           │
│           │    │   │  - Configurar cada una     │           │
│           │    │   └────────────┬───────────────┘           │
│           │    │                │                            │
│           │    │                ▼                            │
│           │    │   ┌────────────────────────────┐           │
│           │    │   │  PASO 6: ¿Más boards?      │           │
│           │    │   │  ┌────────┐  ┌──────────┐  │           │
│           │    │   │  │ Sí     │  │ Continuar│  │           │
│           │    └───┼──┤ (→P4)  │  │ (→P7)    │  │           │
│           │        │  └────────┘  └─────┬────┘  │           │
│           │        └───────────────────┬─┴───────┘           │
│           │                            │                      │
│           │                            ▼                      │
│           │               ┌────────────────────────────┐     │
│           │               │  PASO 7: Usuarios          │     │
│           │               │  - Fetch desde Jira        │     │
│           │               │  - Deduplicar              │     │
│           │               │  - Seleccionar usuarios    │     │
│           │               └────────────┬───────────────┘     │
│           │                            │                      │
│           ▼                            ▼                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              PASO 8: RESUMEN                         │    │
│  │  - X boards                                          │    │
│  │  - Y épicas (por board)                             │    │
│  │  - Z usuarios                                        │    │
│  │  - Configuración completa                           │    │
│  └─────────────────────────┬───────────────────────────┘    │
│                             │                                │
│                             ▼                                │
│                    [FINALIZAR]                               │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
             ┌────────────────────────────────┐
             │  PROCESO FINAL:                │
             │  1. Crear configuración        │
             │  2. Guardar credenciales       │
             │  3. Fetch stories de épicas    │
             │  4. Crear tareas con URLs      │
             │  5. Agregar usuarios           │
             │  6. Cerrar wizard              │
             └────────────────┬───────────────┘
                              │
                              ▼
                     ✅ ROADMAP LISTO
```

---

## 🎯 **PRÓXIMOS PASOS PARA COMPLETAR**

### Paso 1: Integrar Wizard en RoadmapGantt
- [ ] Importar `InitializationWizard`
- [ ] Agregar estado `showInitWizard`
- [ ] Detectar cuando no hay configuración
- [ ] Renderizar el wizard

### Paso 2: Implementar `handleWizardComplete`
- [ ] Crear configuración
- [ ] Guardar credenciales
- [ ] Fetch stories para épicas
- [ ] Crear tareas con URLs de Jira
- [ ] Agregar usuarios
- [ ] Cerrar wizard

### Paso 3: Agregar Link en Edit Task Modal
- [ ] Mostrar link "Ver en Jira"
- [ ] Abrir en nueva pestaña

### Paso 4: Manejar Caso de Cargar Archivo
- [ ] Parsear archivo en Step 1
- [ ] Aplicar configuración
- [ ] Saltar al final o cerrar

### Paso 5: Testing
- [ ] Probar flujo completo desde 0
- [ ] Probar con archivo
- [ ] Probar con múltiples boards
- [ ] Probar selección de usuarios
- [ ] Verificar que las tareas tienen URLs

---

## 📝 **ESTIMACIÓN DE TIEMPO RESTANTE**

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Integrar wizard en RoadmapGantt | 15 min |
| Implementar handleWizardComplete | 30 min |
| Agregar link en task modal | 10 min |
| Manejar carga de archivo | 15 min |
| Testing y ajustes | 30 min |
| **TOTAL** | **~2 horas** |

---

## 🎨 **CARACTERÍSTICAS DEL WIZARD**

### UX/UI
- ✅ Progress bar visual con 8 pasos
- ✅ Iconos por cada paso
- ✅ Colores para estados (activo, completado, pendiente)
- ✅ Navegación Atrás/Continuar
- ✅ Loading states en pasos con fetch
- ✅ Validaciones en cada paso
- ✅ Mensajes de error claros
- ✅ Cards seleccionables
- ✅ Grid responsivo
- ✅ Scroll en listas largas

### Funcionalidad
- ✅ Fetch automático desde Jira
- ✅ Deduplicación de usuarios
- ✅ Configuración por épica
- ✅ Valores por defecto
- ✅ Múltiples boards
- ✅ Opción de guardar credenciales
- ✅ Resumen visual final
- ✅ Agregar/eliminar elementos dinámicamente
- ✅ Seleccionar/Deseleccionar todo

### Validaciones
- ✅ Campos requeridos
- ✅ Formato de URL de Jira
- ✅ Al menos un elemento por categoría
- ✅ Al menos una épica seleccionada
- ✅ Nombres no vacíos

---

## 🚀 **¿LISTO PARA CONTINUAR?**

Dime cuando quieras que implemente la integración final. Voy a necesitar:

1. **Implementar `handleWizardComplete`** en `roadmap-gantt.tsx`
2. **Integrar el wizard** en el render
3. **Agregar link de Jira** en el modal de editar tarea
4. **Manejar carga de archivo** en Step 1

¿Quieres que continúe ahora o prefieres revisar primero lo implementado?

