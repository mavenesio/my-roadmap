# 🔍 Storage Validation Guide

Este documento explica cómo validar y mantener saludable el `localStorage` de tu aplicación.

## 📊 Estructura de Datos en localStorage

La aplicación guarda estos 6 keys principales:

| Key | Descripción | Contenido |
|-----|-------------|-----------|
| `roadmap-config` | Configuración principal | Quarter, year, weeks, teamMembers, tracks, priorities, statuses, types, sizes, defaults |
| `roadmap-tasks` | Tareas del Gantt | Array de tareas con assignments, jiraSubtasks, etc. |
| `jira-credentials` | Credenciales de Jira | boardUrl, email, token (si está guardado) |
| `jira-user-mappings` | Mapeos Jira ↔ Sistema | Array de mappings entre usuarios de Jira y del sistema |
| `todo-lists` | Listas de TODOs | Array de listas de tareas pendientes |
| `todos` | TODOs individuales | Array de items de TODO |

## 🛠️ Cómo Validar tu Storage

### Opción 1: Desde la Consola del Navegador

1. Abre tu aplicación en el navegador
2. Abre DevTools (F12)
3. Ve a la pestaña **Console**
4. Carga el script de validación:

```javascript
// Opción A: Cargar desde el archivo
const script = document.createElement('script');
script.src = '/validate-storage.js';
document.head.appendChild(script);

// Opción B: Copiar y pegar el contenido de public/validate-storage.js
```

5. Ejecuta la validación:

```javascript
validateStorage()
```

6. Verás un reporte detallado con:
   - ✅ Resumen general
   - 🔑 Estado de cada key
   - ❌ Issues críticos
   - ⚠️ Warnings
   - 💡 Recomendaciones

### Opción 2: Inspección Manual

1. Abre DevTools (F12)
2. Ve a **Application** → **Local Storage**
3. Selecciona `http://localhost:3000` (o tu dominio)
4. Revisa cada key manualmente

## 🐛 Problemas Comunes y Soluciones

### 1. Usuarios Duplicados en teamMembers

**Síntoma**: Ves el mismo usuario múltiples veces en `/team`

**Solución**:
```javascript
// Limpiar duplicados
const config = JSON.parse(localStorage.getItem('roadmap-config'));
const uniqueMembers = config.teamMembers.reduce((acc, member) => {
  if (!acc.find(m => m.name === member.name)) {
    acc.push(member);
  }
  return acc;
}, []);
config.teamMembers = uniqueMembers;
localStorage.setItem('roadmap-config', JSON.stringify(config));
location.reload();
```

### 2. Tareas con IDs Duplicados

**Síntoma**: Error al editar tareas o comportamiento extraño

**Solución**:
```javascript
// Regenerar IDs únicos para duplicados
const tasks = JSON.parse(localStorage.getItem('roadmap-tasks'));
const seenIds = new Set();
const fixed = tasks.map(task => {
  if (seenIds.has(task.id)) {
    return { ...task, id: `task-${Date.now()}-${Math.random()}` };
  }
  seenIds.add(task.id);
  return task;
});
localStorage.setItem('roadmap-tasks', JSON.stringify(fixed));
location.reload();
```

### 3. Assignees Huérfanos

**Síntoma**: Tareas asignadas a usuarios que ya no existen

**Solución**:
```javascript
// Limpiar assignees que no existen
const config = JSON.parse(localStorage.getItem('roadmap-config'));
const tasks = JSON.parse(localStorage.getItem('roadmap-tasks'));

const validMembers = new Set(config.teamMembers.map(m => m.name));

const cleanedTasks = tasks.map(task => ({
  ...task,
  assignments: task.assignments.map(assignment => ({
    ...assignment,
    assignees: assignment.assignees.filter(a => validMembers.has(a))
  }))
}));

localStorage.setItem('roadmap-tasks', JSON.stringify(cleanedTasks));
location.reload();
```

### 4. Tracks Huérfanos

**Síntoma**: Tareas con tracks que ya no existen en la configuración

