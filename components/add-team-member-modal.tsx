"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Save } from "lucide-react"

interface TeamMember {
  name: string
  color: string
  nationality?: string
  seniority?: string
}

interface AddTeamMemberModalProps {
  open: boolean
  onClose: () => void
  onSave: (member: TeamMember) => void
  editingMember?: TeamMember | null
  existingMembers: TeamMember[]
}

const NATIONALITIES = [
  { value: "Argentina", label: "Argentina", flag: "🇦🇷" },
  { value: "Colombia", label: "Colombia", flag: "🇨🇴" },
  { value: "Brasil", label: "Brasil", flag: "🇧🇷" },
]

const SENIORITIES = [
  "Trainee",
  "Junior",
  "Semi Senior",
  "Senior",
  "Tech Lead",
  "Staff",
  "Principal"
]

const generateRandomColor = (): string => {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 70 + Math.floor(Math.random() * 10) // 70-80%
  const lightness = 45 + Math.floor(Math.random() * 10) // 45-55%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

export function AddTeamMemberModal({ 
  open, 
  onClose, 
  onSave, 
  editingMember,
  existingMembers 
}: AddTeamMemberModalProps) {
  const [name, setName] = useState("")
  const [nationality, setNationality] = useState<string>("")
  const [seniority, setSeniority] = useState<string>("")
  const [color, setColor] = useState("")

  useEffect(() => {
    if (editingMember) {
      setName(editingMember.name)
      setNationality(editingMember.nationality || "")
      setSeniority(editingMember.seniority || "")
      setColor(editingMember.color)
    } else {
      setName("")
      setNationality("")
      setSeniority("")
      setColor(generateRandomColor())
    }
  }, [editingMember, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return

    // Verificar si el nombre ya existe (excepto si estamos editando ese mismo miembro)
    const nameExists = existingMembers.some(
      m => m.name.toLowerCase() === name.trim().toLowerCase() && 
      (!editingMember || m.name !== editingMember.name)
    )

    if (nameExists) {
      alert("Ya existe un miembro con ese nombre")
      return
    }

    onSave({
      name: name.trim(),
      color,
      nationality: nationality || undefined,
      seniority: seniority || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-3 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">
                  {editingMember ? "Editar Miembro" : "Agregar Miembro"}
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  {editingMember 
                    ? "Actualiza la información del colaborador" 
                    : "Agrega un nuevo colaborador al equipo"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-semibold">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ej: Juan Pérez"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="h-11 text-base"
                required
              />
            </div>

            {/* Nationality and Seniority */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="nationality" className="text-base font-semibold">
                  Nacionalidad
                </Label>
                <Select value={nationality} onValueChange={setNationality}>
                  <SelectTrigger id="nationality" className="h-11 text-base">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-muted-foreground">
                      Sin especificar
                    </SelectItem>
                    {NATIONALITIES.map((nat) => (
                      <SelectItem key={nat.value} value={nat.value}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{nat.flag}</span>
                          <span>{nat.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seniority" className="text-base font-semibold">
                  Seniority
                </Label>
                <Select value={seniority} onValueChange={setSeniority}>
                  <SelectTrigger id="seniority" className="h-11 text-base">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-muted-foreground">
                      Sin especificar
                    </SelectItem>
                    {SENIORITIES.map((sen) => (
                      <SelectItem key={sen} value={sen}>
                        {sen}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Color Preview */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Color</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-20 rounded-lg border-2 border-border flex items-center justify-center text-white font-semibold text-2xl shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {name.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    Color asignado automáticamente
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setColor(generateRandomColor())}
                    className="text-sm"
                  >
                    Generar nuevo color
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-6">
              Cancelar
            </Button>
            <Button type="submit" className="h-10 px-8 gap-2">
              <Save className="h-4 w-4" />
              {editingMember ? "Actualizar" : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

