import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import { SectionHeader } from '../components/ui/SectionHeader'
import { DoppelrandPanel } from '../components/ui/DoppelrandPanel'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { FolderOpen, Plus, Trash2, Check, AlertCircle, Wifi, Database } from 'lucide-react'
import { AIProfile } from '../../../shared/types/settings'

export const Settings: React.FC = () => {
  const store = useSettingsStore()

  // Form State for editing/creating profiles
  const [editingProfile, setEditingProfile] = useState<AIProfile | null>(null)
  const [profileName, setProfileName] = useState('')
  const [providerId, setProviderId] = useState('gemini')
  const [apiKey, setApiKey] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')

  // Connection status states
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')
  const [testLatency, setTestLatency] = useState(0)
  const [testError, setTestError] = useState('')

  // Settings health state
  const [activeConnectionHealthy, setActiveConnectionHealthy] = useState<boolean | null>(null)

  useEffect(() => {
    store.loadSettings()
  }, [])

  // Auto-run connection test against the active profile on load to populate the health checker
  useEffect(() => {
    let active = true
    if (store.activeProfileId && store.profiles.length > 0) {
      const activeProf = store.profiles.find((p) => p.id === store.activeProfileId)
      if (activeProf) {
        // Run light check
        store.testConnection(activeProf).then((res) => {
          if (active) {
            setActiveConnectionHealthy(res.success)
          }
        })
      }
    } else {
      Promise.resolve().then(() => {
        if (active) {
          setActiveConnectionHealthy(false)
        }
      })
    }
    return () => {
      active = false
    }
  }, [store.activeProfileId, store.profiles, store])

  // Setup form fields on edit profile toggle
  const handleEditProfile = (profile: AIProfile): void => {
    setEditingProfile(profile)
    setProfileName(profile.name)
    setProviderId(profile.providerId)
    setApiKey(profile.apiKey || '')
    setEndpoint(profile.endpoint || '')
    setTestStatus('idle')
    setModels([])
    setSelectedModel(profile.model || '')

    // If there's an active profile, load its model list
    if (profile.model) {
      store.fetchModels(profile).then((list) => {
        setModels(list)
      })
    }
  }

  const handleNewProfile = (): void => {
    const newId = `profile_${Date.now()}`
    setEditingProfile({
      id: newId,
      name: 'New Provider Profile',
      providerId: 'gemini'
    })
    setProfileName('New Provider Profile')
    setProviderId('gemini')
    setApiKey('')
    setEndpoint('')
    setModels([])
    setSelectedModel('')
    setTestStatus('idle')
  }

  const handleProviderChange = (val: string): void => {
    setProviderId(val)
    if (val === 'ollama') {
      setEndpoint('http://localhost:11434')
    } else if (val === 'lm-studio') {
      setEndpoint('http://localhost:1234')
    } else if (val === 'openai' || val === 'gemini') {
      setEndpoint('')
    }
    setTestStatus('idle')
    setModels([])
    setSelectedModel('')
  }

  const handleTestConnection = async (): Promise<void> => {
    if (!editingProfile) return
    setTestStatus('testing')
    setTestError('')

    const tempProfile: AIProfile = {
      id: editingProfile.id,
      name: profileName,
      providerId,
      apiKey: apiKey || undefined,
      endpoint: endpoint || undefined
    }

    const res = await store.testConnection(tempProfile)
    if (res.success) {
      setTestStatus('success')
      setTestLatency(res.latencyMs)

      const list = await store.fetchModels(tempProfile)
      setModels(list)
      if (list.length > 0) {
        setSelectedModel(list[0])
      }
    } else {
      setTestStatus('failed')
      setTestError(res.error || 'Connection failed')
    }
  }

  const handleSaveProfile = async (): Promise<void> => {
    if (!editingProfile) return

    const resolvedProfile: AIProfile = {
      id: editingProfile.id,
      name: profileName,
      providerId,
      apiKey: apiKey || undefined,
      endpoint: endpoint || undefined,
      model: selectedModel || undefined
    }

    const success = await store.saveProfile(resolvedProfile)
    if (success) {
      // If we didn't have an active profile yet, make this the active profile
      if (!store.activeProfileId) {
        await store.updateSettings({ activeProfileId: resolvedProfile.id })
      }
      setEditingProfile(null)
    } else {
      alert('Failed to save profile.')
    }
  }

  const handleWorkspaceChange = async (): Promise<void> => {
    const chosenPath = await store.selectWorkspace()
    if (chosenPath) {
      const active = store.profiles.find((p) => p.id === store.activeProfileId) || null
      const success = await store.initializeWorkspace(chosenPath, active)
      if (success) {
        alert(`Workspace successfully set to ${chosenPath}`)
      } else {
        alert('Failed to update workspace.')
      }
    }
  }

  const handleSelectActiveProfile = async (id: string): Promise<void> => {
    await store.updateSettings({ activeProfileId: id })
  }

  const handleDeleteProfile = async (id: string): Promise<void> => {
    if (confirm('Are you sure you want to delete this AI profile?')) {
      await store.deleteProfile(id)
    }
  }

  // Get active profile for displaying current config details
  const activeProfile = store.profiles.find((p) => p.id === store.activeProfileId)

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto w-full font-mono">
        <SectionHeader
          title="Settings"
          description="Configure your workspace directories and AI model provider connections."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Settings Form Cards (Cols 1 & 2) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Workspace Config */}
            <DoppelrandPanel
              title="Workspace Settings"
              className="bg-forge-panel border border-forge-border"
            >
              <div className="flex flex-col gap-4">
                <p className="text-xs text-forge-text-muted leading-relaxed">
                  Choose the location on your disk where Forge generates databases, system
                  architectures, and derived engineering plans.
                </p>

                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-forge-bg border border-forge-border rounded-sm px-3 py-2 text-xs break-all flex items-center gap-2">
                    <FolderOpen size={14} className="text-forge-text-muted shrink-0" />
                    <span>
                      {store.workspacePath || 'No workspace selected (Onboarding required)'}
                    </span>
                  </div>
                  <Button onClick={handleWorkspaceChange} variant="secondary" className="gap-2">
                    Change Workspace
                  </Button>
                </div>
              </div>
            </DoppelrandPanel>

            {/* AI Profile Registry */}
            <DoppelrandPanel
              title="AI Provider Profiles"
              className="bg-forge-panel border border-forge-border"
            >
              <div className="flex flex-col gap-4">
                {/* Profile Table / List */}
                <div className="flex flex-col gap-2">
                  {store.profiles.length === 0 ? (
                    <div className="text-xs text-forge-text-muted italic p-4 bg-forge-surface border border-dashed border-forge-border text-center rounded-sm">
                      No AI provider profiles configured. Click &quot;Create Profile&quot; to start.
                    </div>
                  ) : (
                    store.profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                          store.activeProfileId === profile.id
                            ? 'border-forge-amber bg-forge-amber/5'
                            : 'border-forge-border bg-forge-surface'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="active-profile"
                            id={`radio-${profile.id}`}
                            checked={store.activeProfileId === profile.id}
                            onChange={() => handleSelectActiveProfile(profile.id)}
                            className="accent-forge-amber w-3.5 h-3.5"
                          />
                          <label
                            htmlFor={`radio-${profile.id}`}
                            className="flex flex-col gap-0.5 cursor-pointer text-xs"
                          >
                            <span className="font-bold">{profile.name}</span>
                            <span className="text-[10px] text-forge-text-muted uppercase">
                              {profile.providerId} • Model: {profile.model || 'None'}
                            </span>
                          </label>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEditProfile(profile)}
                            size="sm"
                            variant="ghost"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteProfile(profile.id)}
                            size="sm"
                            variant="danger"
                            className="p-1.5"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {!editingProfile && (
                  <div className="flex justify-end border-t border-forge-border pt-4">
                    <Button onClick={handleNewProfile} variant="primary" className="gap-2">
                      <Plus size={14} /> Create Profile
                    </Button>
                  </div>
                )}
              </div>
            </DoppelrandPanel>

            {/* Edit / New Profile Form */}
            {editingProfile && (
              <DoppelrandPanel
                title={editingProfile.apiKey ? 'Edit AI Profile' : 'New AI Profile'}
                className="bg-forge-panel border border-forge-border"
              >
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-forge-text-muted font-bold uppercase">
                        Profile Name
                      </span>
                      <Input
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="My Gemini Setup"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-forge-text-muted font-bold uppercase">
                        AI Provider
                      </span>
                      <Select
                        value={providerId}
                        onChange={(e) => handleProviderChange(e.target.value)}
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                        <option value="ollama">Ollama (Local)</option>
                        <option value="lm-studio">LM Studio (Local)</option>
                      </Select>
                    </div>
                  </div>

                  {/* API Key Input */}
                  {(providerId === 'openai' || providerId === 'gemini') && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-forge-text-muted font-bold uppercase">
                        API Key
                      </span>
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={editingProfile.apiKey ? '••••••••••••' : 'Enter API Credentials'}
                      />
                    </div>
                  )}

                  {/* Endpoint Input */}
                  {(providerId === 'ollama' || providerId === 'lm-studio') && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-forge-text-muted font-bold uppercase">
                        Local Endpoint
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

                  {/* Test Connection Button */}
                  <div className="flex justify-between items-center border-t border-forge-border pt-4 mt-2">
                    <Button onClick={() => setEditingProfile(null)} variant="ghost">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleTestConnection}
                      isLoading={testStatus === 'testing'}
                      variant="secondary"
                      className="gap-2"
                    >
                      <Wifi size={14} /> Test Connection
                    </Button>
                  </div>

                  {/* Connection Test Output */}
                  {testStatus === 'success' && (
                    <div className="flex flex-col gap-3 bg-forge-surface border border-forge-amber/30 p-4 rounded-sm text-xs mt-2">
                      <div className="flex items-center gap-2 text-forge-amber">
                        <Check size={14} />
                        <span>Connected successfully! Latency: {testLatency}ms</span>
                      </div>
                      {models.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-bold text-forge-text-muted">
                            Select Target Model
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
                        <Button onClick={handleSaveProfile} variant="primary">
                          Save Config
                        </Button>
                      </div>
                    </div>
                  )}

                  {testStatus === 'failed' && (
                    <div className="flex gap-2 bg-forge-error-dim border border-forge-error/30 text-forge-error p-3 rounded-sm text-xs mt-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">Verification Failed</span>
                        <span className="break-all font-mono leading-relaxed">{testError}</span>
                      </div>
                    </div>
                  )}
                </div>
              </DoppelrandPanel>
            )}
          </div>

          {/* Health Check & Status Sidebar (Col 3) */}
          <div className="flex flex-col gap-6">
            <DoppelrandPanel
              title="System Health Checks"
              className="bg-forge-panel border border-forge-border"
            >
              <div className="flex flex-col gap-4">
                {/* Check 1: Workspace */}
                <div className="flex items-start justify-between py-2 border-b border-forge-border text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Workspace Configuration</span>
                    <span className="text-[10px] text-forge-text-muted break-all max-w-[180px]">
                      {store.workspacePath
                        ? 'Path is valid and directory exists'
                        : 'Workspace path is missing'}
                    </span>
                  </div>
                  <div className="shrink-0">
                    {store.workspacePath ? (
                      <Check className="text-forge-amber" size={16} />
                    ) : (
                      <AlertCircle className="text-forge-error" size={16} />
                    )}
                  </div>
                </div>

                {/* Check 2: Provider */}
                <div className="flex items-start justify-between py-2 border-b border-forge-border text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Active AI Provider</span>
                    <span className="text-[10px] text-forge-text-muted">
                      {activeProfile
                        ? `${activeProfile.name} is configured`
                        : 'No active profile selected'}
                    </span>
                  </div>
                  <div className="shrink-0">
                    {activeProfile ? (
                      <Check className="text-forge-amber" size={16} />
                    ) : (
                      <AlertCircle className="text-forge-error" size={16} />
                    )}
                  </div>
                </div>

                {/* Check 3: Connection */}
                <div className="flex items-start justify-between py-2 border-b border-forge-border text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Endpoint Connectivity</span>
                    <span className="text-[10px] text-forge-text-muted">
                      {activeConnectionHealthy === null
                        ? 'Testing connection...'
                        : activeConnectionHealthy
                          ? 'Models accessible and online'
                          : 'Cannot communicate with AI API'}
                    </span>
                  </div>
                  <div className="shrink-0">
                    {activeConnectionHealthy === null ? (
                      <span className="text-[10px] text-forge-text-muted font-bold">...</span>
                    ) : activeConnectionHealthy ? (
                      <Check className="text-forge-amber" size={16} />
                    ) : (
                      <AlertCircle className="text-forge-error" size={16} />
                    )}
                  </div>
                </div>

                {/* Check 4: Embeddings */}
                <div className="flex items-start justify-between py-2 border-b border-forge-border text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Embedding Engine</span>
                    <span className="text-[10px] text-forge-text-muted">
                      Optional (Defaults to LLM token limits)
                    </span>
                  </div>
                  <div className="shrink-0">
                    <span className="text-[10px] text-forge-text-muted uppercase font-bold">N/A</span>
                  </div>
                </div>

                {/* Check 5: Vector Store */}
                <div className="flex items-start justify-between py-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Vector Persistence</span>
                    <span className="text-[10px] text-forge-text-muted">
                      Local relational store (SQLite Kysely)
                    </span>
                  </div>
                  <div className="shrink-0 text-forge-amber">
                    <Database size={15} />
                  </div>
                </div>
              </div>
            </DoppelrandPanel>

            <DoppelrandPanel
              title="Environment Info"
              className="bg-forge-panel border border-forge-border text-xs leading-relaxed"
            >
              <div className="flex flex-col gap-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-forge-text-muted">Vector DB:</span>
                  <span>SQLite 3 (WAL)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forge-text-muted">Workspace Sync:</span>
                  <span>Offline-first</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forge-text-muted">Model Context:</span>
                  <span>Standard (LLM Window)</span>
                </div>
              </div>
            </DoppelrandPanel>
          </div>
        </div>
      </div>
    </div>
  )
}
