import React, { Suspense } from "react"
import dynamic from "next/dynamic"

const RoadmapGanttClient = dynamic(() => import("@/components/roadmap-gantt-client"), { ssr: false })

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
