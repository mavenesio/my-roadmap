"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, Settings, Calendar, Link as LinkIcon, CheckSquare, Users, FileText, Loader2 } from "lucide-react"

// Import step components (to be created)
import { Step1LoadOrStart } from "./wizard/step1-load-or-start"
import { Step2MasterData } from "./wizard/step2-master-data"
import { Step3Quarter } from "./wizard/step3-quarter"
import { Step4JiraCredentials } from "./wizard/step4-jira-credentials"
import { Step5SelectEpics } from "./wizard/step5-select-epics"
import { Step6AddMoreBoards } from "./wizard/step6-add-more-boards"
import { Step7SelectUsers } from "./wizard/step7-select-users"
import { Step8Summary } from "./wizard/step8-summary"

export interface WizardData {
  // Step 1
  loadedFile?: any
  startFromScratch: boolean
  fileImported?: boolean // Flag para indicar que se importó un archivo
  
  // Step 2
  tracks: Array<{ name: string; color: string }>
  priorities: Array<{ name: string; color: string }>
  statuses: Array<{ name: string; color: string }>
  types: Array<{ name: string; color: string }>
  sizes: string[]
  defaults: {
    track?: string
    priority?: string
    status?: string
    type?: string
    size?: string
  }
  
  // Step 3
  quarter: number
  year: number
  
  // Step 4
  jiraBoards: Array<{
    boardUrl: string
    email: string
    token: string
    saveToken: boolean
    domain: string
    projectKey: string
    epics?: any[]
  }>
  
  // Step 6 (fetched users)
  jiraUsers?: any[]
  usersWithAssignments?: string[]
  
  // Step 5 & 6
  selectedEpics: Array<{
    boardUrl: string
    epic: any
    configuration: {
      track: string
      priority: string
      status: string
      type: string
      size: string
    }
  }>
  
  // Step 7
  selectedUsers: Array<{
    jiraAccountId: string
    displayName: string
    email: string
    avatarUrl: string
    systemUserName: string
  }>
}

interface InitializationWizardProps {
  open?: boolean
  onComplete: (data: WizardData) => void
  onCancel?: () => void
}

const STEPS = [
  { number: 1, title: "Cargar o Empezar", icon: Upload },
  { number: 2, title: "Datos Maestros", icon: Settings },
  { number: 3, title: "Quarter", icon: Calendar },
  { number: 4, title: "Jira", icon: LinkIcon },
  { number: 5, title: "Épicas", icon: CheckSquare },
  { number: 6, title: "Más Boards", icon: FileText },
  { number: 7, title: "Usuarios", icon: Users },
  { number: 8, title: "Resumen", icon: CheckSquare },
]

