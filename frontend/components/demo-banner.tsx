"use client"

import React from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, 
  Play, 
  Sparkles, 
  ArrowDown,
  Clock,
  CheckCircle2
} from "lucide-react"

interface DemoBannerProps {
  onScrollToDemo: () => void
}

export function DemoBanner({ onScrollToDemo }: DemoBannerProps) {
  return (
    <Card className="max-w-4xl mx-auto p-8 mb-12 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20 shadow-lg">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 mr-2" />
            Try Demo Mode
          </Badge>
        </div>
        
        <h3 className="text-2xl font-bold text-foreground mb-3">
          Experience BioLens with Sample Cases
        </h3>
        
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
          Test our AI-powered skin analysis with curated medical cases. Each sample includes realistic symptoms 
          and demonstrates different analysis scenarios - perfect for exploring BioLens capabilities.
        </p>
        
        <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>6 Medical Case Studies</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Instant Results</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Full AI Consultation</span>
          </div>
        </div>
        
        <Button 
          onClick={onScrollToDemo}
          size="lg"
          className="h-12 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Play className="mr-3 h-5 w-5" />
          Try Demo Samples
          <ArrowDown className="ml-3 h-5 w-5 animate-bounce" />
        </Button>
        
        <p className="text-xs text-muted-foreground mt-4">
          No upload required • Instant analysis • Full consultation experience
        </p>
      </div>
    </Card>
  )
}

export default DemoBanner