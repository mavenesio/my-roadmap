"use client"
import { RoadmapGantt } from "@/components/roadmap-gantt"

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Team Roadmap - Q4</h1>
          <p className="mt-2 text-muted-foreground">Gantt chart of the team's weekly tasks for the specific quarter.</p>
        </div>

        <RoadmapGantt />
      </div>
    </div>
  )
}
