import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { forgeVariants } from '../../utils/animations'

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (prompt: string) => void
  placeholder?: string
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSubmit,
  placeholder = 'Ask AI to generate or modify...'
}) => {
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        setPrompt('')
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!prompt.trim()) return
    onSubmit(prompt.trim())
    setPrompt('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            variants={forgeVariants.slideDown}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-forge-surface border border-forge-border rounded shadow-xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center px-4 py-3 bg-forge-panel border-b border-forge-border">
                <span className="text-forge-amber font-mono text-sm mr-3">{'>'}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent border-none outline-none text-forge-text font-mono text-sm placeholder:text-forge-text-muted"
                />
              </div>
              <div className="px-4 py-2 bg-forge-surface flex justify-between items-center text-xs font-mono text-forge-text-muted">
                <span>Enter to submit</span>
                <span>Esc to cancel</span>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