**Solución**:
```javascript
// Migrar tracks huérfanos al primer track disponible
const config = JSON.parse(localStorage.getItem('roadmap-config'));
const tasks = JSON.parse(localStorage.getItem('roadmap-tasks'));

const validTracks = new Set(config.tracks.map(t => t.name));
const defaultTrack = config.tracks[0]?.name || 'Guardians';

const fixedTasks = tasks.map(task => ({
  ...task,
  track: validTracks.has(task.track) ? task.track : defaultTrack
}));

localStorage.setItem('roadmap-tasks', JSON.stringify(fixedTasks));
location.reload();
```

### 5. Usuarios Genéricos Reapareciendo

**Síntoma**: Los usuarios por defecto (Juan Pérez, María García, etc.) vuelven después de borrarlos

**Causa**: La lógica estaba regenerándolos cuando `teamMembers` era array vacío

**Solución**: Ya está arreglado en el código. Si aún ves el problema:

```javascript
// Forzar array vacío de usuarios
const config = JSON.parse(localStorage.getItem('roadmap-config'));
config.teamMembers = [];
localStorage.setItem('roadmap-config', JSON.stringify(config));
location.reload();
```

## 🧹 Limpieza General

### Reset Completo (⚠️ Cuidado: Borra todo)

```javascript
// Solo si quieres empezar de cero
localStorage.clear();
location.reload();
```

### Reset Solo de Usuarios

```javascript
const config = JSON.parse(localStorage.getItem('roadmap-config'));
config.teamMembers = [];
localStorage.setItem('roadmap-config', JSON.stringify(config));

// Limpiar también los mapeos de Jira
localStorage.removeItem('jira-user-mappings');
location.reload();
```

### Reset Solo de Tareas

```javascript
localStorage.removeItem('roadmap-tasks');
location.reload();
```

## 📏 Límites y Buenas Prácticas

### Límites de localStorage

- **Límite total**: ~5-10 MB (varía por navegador)
- **Recomendado**: Mantener bajo 2 MB

### Recomendaciones

1. **Archivar tareas completadas** después de cada quarter
2. **Limpiar mapeos de Jira** de usuarios que ya no existen
3. **Exportar backups regularmente** desde Settings
4. **Validar storage mensualmente** con el script

## 🔄 Migración de Datos

Si necesitas migrar datos de un formato viejo:

```javascript
// Ejemplo: Migrar de 'projects' a 'tracks'
const config = JSON.parse(localStorage.getItem('roadmap-config'));

if (config.projects && !config.tracks) {
  config.tracks = config.projects.map((name, index) => ({
    name,
    color: ['#8b5cf6', '#3b82f6', '#10b981'][index % 3]
  }));
  delete config.projects;
  localStorage.setItem('roadmap-config', JSON.stringify(config));
  location.reload();
}
```

## 📊 Monitoreo de Tamaño

```javascript
// Ver tamaño de cada key
Object.keys(localStorage).forEach(key => {
  const size = new Blob([localStorage.getItem(key)]).size;
  console.log(`${key}: ${(size / 1024).toFixed(2)} KB`);
});

// Tamaño total
const total = Object.keys(localStorage).reduce((sum, key) => {
  return sum + new Blob([localStorage.getItem(key)]).size;
}, 0);
console.log(`Total: ${(total / 1024).toFixed(2)} KB`);
```

## 🆘 Soporte

Si encuentras un problema que no está documentado aquí:

1. Ejecuta `validateStorage()` y copia el reporte
2. Exporta tu configuración desde Settings
3. Abre un issue con el reporte y la configuración exportada

## ✅ Checklist de Mantenimiento Mensual

- [ ] Ejecutar `validateStorage()`
- [ ] Exportar backup de configuración
- [ ] Archivar tareas completadas del quarter anterior
- [ ] Limpiar mapeos de Jira de usuarios inactivos
- [ ] Verificar que no haya duplicados
- [ ] Revisar tamaño total del storage

