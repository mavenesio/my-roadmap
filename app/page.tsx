"use client"
import { RoadmapGantt } from "@/components/roadmap-gantt"

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="mx-auto w-[90vw] space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Team Roadmap</h1>
          <p className="mt-2 text-muted-foreground">Gantt chart of the team's weekly tasks for the selected quarter.</p>
        </div>

        <RoadmapGantt />
      </div>
    </div>
  )
}
