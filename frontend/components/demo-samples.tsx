"use client"

import React, { useState } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Play, 
  Image as ImageIcon, 
  FileText, 
  Zap, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from "lucide-react"

export interface DemoSample {
  id: string
  name: string
  description: string
  imageUrl: string
  symptoms: string
  expectedCondition: string
  riskLevel: 'low' | 'medium' | 'high'
  category: string
  processingTime: string
}

const DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'eczema-sample',
    name: 'Eczema Case Study',
    description: 'Atopic dermatitis with typical presentation on arm',
    imageUrl: '/images/i1.jpeg',
    symptoms: 'Itchy, red, inflamed patches on my arm that have been getting worse over the past week. The skin feels dry and sometimes cracks. It gets worse at night and after I shower.',
    expectedCondition: 'Eczema/Atopic Dermatitis',
    riskLevel: 'medium',
    category: 'Inflammatory',
    processingTime: '~3-5 seconds'
  },
  {
    id: 'psoriasis-sample',
    name: 'Psoriasis Example',
    description: 'Plaque psoriasis with characteristic scaling',
    imageUrl: '/placeholder.jpg',
    symptoms: 'Thick, scaly patches on my elbow that are silver-white in color. They are not very itchy but feel rough and sometimes bleed when I scratch them. Been there for about 3 months.',
    expectedCondition: 'Psoriasis',
    riskLevel: 'medium',
    category: 'Autoimmune',
    processingTime: '~3-5 seconds'
  },
  {
    id: 'fungal-sample',
    name: 'Fungal Infection',
    description: 'Ringworm with circular pattern',
    imageUrl: '/placeholder.jpg',
    symptoms: 'Circular, red rash that started small but is spreading outward. The center is clearing up but the edges are red and slightly raised. Very itchy, especially at night.',
    expectedCondition: 'Fungal Infection (Ringworm)',
    riskLevel: 'low',
    category: 'Infectious',
    processingTime: '~2-4 seconds'
  },
  {
    id: 'melanoma-sample',
    name: 'Suspicious Mole',
    description: 'Asymmetric mole requiring urgent evaluation',
    imageUrl: '/placeholder.jpg',
    symptoms: 'This mole on my back has changed over the past 2 months. It used to be smaller and more uniform in color, but now it has irregular borders and multiple colors including black and brown.',
    expectedCondition: 'Suspicious Lesion (Requires Urgent Evaluation)',
    riskLevel: 'high',
    category: 'Oncological',
    processingTime: '~4-6 seconds'
  },
  {
    id: 'acne-sample',
    name: 'Acne Vulgaris',
    description: 'Moderate acne with inflammatory lesions',
    imageUrl: '/placeholder.jpg',
    symptoms: 'Multiple red bumps and whiteheads on my face, especially around my forehead and chin. Some are painful to touch. This has been ongoing for about 6 months and seems to get worse during stressful periods.',
    expectedCondition: 'Acne Vulgaris',
    riskLevel: 'low',
    category: 'Dermatological',
    processingTime: '~2-3 seconds'
  },
  {
    id: 'healthy-sample',
    name: 'Healthy Skin',
    description: 'Normal skin for comparison',
    imageUrl: '/placeholder.jpg',
    symptoms: 'No specific symptoms. Just want to check if this area of skin looks normal. No pain, itching, or changes noticed.',
    expectedCondition: 'Healthy Skin',
    riskLevel: 'low',
    category: 'Normal',
    processingTime: '~1-2 seconds'
  }
]

interface DemoSamplesProps {
  onSelectSample: (sample: DemoSample) => void
  isProcessing: boolean
}

export function DemoSamples({ onSelectSample, isProcessing }: DemoSamplesProps) {
  const [selectedSample, setSelectedSample] = useState<string | null>(null)

  const handleSelectSample = (sample: DemoSample) => {
    setSelectedSample(sample.id)
    onSelectSample(sample)
  }

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <AlertTriangle className="w-3 h-3" />
      case 'medium':
        return <TrendingUp className="w-3 h-3" />
      case 'low':
        return <CheckCircle2 className="w-3 h-3" />
      default:
        return <CheckCircle2 className="w-3 h-3" />
    }
  }

  return (
    <section className="mb-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/20">
          <Zap className="w-4 h-4" />
          Try Demo Samples
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-4">Test with Sample Cases</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Experience BioLens capabilities with these curated medical cases. Each sample includes realistic symptoms and demonstrates different analysis scenarios.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {DEMO_SAMPLES.map((sample) => (
          <Card 
            key={sample.id} 
            className={`group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
              selectedSample === sample.id 
                ? 'border-primary bg-primary/5 shadow-lg' 
                : 'border-border/50 hover:border-primary/30'
            }`}
          >
            {/* Image Section */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={sample.imageUrl}
                alt={sample.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              
              {/* Risk Badge */}
              <div className="absolute top-3 right-3">
                <Badge className={`${getRiskBadgeColor(sample.riskLevel)} border font-medium`}>
                  {getRiskIcon(sample.riskLevel)}
                  <span className="ml-1 capitalize">{sample.riskLevel} Risk</span>
                </Badge>
              </div>

              {/* Category Badge */}
              <div className="absolute top-3 left-3">
                <Badge variant="secondary" className="bg-black/50 text-white border-white/20">
                  {sample.category}
                </Badge>
              </div>

              {/* Processing Time */}
              <div className="absolute bottom-3 left-3">
                <div className="flex items-center gap-1 text-white/90 text-xs bg-black/50 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  {sample.processingTime}
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">{sample.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{sample.description}</p>
                <div className="text-xs text-primary font-medium">
                  Expected: {sample.expectedCondition}
                </div>
              </div>

              {/* Symptoms Preview */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Sample Symptoms:</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {sample.symptoms}
                </p>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => handleSelectSample(sample)}
                disabled={isProcessing}
                className="w-full h-10 font-medium transition-all duration-300"
                variant={selectedSample === sample.id ? "default" : "outline"}
              >
                {isProcessing && selectedSample === sample.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {selectedSample === sample.id ? 'Selected' : 'Try This Sample'}
                  </>
                )}
              </Button>
            </div>

            {/* Selection Indicator */}
            {selectedSample === sample.id && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/80"></div>
            )}
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <div className="mt-12 max-w-4xl mx-auto">
        <Card className="p-6 bg-gradient-to-r from-muted/30 to-muted/50 border-border/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">About Demo Samples</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                These curated samples demonstrate BioLens capabilities across different skin conditions and risk levels. 
                Each case includes realistic symptoms and showcases how our AI analyzes various dermatological presentations.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Medically reviewed sample cases</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Realistic symptom descriptions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Various risk levels demonstrated</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Full consultation generation</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}

export default DemoSamples