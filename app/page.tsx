"use client"
import React, { Suspense } from "react"
import { RoadmapGantt } from "@/components/roadmap-gantt"

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="mx-auto w-[90vw] space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Team Roadmap</h1>
          <p className="mt-2 text-muted-foreground">Gantt chart of the team's weekly tasks for the selected quarter.</p>
        </div>

        <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading roadmap...</div>}>
          <RoadmapGantt />
        </Suspense>
      </div>
    </div>
  )
}
