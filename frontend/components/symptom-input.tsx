"use client"

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MessageSquare, X, Plus, Sparkles } from 'lucide-react'

interface SymptomInputProps {
  onSymptomsChange: (symptoms: string) => void
  symptoms: string
  disabled?: boolean
}

export function SymptomInput({ onSymptomsChange, symptoms, disabled = false }: SymptomInputProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = () => {
    if (!isExpanded) {
      setIsExpanded(true)
    } else {
      setIsExpanded(false)
      onSymptomsChange('')
    }
  }

  const commonSymptoms = [
    "itchy and red",
    "dry and flaky", 
    "painful and swollen",
    "spreading rash",
    "burning sensation",
    "bumps or blisters",
    "discolored patches",
    "rough texture",
    "circular pattern",
    "scaling skin"
  ]

  const handleQuickSymptom = (symptom: string) => {
    const currentSymptoms = symptoms.trim()
    if (currentSymptoms) {
      onSymptomsChange(`${currentSymptoms}, ${symptom}`)
    } else {
      onSymptomsChange(symptom)
    }
  }

  if (!isExpanded) {
    return (
      <Card className="group p-6 border-2 border-dashed border-muted-foreground/20 bg-gradient-to-r from-muted/10 to-muted/20 hover:from-primary/5 hover:to-primary/10 hover:border-primary/30 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/40 transition-all duration-300">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Add Symptom Description</p>
              <p className="text-sm text-muted-foreground">Optional - helps improve analysis accuracy</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleToggle}
            disabled={disabled}
            className="text-primary hover:text-primary/80 hover:bg-primary/10 font-medium px-4 py-2 h-9"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Symptoms
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
            <MessageSquare className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <Label className="text-lg font-semibold text-foreground">Describe Your Symptoms</Label>
            <p className="text-sm text-muted-foreground">Help our AI understand your condition better</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleToggle}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full w-8 h-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Textarea
            placeholder="Describe what you're experiencing in detail... 

Examples:
• 'Itchy circular rash that appeared 2 weeks ago and is spreading'
• 'Red bumps on my arm that started yesterday, very itchy'
• 'Dry, flaky patches that won't go away despite moisturizing'
• 'Dark spot on my back that seems to be changing shape'"
            value={symptoms}
            onChange={(e) => onSymptomsChange(e.target.value)}
            disabled={disabled}
            className="min-h-[120px] resize-none text-sm leading-relaxed border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm"
            maxLength={500}
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>More details = better analysis</span>
            </div>
            <span className={`text-xs font-medium ${symptoms.length > 450 ? 'text-orange-500' : 'text-muted-foreground'}`}>
              {symptoms.length}/500
            </span>
          </div>
        </div>

        {/* Quick symptom buttons */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
              <Plus className="w-3 h-3 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Quick add common symptoms:</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {commonSymptoms.map((symptom) => (
              <Button
                key={symptom}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSymptom(symptom)}
                disabled={disabled}
                className="text-xs h-8 px-3 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all duration-200 border-border/60 bg-background/50 backdrop-blur-sm"
              >
                {symptom}
              </Button>
            ))}
          </div>
        </div>

        {/* Tips section */}
        <div className="bg-gradient-to-r from-muted/30 to-muted/20 rounded-xl p-4 border border-border/30">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Tips for better analysis:</h4>
              <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
                <li>• Include when symptoms started and how they've changed</li>
                <li>• Mention any pain, itching, or other sensations</li>
                <li>• Describe the appearance (color, texture, size, shape)</li>
                <li>• Note if it's spreading or staying in one area</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}