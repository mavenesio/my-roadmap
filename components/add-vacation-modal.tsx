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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Save } from "lucide-react"

type AbsenceType = 'vacation' | 'license'

interface Vacation {
  id: string
  startDate: string
  endDate: string
  description?: string
  type?: AbsenceType
}

interface AddVacationModalProps {
  open: boolean
  onClose: () => void
  onSave: (vacation: Vacation) => void
  memberName: string
  editingVacation?: Vacation | null
  prefilledStartDate?: string | null
}

export function AddVacationModal({ 
  open, 
  onClose, 
  onSave, 
  memberName,
  editingVacation,
  prefilledStartDate
}: AddVacationModalProps) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [description, setDescription] = useState("")
  const [absenceType, setAbsenceType] = useState<AbsenceType>("vacation")

  useEffect(() => {
    if (editingVacation) {
      setStartDate(editingVacation.startDate)
      setEndDate(editingVacation.endDate)
      setDescription(editingVacation.description || "")
      setAbsenceType(editingVacation.type || "vacation")
    } else {
      setStartDate(prefilledStartDate || "")
      setEndDate(prefilledStartDate || "")
      setDescription("")
      setAbsenceType("vacation")
    }
  }, [editingVacation, open, prefilledStartDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!startDate || !endDate) return

    // Validar que la fecha de fin sea posterior a la de inicio
    if (new Date(endDate) < new Date(startDate)) {
      alert("La fecha de fin debe ser posterior a la fecha de inicio")
      return
    }

    onSave({
      id: editingVacation?.id || Date.now().toString(),
      startDate,
      endDate,
      description: description.trim() || undefined,
      type: absenceType,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-3 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">
                  {editingVacation ? "Editar Ausencia" : "Agregar Ausencia"}
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  {memberName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="absenceType" className="text-base font-semibold">
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Select value={absenceType} onValueChange={(value: AbsenceType) => setAbsenceType(value)}>
                <SelectTrigger id="absenceType" className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-purple-200" />
                      <span>Vacaciones</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="license">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-amber-200" />
                      <span>Licencia</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-base font-semibold">
                  Fecha de Inicio <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-base font-semibold">
                  Fecha de Fin <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Descripción (opcional)
              </Label>
              <Textarea
                id="description"
                placeholder="Ej: Vacaciones de verano, Viaje familiar..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] text-base resize-none"
              />
            </div>

            {/* Info */}
            {startDate && endDate && new Date(endDate) >= new Date(startDate) && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="font-medium mb-1">Duración</p>
                <p className="text-muted-foreground">
                  {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} días
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-6">
              Cancelar
            </Button>
            <Button type="submit" className="h-10 px-8 gap-2">
              <Save className="h-4 w-4" />
              {editingVacation ? "Actualizar" : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

