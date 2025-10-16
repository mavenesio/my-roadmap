# Configuración del Roadmap

Este directorio contiene la configuración por defecto para el roadmap.

## Archivo: `default-roadmap-config.ts`

Este archivo define todos los valores predeterminados que se usarán al crear un nuevo roadmap:

### Tracks (Proyectos)
Define los proyectos o tracks disponibles y sus colores:
```typescript
export const DEFAULT_TRACKS = [
  { name: "Swiper", color: "#3b82f6" },
  { name: "TM", color: "#10b981" },
  { name: "Guardians", color: "#8b5cf6" },
]
```

### Prioridades
Define los niveles de prioridad y sus colores:
```typescript
export const DEFAULT_PRIORITIES = [
  { name: "Milestone", color: "#2d6a3e" },
  { name: "1", color: "#4ade80" },
  { name: "2", color: "#86efac" },
  { name: "3", color: "#bbf7d0" },
]
```

### Estados
Define los posibles estados de las tareas:
```typescript
export const DEFAULT_STATUSES = [
  { name: "TODO", color: "#9ca3af" },
  { name: "PREWORK", color: "#3b82f6" },
  // ... más estados
]
```

### Tipos
Define los tipos de tareas:
```typescript
export const DEFAULT_TYPES = [
  { name: "DEUDA TECNICA", color: "#ec4899" },
  { name: "CARRY OVER", color: "#dc2626" },
  // ... más tipos
]
```

### Tamaños
Define los tamaños disponibles para las tareas:
```typescript
export const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"]
```

### Miembros del Equipo
Define los miembros del equipo por defecto:
```typescript
export const DEFAULT_TEAM_MEMBERS = [
  { name: "Juan Pérez", color: "#3b82f6" },
  // ... más miembros
]
```

## Cómo Personalizar

1. Abre el archivo `default-roadmap-config.ts`
2. Modifica los valores según tus necesidades
3. Los colores deben estar en formato hexadecimal (ej: `#3b82f6`)
4. Los cambios se aplicarán automáticamente en la próxima inicialización del roadmap

## Valores por Defecto

Define los valores predeterminados que se usarán al crear nuevas tareas:
```typescript
export const DEFAULT_DEFAULTS = {
  track: "Guardians",
  priority: "Milestone",
  status: "TODO",
  type: "POROTO",
  size: "S",
}
```

Estos valores se pueden modificar más adelante desde la pantalla de configuración en la sección "Valores por Defecto".

## Nota Importante

Estos valores solo se aplican cuando se crea un **nuevo** roadmap. Si ya tienes un roadmap configurado, puedes:
- Modificar los valores desde la pantalla de configuración
- Los valores por defecto se pueden cambiar en cualquier momento desde Settings
- O exportar tu configuración actual, eliminarla, y crear una nueva con los valores actualizados

