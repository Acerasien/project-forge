import React, { useState } from 'react'
import { Modal } from './ui/Modal'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { useInitiativeStore } from '../store/useInitiativeStore'
import { useNavigate } from 'react-router-dom'

interface InitiativeCreateModalProps {
  isOpen: boolean
  onClose: () => void
}

export const InitiativeCreateModal: React.FC<InitiativeCreateModalProps> = ({
  isOpen,
  onClose
}) => {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createInitiative, error } = useInitiativeStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    await createInitiative(name.trim())
    setIsSubmitting(false)

    // The store should set activeInitiativeId, we navigate to workspace
    onClose()
    setName('')
    navigate('/workspace')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Initialize Project">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-forge-text-muted font-mono mb-1">PROJECT_NAME</label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Phoenix Engine"
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="text-xs text-forge-error bg-forge-error-dim p-2 rounded border border-forge-error/50">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Initialize
          </Button>
        </div>
      </form>
    </Modal>
  )
}
