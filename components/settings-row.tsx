"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HexColorPicker } from "react-colorful"
import { Plus, Trash2 } from "lucide-react"

type ItemWithColor = { name: string; color?: string }

interface SettingsRowProps {
  items: Array<ItemWithColor> | string[]
  setItems: (next: any) => void
  placeholder: string
  withColor?: boolean
}

export default function SettingsRow({
  items,
  setItems,
  placeholder,
  withColor = true,
}: SettingsRowProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [tempColor, setTempColor] = useState<string>("#999999")

  return (
    <div className="space-y-2">
      {(items as any[]).map((item: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          {withColor && typeof item !== "string" ? (
            <>
              <button
                type="button"
                aria-label="Elegir color"
                className="h-8 w-8 rounded border"
                style={{ backgroundColor: item.color || '#999999' }}
                onClick={() => {
                  setEditingIdx(idx)
                  setTempColor(item.color || '#999999')
                }}
              />
              <Dialog open={editingIdx === idx} onOpenChange={(open) => { if (open) setEditingIdx(idx) }}>
                <DialogContent className="sm:max-w-[300px]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle>Elegir color</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <HexColorPicker color={tempColor} onChange={setTempColor} />
                    <input
                      type="text"
                      aria-label="Hex"
                      value={tempColor}
                      onChange={(e) => {
                        let val = e.target.value.trim()
                        if (val && !val.startsWith('#')) val = '#' + val
                        setTempColor(val)
                      }}
                      className="h-8 w-full rounded border bg-background px-2 font-mono text-xs"
                      placeholder="#000000"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" onClick={() => {
                      const next = [...(items as any[])]
                      next[idx] = { ...next[idx], color: tempColor }
                      setItems(next)
                      setEditingIdx(null)
                    }}>OK</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : null}
          <input
            type="text"
            value={typeof item === "string" ? item : item.name}
            onChange={(e) => {
              const next = [...(items as any[])]
              next[idx] = typeof item === "string" ? e.target.value : { ...next[idx], name: e.target.value }
              setItems(next)
            }}
            placeholder={placeholder}
            className="flex-1 rounded border px-2 py-2 bg-background"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setItems((items as any[]).filter((_, i) => i !== idx))}
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => setItems([...(items as any[]), withColor ? { name: "", color: "#999999" } : ""])}
        className="inline-flex items-center gap-2"
      >
        <Plus className="h-4 w-4" /> Agregar
      </Button>
    </div>
  )
}


















