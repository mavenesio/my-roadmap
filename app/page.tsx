"use client"
import { RoadmapGantt } from "@/components/roadmap-gantt"

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="mx-auto w-[90vw] space-y-6">
        <RoadmapGantt />
      </div>
    </div>
  )
}
