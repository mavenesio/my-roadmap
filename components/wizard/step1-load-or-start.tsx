"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Plus } from "lucide-react"
import type { WizardData } from "../initialization-wizard"

interface Step1Props {
  data: Partial<WizardData>
  onUpdate: (updates: Partial<WizardData>) => void
  onNext: () => void
  onUpdateNavigation?: (canGoNext: boolean, isProcessing: boolean) => void
}

export function Step1LoadOrStart({ data, onUpdate, onNext, onUpdateNavigation }: Step1Props) {
  const [selectedOption, setSelectedOption] = useState<"load" | "start" | null>(null)

  // Notify wizard about selection state
  useEffect(() => {
    onUpdateNavigation?.(selectedOption !== null, false)
  }, [selectedOption, onUpdateNavigation])

  const handleLoadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importedData = JSON.parse(content)
        
        onUpdate({
          loadedFile: importedData,
          startFromScratch: false,
          fileImported: true, // Flag para indicar que se importó un archivo
        })
        
        setSelectedOption("load")
      } catch (error) {
        console.error("Error al cargar archivo:", error)
        alert("Error al leer el archivo. Asegúrate de que sea un JSON válido.")
      }
    }
    reader.readAsText(file)
  }

  const handleStartFromScratch = () => {
    onUpdate({
      loadedFile: undefined,
      startFromScratch: true,
    })
    setSelectedOption("start")
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">¡Bienvenido!</h2>
        <p className="text-gray-600">
          ¿Deseas cargar una configuración existente o empezar desde cero?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Opción 1: Cargar archivo */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedOption === "load" ? "ring-2 ring-primary" : ""
          }`}
        >
          <CardHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-center">Cargar Archivo</CardTitle>
            <CardDescription className="text-center">
              Importa una configuración existente desde un archivo JSON
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor="load-file">
              <Button
                variant={selectedOption === "load" ? "default" : "outline"}
                className="w-full"
                onClick={() => {}}
                asChild
              >
                <div>
                  <Upload className="w-4 h-4 mr-2" />
                  {data.loadedFile ? "Archivo cargado ✓" : "Seleccionar archivo"}
                  <input
                    id="load-file"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleLoadFile}
                  />
                </div>
              </Button>
            </label>
            {data.loadedFile && (
              <p className="text-sm text-green-600 text-center mt-2">
                ✓ Archivo cargado correctamente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Opción 2: Empezar desde cero */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedOption === "start" ? "ring-2 ring-primary" : ""
          }`}
          onClick={handleStartFromScratch}
        >
          <CardHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-100">
              <Plus className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-center">Empezar desde Cero</CardTitle>
            <CardDescription className="text-center">
              Configura tu roadmap paso a paso con el wizard de inicialización
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={selectedOption === "start" ? "default" : "outline"}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Empezar
            </Button>
            {selectedOption === "start" && (
              <p className="text-sm text-green-600 text-center mt-2">
                ✓ Opción seleccionada
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

