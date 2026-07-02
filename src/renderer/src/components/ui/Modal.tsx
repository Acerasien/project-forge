import React from 'react'
import { cn } from '../../utils/cn'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { forgeVariants } from '../../utils/animations'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={forgeVariants.fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              variants={forgeVariants.scaleUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className={cn(
                'pointer-events-auto w-full max-w-md bg-forge-panel border border-forge-border rounded-sm shadow-xl flex flex-col',
                className
              )}
            >
              <div className="flex items-center justify-between p-4 border-b border-forge-border bg-black/40">
                <h2 className="text-lg font-mono font-medium text-forge-amber tracking-tight">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="text-forge-text-muted hover:text-white transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
