import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../../utils/cn'
import { motion, AnimatePresence } from 'framer-motion'
import { forgeVariants } from '../../utils/animations'

export interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, children, className }) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={forgeVariants.slideDown}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'absolute z-50 mt-2 right-0 min-w-[150px] bg-forge-panel border border-forge-border rounded-sm shadow-xl p-1',
              className
            )}
            onClick={() => setIsOpen(false)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ className, ...props }) => (
  <button
    className={cn(
      'w-full text-left px-3 py-1.5 text-sm text-forge-text rounded hover:bg-forge-surface hover:text-white transition-colors',
      className
    )}
    {...props}
  />
)
