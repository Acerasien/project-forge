import React, { useState } from 'react'
import { FolderOpen, CheckCircle, Wifi, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { useSettingsStore } from '../store/useSettingsStore'
import { DoppelrandPanel } from '../components/ui/DoppelrandPanel'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { AIProfile } from '../../../shared/types/settings'

interface OnboardingProps {
  onComplete: () => void
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const settingsStore = useSettingsStore()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Workspace State
  const [workspacePath, setWorkspacePath] = useState<string>('')

  // AI Profile State
  const [providerId, setProviderId] = useState<string>('gemini')
  const [profileName, setProfileName] = useState<string>('Primary Gemini')
  const [apiKey, setApiKey] = useState<string>('')
  const [endpoint, setEndpoint] = useState<string>('')
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')

  // Connection Test State
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')
  const [testError, setTestError] = useState<string>('')
  const [testLatency, setTestLatency] = useState<number>(0)

  const [isFinishing, setIsFinishing] = useState<boolean>(false)

  const handleProviderChange = (val: string): void => {
    setProviderId(val)
    if (val === 'ollama') {
      setEndpoint('http://localhost:11434')
      setProfileName('Local Ollama')
      setApiKey('')
    } else if (val === 'lm-studio') {
      setEndpoint('http://localhost:1234')
      setProfileName('Local LM Studio')
      setApiKey('')
    } else if (val === 'openai') {
      setEndpoint('')
      setProfileName('Primary OpenAI')
      setApiKey('')
    } else {
      setEndpoint('')
      setProfileName('Primary Gemini')
      setApiKey('')
    }
    setTestStatus('idle')
    setModels([])
    setSelectedModel('')
  }

  const handleBrowse = async (): Promise<void> => {
    const path = await settingsStore.selectWorkspace()
    if (path) {
      setWorkspacePath(path)
    }
  }

  const handleTestConnection = async (): Promise<void> => {
    setTestStatus('testing')
    setTestError('')

    const tempProfile: AIProfile = {
      id: 'temp',
      name: profileName,
      providerId,
      apiKey: apiKey || undefined,
      endpoint: endpoint || undefined
    }

    const testRes = await settingsStore.testConnection(tempProfile)
    if (testRes.success) {
      setTestStatus('success')
      setTestLatency(testRes.latencyMs)

      // Fetch models
      const fetchedModels = await settingsStore.fetchModels(tempProfile)
      setModels(fetchedModels)
      if (fetchedModels.length > 0) {
        setSelectedModel(fetchedModels[0])
      }
    } else {
      setTestStatus('failed')
      setTestError(testRes.error || 'Connection failed')
    }
  }

  const handleFinish = async (): Promise<void> => {
    if (!workspacePath) return
    setIsFinishing(true)

    try {
      const activeProfile: AIProfile | null = selectedModel
        ? {
            id: 'primary-ai',
            name: profileName,
            providerId,
            apiKey: apiKey || undefined,
            endpoint: endpoint || undefined,
            model: selectedModel
          }
        : null

      if (activeProfile) {
        await settingsStore.saveProfile(activeProfile)
      }

      const success = await settingsStore.initializeWorkspace(workspacePath, activeProfile)
      if (success) {
        if (activeProfile) {
          await settingsStore.updateSettings({ activeProfileId: activeProfile.id })
        }
        onComplete()
      } else {
        alert('Failed to initialize the workspace directory.')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred during onboarding setup.')
    } finally {
      setIsFinishing(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen bg-forge-bg text-forge-text items-center justify-center font-mono p-4 forge-grid-bg">
      <div className="max-w-xl w-full">
        <DoppelrandPanel className="p-8 bg-forge-panel border border-forge-border shadow-glow-strong">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-2 mb-8">
            <h1 className="text-2xl font-bold tracking-wider text-forge-amber uppercase">
              Welcome to Forge
            </h1>
            <p className="text-xs text-forge-text-muted">
              Configure your local workspace and AI profile to get started.
            </p>

            {/* Progress indicators */}
            <div className="flex items-center gap-2 mt-4">
              <span
                className={`w-8 h-2 rounded-sm ${step >= 1 ? 'bg-forge-amber' : 'bg-forge-surface'}`}
              />
              <span
                className={`w-8 h-2 rounded-sm ${step >= 2 ? 'bg-forge-amber' : 'bg-forge-surface'}`}
              />
              <span
                className={`w-8 h-2 rounded-sm ${step >= 3 ? 'bg-forge-amber' : 'bg-forge-surface'}`}
              />
            </div>
          </div>

          {/* STEP 1: Workspace Path Selection */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-forge-amber uppercase tracking-wider">
                  1. Choose Workspace Directory
                </label>
                <p className="text-xs text-forge-text-muted leading-relaxed">
                  Forge is self-contained. All files, initiatives, databases, and structural designs
                  are stored inside this local folder, making your project entirely portable.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  value={workspacePath}
                  onChange={(e) => setWorkspacePath(e.target.value)}
                  placeholder="D:\Path\To\My-Projects"
                  readOnly
                  icon={<FolderOpen size={16} />}
                />
                <Button onClick={handleBrowse} variant="secondary">
                  Browse
                </Button>
              </div>

              <div className="flex justify-end mt-4 border-t border-forge-border pt-4">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!workspacePath}
                  variant="primary"
                  className="gap-2"
                >
                  Configure AI Provider <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: AI Provider Configuration */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-forge-amber uppercase tracking-wider">
                  2. Select AI Provider
                </label>
                <p className="text-xs text-forge-text-muted">
                  Select your model backend. Cloud APIs or local models are supported
                  interchangeably.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-forge-text-muted uppercase font-bold">
                    Provider
                  </span>
                  <Select value={providerId} onChange={(e) => handleProviderChange(e.target.value)}>
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="ollama">Ollama (Local)</option>
                    <option value="lm-studio">LM Studio (Local)</option>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-forge-text-muted uppercase font-bold">
                    Profile Name
                  </span>
                  <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                </div>
              </div>

              {/* Endpoint (Local Ollama/LM Studio) */}
              {(providerId === 'ollama' || providerId === 'lm-studio') && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-forge-text-muted uppercase font-bold">
                    Host Endpoint
                  </span>
                  <Input
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder={
                      providerId === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'
                    }
                  />
                </div>
              )}

              {/* API Key (OpenAI / Gemini) */}
              {(providerId === 'openai' || providerId === 'gemini') && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-forge-text-muted uppercase font-bold">
                    API Key
                  </span>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API Key"
                  />
                </div>
              )}

              {/* Test Connection Actions */}
              <div className="flex items-center justify-between border-t border-forge-border pt-4 mt-2">
                <Button onClick={() => setStep(1)} variant="ghost" className="gap-2">
                  <ArrowLeft size={14} /> Back
                </Button>

                <Button
                  onClick={handleTestConnection}
                  isLoading={testStatus === 'testing'}
                  variant={testStatus === 'success' ? 'ghost' : 'secondary'}
                  className="gap-2"
                >
                  <Wifi size={14} /> Test Connection
                </Button>
              </div>

              {/* Connection Status Log */}
              {testStatus === 'success' && (
                <div className="flex flex-col gap-3 bg-forge-surface border border-forge-amber/30 p-4 rounded-sm text-xs mt-2">
                  <div className="flex items-center gap-2 text-forge-amber">
                    <CheckCircle size={14} />
                    <span>
                      Connected to {providerName(providerId)} ({testLatency}ms)
                    </span>
                  </div>
                  {models.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-forge-text-muted">
                        Select Default Model
                      </span>
                      <Select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                      >
                        {models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  <div className="flex justify-end mt-2">
                    <Button onClick={() => setStep(3)} variant="primary" className="gap-2">
                      Next Step <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              )}

              {testStatus === 'failed' && (
                <div className="flex gap-2 bg-forge-error-dim border border-forge-error/30 text-forge-error p-3 rounded-sm text-xs mt-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">Connection Failed</span>
                    <span className="break-all font-mono leading-relaxed">{testError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Complete */}
          {step === 3 && (
            <div className="flex flex-col gap-6 items-center text-center py-4">
              <CheckCircle className="text-forge-amber w-16 h-16 animate-pulse" />

              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-lg text-forge-amber uppercase">
                  Configuration Verified
                </h3>
                <p className="text-xs text-forge-text-muted max-w-sm leading-relaxed">
                  Your workspace directory is active and the database has been constructed
                  successfully. Forge is now ready to build traceable engineering models.
                </p>
              </div>

              <div className="border border-forge-border bg-forge-surface p-4 rounded-sm w-full text-left text-xs font-mono flex flex-col gap-2">
                <div>
                  <span className="text-forge-text-muted">Workspace: </span>
                  <span className="break-all">{workspacePath}</span>
                </div>
                <div>
                  <span className="text-forge-text-muted">Active Model: </span>
                  <span>
                    {selectedModel} ({providerName(providerId)})
                  </span>
                </div>
              </div>

              <div className="flex justify-between w-full border-t border-forge-border pt-4 mt-4">
                <Button onClick={() => setStep(2)} variant="ghost" className="gap-2">
                  <ArrowLeft size={14} /> Back
                </Button>
                <Button
                  onClick={handleFinish}
                  isLoading={isFinishing}
                  variant="primary"
                  className="px-6"
                >
                  Enter Forge
                </Button>
              </div>
            </div>
          )}
        </DoppelrandPanel>
      </div>
    </div>
  )
}

function providerName(id: string): string {
  switch (id) {
    case 'gemini':
      return 'Google Gemini'
    case 'openai':
      return 'OpenAI'
    case 'ollama':
      return 'Ollama'
    case 'lm-studio':
      return 'LM Studio'
    default:
      return id
  }
}
