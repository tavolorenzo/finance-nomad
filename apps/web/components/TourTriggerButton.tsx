'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { OnboardingTour } from './OnboardingTour'

interface TourTriggerButtonProps {
  currentCurrency?: string
}

export function TourTriggerButton({ currentCurrency = 'EUR' }: TourTriggerButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-control text-sm font-medium border border-border bg-surface-2 text-text-primary hover:border-accent hover:text-accent transition"
      >
        <Sparkles size={16} className="text-accent" />
        Ver tour de bienvenida
      </button>

      <OnboardingTour
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentCurrency={currentCurrency}
      />
    </>
  )
}
