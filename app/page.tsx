import React, { Suspense } from "react"

import RoadmapGanttClient from "@/components/roadmap-gantt-client"

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="mx-auto w-[90vw] space-y-6">
        <Suspense fallback={<div className="min-h-[40vh]" />}>
          <RoadmapGanttClient />
        </Suspense>
      </div>
    </div>
  )
}
