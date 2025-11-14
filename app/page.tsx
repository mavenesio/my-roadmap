"use client"
import { Suspense } from "react"
import { RoadmapGantt } from "@/components/roadmap-gantt"

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="mx-auto w-[90vw] space-y-6">
        <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="text-muted-foreground">Cargando roadmap...</div></div>}>
          <RoadmapGantt />
        </Suspense>
      </div>
    </div>
  )
}
