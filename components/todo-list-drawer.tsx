"use client"

import { useState, useMemo } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, GripVertical, Search, Filter, X, ArrowLeft, Edit2, FolderOpen } from "lucide-react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { toast } from "sonner"
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export type TodoStatus = "TODO" | "WIP" | "BLOCKED" | "DONE"

export interface TodoList {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  order: number
}

export interface TodoItem {
  id: string
  listId: string
  title: string
  description?: string
  status: TodoStatus
  createdAt: number
  order: number
}

interface TodoListDrawerProps {
  open: boolean
  onClose: () => void
}

const STATUS_ORDER = {
  "WIP": 1,
  "TODO": 2,
  "BLOCKED": 3,
  "DONE": 4
}

const STATUS_COLORS = {
  "TODO": "bg-gray-500",
  "WIP": "bg-blue-500",
  "BLOCKED": "bg-red-500",
  "DONE": "bg-green-500"
}

export function TodoListDrawer({ open, onClose }: TodoListDrawerProps) {
  const [todoLists, setTodoLists] = useLocalStorage<TodoList[]>('todo-lists', [])
  const [todos, setTodos] = useLocalStorage<TodoItem[]>('todos', [])
  const [currentListId, setCurrentListId] = useState<string | null>(null)
  
  // Estado para crear nueva lista
  const [newListName, setNewListName] = useState("")
  const [isCreatingList, setIsCreatingList] = useState(false)
  
  // Estado para editar lista
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editListName, setEditListName] = useState("")
  
  // Estado para tareas
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [searchText, setSearchText] = useState("")
  const [statusFilters, setStatusFilters] = useState<TodoStatus[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Funciones para manejar listas
  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast.error("El nombre de la lista es obligatorio")
      return
    }

    const maxOrder = todoLists.reduce((max, l) => Math.max(max, l.order), 0)
    const now = Date.now()
    
    const newList: TodoList = {
      id: now.toString(),
      name: newListName.trim(),
      createdAt: now,
      updatedAt: now,
      order: maxOrder + 1
    }

    setTodoLists([...todoLists, newList])
    setNewListName("")
    setIsCreatingList(false)
    toast.success("Lista creada")
  }

  const handleDeleteList = (listId: string) => {
    const tasksCount = todos.filter(t => t.listId === listId).length
    const list = todoLists.find(l => l.id === listId)
    
    if (!list) return
    
    const confirmed = window.confirm(
      tasksCount > 0
        ? `¿Eliminar la lista "${list.name}"? Se eliminarán ${tasksCount} tarea${tasksCount !== 1 ? 's' : ''}.`
        : `¿Eliminar la lista "${list.name}"?`
    )
    
    if (!confirmed) return
    
    setTodoLists(todoLists.filter(l => l.id !== listId))
    setTodos(todos.filter(t => t.listId !== listId))
    toast.success("Lista eliminada")
  }

  const handleStartEditList = (list: TodoList) => {
    setEditingListId(list.id)
    setEditListName(list.name)
  }

  const handleSaveEditList = () => {
    if (!editListName.trim()) {
      toast.error("El nombre de la lista es obligatorio")
      return
    }

    setTodoLists(todoLists.map(l =>
      l.id === editingListId
        ? { ...l, name: editListName.trim(), updatedAt: Date.now() }
        : l
    ))
    setEditingListId(null)
    setEditListName("")
    toast.success("Lista actualizada")
  }

  const handleCancelEditList = () => {
    setEditingListId(null)
    setEditListName("")
  }

  const handleOpenList = (listId: string) => {
    setCurrentListId(listId)
  }

  const handleBackToLists = () => {
    setCurrentListId(null)
    setSearchText("")
    setStatusFilters([])
  }

  const handleDragEndLists = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const sortedLists = getSortedLists()
    const oldIndex = sortedLists.findIndex(l => l.id === active.id)
    const newIndex = sortedLists.findIndex(l => l.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sortedLists, oldIndex, newIndex)
    const orderMapping = new Map<string, number>()
    reordered.forEach((l, idx) => orderMapping.set(l.id, idx + 1))

    setTodoLists(todoLists.map(l => ({ ...l, order: orderMapping.get(l.id) ?? l.order })))
  }

  // Funciones para manejar tareas
  const handleAddTodo = () => {
    if (!currentListId) return
    
    if (!newTitle.trim()) {
      toast.error("El título es obligatorio")
      return
    }

    const listTodos = todos.filter(t => t.listId === currentListId)
    const maxOrder = listTodos.reduce((max, t) => Math.max(max, t.order), 0)
    
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      listId: currentListId,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      status: "TODO",
      createdAt: Date.now(),
      order: maxOrder + 1
    }

    setTodos([...todos, newTodo])
    setTodoLists(todoLists.map(l => 
      l.id === currentListId ? { ...l, updatedAt: Date.now() } : l
    ))
    setNewTitle("")
    setNewDescription("")
    toast.success("Tarea agregada")
  }

  const handleUpdateStatus = (id: string, status: TodoStatus) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    
    setTodos(todos.map(t => 
      t.id === id ? { ...t, status } : t
    ))
    setTodoLists(todoLists.map(l => 
      l.id === todo.listId ? { ...l, updatedAt: Date.now() } : l
    ))
  }

  const handleDeleteTodo = (id: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return
    
    const todo = todos.find(t => t.id === id)
    setTodos(todos.filter(t => t.id !== id))
    
    if (todo) {
      setTodoLists(todoLists.map(l => 
        l.id === todo.listId ? { ...l, updatedAt: Date.now() } : l
      ))
    }
    
    toast.success("Tarea eliminada")
  }

  const handleStartEdit = (todo: TodoItem) => {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditDescription(todo.description || "")
  }

  const handleSaveEdit = () => {
    if (!editTitle.trim()) {
      toast.error("El título es obligatorio")
      return
    }

    const todo = todos.find(t => t.id === editingId)
    setTodos(todos.map(t =>
      t.id === editingId
        ? { ...t, title: editTitle.trim(), description: editDescription.trim() || undefined }
        : t
    ))
    
    if (todo) {
      setTodoLists(todoLists.map(l => 
        l.id === todo.listId ? { ...l, updatedAt: Date.now() } : l
      ))
    }
    
    setEditingId(null)
    setEditTitle("")
    setEditDescription("")
    toast.success("Tarea actualizada")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle("")
    setEditDescription("")
  }

  const toggleStatusFilter = (status: TodoStatus) => {
    setStatusFilters(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  const clearStatusFilters = () => {
    setStatusFilters([])
  }

  const handleDragEndTodos = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const filtered = getFilteredAndSortedTodos()
    const oldIndex = filtered.findIndex(t => t.id === active.id)
    const newIndex = filtered.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(filtered, oldIndex, newIndex)
    
    const orderMapping = new Map<string, number>()
    reordered.forEach((t, idx) => orderMapping.set(t.id, idx + 1))
    
    const others = todos.filter(t => !orderMapping.has(t.id))
    const maxVisibleOrder = reordered.length
    others.forEach((t, idx) => {
      if (!orderMapping.has(t.id)) {
        orderMapping.set(t.id, t.order ?? maxVisibleOrder + idx + 1)
      }
    })

    setTodos(todos.map(t => ({ ...t, order: orderMapping.get(t.id) ?? t.order })))
  }

  const getSortedLists = () => {
    return [...todoLists].sort((a, b) => a.order - b.order)
  }

  const getListSummary = (listId: string) => {
    const listTodos = todos.filter(t => t.listId === listId)
    const completedCount = listTodos.filter(t => t.status === "DONE").length
    return {
      total: listTodos.length,
      completed: completedCount
    }
  }

  const getFilteredAndSortedTodos = () => {
    if (!currentListId) return []
    
    let filtered = todos.filter(t => t.listId === currentListId)

    if (searchText.trim()) {
      const search = searchText.toLowerCase()
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search)
      )
    }

    if (statusFilters.length > 0) {
      filtered = filtered.filter(t => statusFilters.includes(t.status))
    }

    return filtered.sort((a, b) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (statusDiff !== 0) return statusDiff
      
      const orderDiff = (a.order ?? 0) - (b.order ?? 0)
      if (orderDiff !== 0) return orderDiff
      
      return a.createdAt - b.createdAt
    })
  }

  const currentList = currentListId ? todoLists.find(l => l.id === currentListId) : null
  const sortedLists = getSortedLists()
  const filteredTodos = getFilteredAndSortedTodos()

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  }

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Ahora"
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours}h`
    if (days < 7) return `Hace ${days}d`
    return formatDate(timestamp)
  }

  const SortableListItem = ({ list }: { list: TodoList }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id })
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const isEditing = editingListId === list.id
    const summary = getListSummary(list.id)

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="p-4 rounded-md border bg-card hover:bg-muted/50 transition-colors"
      >
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editListName}
              onChange={(e) => setEditListName(e.target.value)}
              placeholder="Nombre de la lista *"
              className="h-9"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSaveEditList()
                } else if (e.key === 'Escape') {
                  handleCancelEditList()
                }
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEditList} className="h-7">
                Guardar
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEditList} className="h-7">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <button
              className="cursor-grab text-muted-foreground hover:text-foreground mt-1"
              {...listeners}
              {...attributes}
            >
              <GripVertical className="h-5 w-5" />
            </button>
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => handleOpenList(list.id)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  {list.name}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{summary.total} tarea{summary.total !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{summary.completed} completada{summary.completed !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span className="text-xs">{formatRelativeTime(list.updatedAt)}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartEditList(list)
                }}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteList(list.id)
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const SortableTodoItem = ({ todo }: { todo: TodoItem }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id })
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const isEditing = editingId === todo.id

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
      >
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Título *"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleCancelEdit()
                }
              }}
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Descripción (opcional)"
              className="min-h-[60px] text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleCancelEdit()
                }
              }}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleSaveEdit} className="h-7">
                Guardar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleCancelEdit} className="h-7">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <button
                className="cursor-grab text-muted-foreground hover:text-foreground mt-0.5"
                {...listeners}
                {...attributes}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm flex-1">{todo.title}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={todo.status}
                    onValueChange={(value: TodoStatus) => handleUpdateStatus(todo.id, value)}
                  >
                    <SelectTrigger className="h-7 w-auto border-none p-0 focus:ring-0 focus:ring-offset-0">
                      <Badge className={`text-white text-[10px] cursor-pointer ${STATUS_COLORS[todo.status]}`}>
                        {todo.status}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">TODO</SelectItem>
                      <SelectItem value="WIP">WIP</SelectItem>
                      <SelectItem value="BLOCKED">BLOCKED</SelectItem>
                      <SelectItem value="DONE">DONE</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <p className="text-[10px] text-muted-foreground">{formatDate(todo.createdAt)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(todo)}
                    className="h-6 text-xs ml-auto"
                  >
                    Editar
                  </Button>
                </div>

                {todo.description && (
                  <p className="text-xs text-muted-foreground">{todo.description}</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // Vista principal de listas
  if (!currentListId) {
    return (
      <Drawer open={open} onOpenChange={onClose} direction="right" dismissible={true} modal={true}>
        <DrawerContent className="h-screen top-0 right-0 left-auto mt-0 w-1/2 rounded-none">
          <div className="h-full flex flex-col">
            <DrawerHeader className="border-b">
              <div className="flex items-center justify-between">
                <DrawerTitle>TODO Lists</DrawerTitle>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DrawerHeader>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Formulario para crear nueva lista */}
              {isCreatingList ? (
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <h3 className="font-semibold text-sm">Nueva Lista</h3>
                  <div className="space-y-2">
                    <Input
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Nombre de la lista *"
                      className="h-9"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleCreateList()
                        } else if (e.key === 'Escape') {
                          setIsCreatingList(false)
                          setNewListName("")
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleCreateList} className="flex-1 gap-2 h-9">
                        <Plus className="h-4 w-4" />
                        Crear Lista
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsCreatingList(false)
                          setNewListName("")
                        }}
                        className="h-9"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={() => setIsCreatingList(true)} 
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Lista
                </Button>
              )}

              {/* Lista de listas */}
              {sortedLists.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No tienes listas aún, crea tu primera lista
                  </p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndLists}>
                  <SortableContext items={sortedLists.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {sortedLists.map(list => (
                        <SortableListItem key={list.id} list={list} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  // Vista de detalle de una lista específica
  return (
    <Drawer open={open} onOpenChange={onClose} direction="right" dismissible={true} modal={true}>
      <DrawerContent className="h-screen top-0 right-0 left-auto mt-0 w-1/2 rounded-none">
        <div className="h-full flex flex-col">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleBackToLists}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DrawerTitle>{currentList?.name || "Lista"}</DrawerTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Formulario de nuevo TODO */}
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <h3 className="font-semibold text-sm">Nueva Tarea</h3>
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-title" className="text-sm">Título *</Label>
                  <Input
                    id="new-title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Título de la tarea"
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddTodo()
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-description" className="text-sm">Descripción</Label>
                  <Textarea
                    id="new-description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="min-h-[60px]"
                  />
                </div>
                <Button onClick={handleAddTodo} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Tarea
                </Button>
              </div>
            </div>

            {/* Filtros y búsqueda */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar tareas..."
                    className="pl-8 h-9"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtros:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={statusFilters.length === 0 ? "default" : "outline"}
                    size="sm"
                    onClick={clearStatusFilters}
                    className="h-7 text-xs"
                  >
                    Todos
                  </Button>
                  <Button
                    variant={statusFilters.includes("TODO") ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStatusFilter("TODO")}
                    className="h-7 text-xs"
                  >
                    TODO
                  </Button>
                  <Button
                    variant={statusFilters.includes("WIP") ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStatusFilter("WIP")}
                    className="h-7 text-xs"
                  >
                    WIP
                  </Button>
                  <Button
                    variant={statusFilters.includes("BLOCKED") ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStatusFilter("BLOCKED")}
                    className="h-7 text-xs"
                  >
                    BLOCKED
                  </Button>
                  <Button
                    variant={statusFilters.includes("DONE") ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStatusFilter("DONE")}
                    className="h-7 text-xs"
                  >
                    DONE
                  </Button>
                </div>
              </div>
            </div>

            {/* Lista de TODOs */}
            {filteredTodos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {searchText || statusFilters.length > 0
                    ? "No hay tareas que coincidan con los filtros"
                    : "No hay tareas. ¡Agrega tu primera tarea!"}
                </p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTodos}>
                <SortableContext items={filteredTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {filteredTodos.map(todo => (
                      <SortableTodoItem key={todo.id} todo={todo} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