export function InitializationWizard({ open = true, onComplete, onCancel }: InitializationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({
    startFromScratch: true,
    jiraBoards: [],
    selectedEpics: [],
    selectedUsers: [],
  })
  const [canGoNext, setCanGoNext] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Reference to the current step's continue handler
  const stepContinueHandlerRef = useRef<(() => void | Promise<void>) | null>(null)

  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }))
  }, [])

  const goToNextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 8))
  }, [])

  const goToPreviousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }, [])

  const handleComplete = useCallback(() => {
    onComplete(wizardData as WizardData)
  }, [wizardData, onComplete])
  
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    }
  }, [onCancel])

  // Update navigation state based on current step
  const updateNavigationState = useCallback((stepCanGoNext: boolean, stepIsProcessing: boolean = false) => {
    setCanGoNext(stepCanGoNext)
    setIsProcessing(stepIsProcessing)
    setCanGoBack(currentStep > 1 && !stepIsProcessing)
  }, [currentStep])
  
  // Register a step's continue handler
  const registerStepHandler = useCallback((handler: (() => void | Promise<void>) | null) => {
    stepContinueHandlerRef.current = handler
  }, [])
  
  // Handle continue button click
  const handleContinueClick = useCallback(async () => {
    if (currentStep === 8) {
      handleComplete()
    } else if (currentStep === 1 && wizardData.fileImported) {
      // Si se importó un archivo en el paso 1, saltar al paso 8
      setCurrentStep(8)
    } else if (stepContinueHandlerRef.current) {
      // Execute the step's custom handler
      await stepContinueHandlerRef.current()
    } else {
      // Default behavior: just go to next step
      goToNextStep()
    }
  }, [currentStep, handleComplete, goToNextStep, wizardData.fileImported])

  // Reset navigation state when step changes
  useEffect(() => {
    // Reset handler when step changes
    stepContinueHandlerRef.current = null
    
    // Step 1 starts disabled until user selects an option
    if (currentStep === 1) {
      setCanGoNext(false)
      setCanGoBack(false)
    } else {
      setCanGoNext(true)
      setCanGoBack(currentStep > 1)
    }
    setIsProcessing(false)
  }, [currentStep])

  const progress = (currentStep / 8) * 100

  return (
    <div className="fixed inset-0 z-50 h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      <div className="container mx-auto px-4 py-6 max-w-7xl flex flex-col h-full">
        {/* Header */}
        <div className="mb-4 flex-shrink-0">
          <h1 className="text-3xl font-bold mb-1">Inicialización del Roadmap</h1>
          <p className="text-muted-foreground">Configura tu roadmap paso a paso</p>
        </div>

        {/* Progress Section */}
        <div className="mb-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 flex-shrink-0">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between mb-6">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <div
                  key={step.number}
                  className={`flex flex-col items-center ${
                    isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive
                        ? "border-primary bg-primary text-white shadow-lg scale-110"
                        : isCompleted
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-gray-300 bg-white dark:bg-slate-700"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-1 text-center font-medium ${isActive ? 'text-primary' : ''}`}>
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
          
          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={goToPreviousStep}
              disabled={!canGoBack || isProcessing}
            >
              Atrás
            </Button>
            <div className="text-sm text-muted-foreground">
              Paso {currentStep} de 8
            </div>
            <Button 
              onClick={handleContinueClick}
              size="lg"
              disabled={!canGoNext || isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === 8 ? 'Finalizar' : 'Continuar'}
            </Button>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 flex-1 overflow-y-auto">
          {currentStep === 1 && (
            <Step1LoadOrStart
              data={wizardData}
              onUpdate={updateWizardData}
              onNext={goToNextStep}
              onUpdateNavigation={updateNavigationState}
            />
          )}
          {currentStep === 2 && (
            <Step2MasterData
              data={wizardData}
              onUpdate={updateWizardData}
              onNext={goToNextStep}
              onBack={goToPreviousStep}
            />
          )}
          {currentStep === 3 && (
            <Step3Quarter
              data={wizardData}
              onUpdate={updateWizardData}
              onNext={goToNextStep}
              onBack={goToPreviousStep}
              onRegisterHandler={registerStepHandler}
            />
          )}
          {currentStep === 4 && (
            <Step4JiraCredentials
              data={wizardData}
              onUpdate={updateWizardData}
              onNext={goToNextStep}
              onBack={goToPreviousStep}
              onUpdateNavigation={updateNavigationState}
              onRegisterHandler={registerStepHandler}
            />
          )}
          {currentStep === 5 && (
            <Step5SelectEpics
              data={wizardData}
              onUpdate={updateWizardData}
              onNext={goToNextStep}
              onBack={goToPreviousStep}
              onUpdateNavigation={updateNavigationState}
              onRegisterHandler={registerStepHandler}
            />
          )}
          {currentStep === 6 && (
            <Step6AddMoreBoards
              data={wizardData}
              onUpdate={updateWizardData}
              onNext={goToNextStep}
              onBack={goToPreviousStep}
              onAddMore={() => setCurrentStep(4)} // Volver al paso 4
              onUpdateNavigation={updateNavigationState}
              onRegisterHandler={registerStepHandler}
            />
          )}
          {currentStep === 7 && (
            <Step7SelectUsers
              data={wizardData}
              onUpdate={updateWizardData}
              onNext={goToNextStep}
              onBack={goToPreviousStep}
              onRegisterHandler={registerStepHandler}
            />
          )}
          {currentStep === 8 && (
            <Step8Summary
              data={wizardData}
              onComplete={handleComplete}
              onBack={wizardData.fileImported ? () => setCurrentStep(1) : goToPreviousStep}
              onUpdateNavigation={updateNavigationState}
              onBackToStart={() => setCurrentStep(1)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

