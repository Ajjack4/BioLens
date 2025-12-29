"use client"

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Loader2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Phone, 
  Stethoscope,
  Shield,
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react'

// Types for consultation response
export interface ConsultationResponse {
  consultation: {
    conditionAssessment: string
    symptomCorrelation: string
    recommendations: string[]
    urgencyLevel: 'immediate' | 'within_week' | 'routine' | 'monitor'
    educationalInfo: string
    medicalDisclaimer: string
  }
  metadata: {
    modelUsed: string
    processingTime: number
    confidenceScore: number
    fallbackUsed: boolean
    safetyValidated: boolean
  }
  emergencyContacts?: EmergencyContact[]
}

export interface EmergencyContact {
  type: 'emergency' | 'urgent_care' | 'dermatologist'
  name: string
  phone: string
  description: string
}

interface ConsultationDisplayProps {
  consultation: ConsultationResponse | null
  isLoading: boolean
  error: string | null
  onRegenerate: () => void
  className?: string
}

// Utility functions for urgency level styling
const getUrgencyConfig = (urgencyLevel: string) => {
  switch (urgencyLevel) {
    case 'immediate':
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertTriangle,
        label: 'Immediate Attention',
        description: 'Seek medical care immediately'
      }
    case 'within_week':
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Clock,
        label: 'Within a Week',
        description: 'Schedule appointment within 1-2 weeks'
      }
    case 'routine':
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: CheckCircle,
        label: 'Routine Care',
        description: 'Schedule routine appointment'
      }
    case 'monitor':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: Info,
        label: 'Monitor',
        description: 'Continue monitoring condition'
      }
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: Info,
        label: 'Assessment Needed',
        description: 'Consult healthcare provider'
      }
  }
}

const getEmergencyContactIcon = (type: string) => {
  switch (type) {
    case 'emergency':
      return AlertTriangle
    case 'urgent_care':
      return Clock
    case 'dermatologist':
      return Stethoscope
    default:
      return Phone
  }
}

export function ConsultationDisplay({ 
  consultation, 
  isLoading, 
  error, 
  onRegenerate, 
  className = '' 
}: ConsultationDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assessment: true,
    recommendations: true,
    educational: false,
    contacts: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={`p-8 bg-gradient-to-br from-card to-card/80 border-2 border-border/50 shadow-lg ${className}`}>
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="w-8 h-8" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-foreground">Generating AI Consultation</h3>
            <p className="text-muted-foreground">
              Analyzing your results with Gemini AI to provide personalized medical guidance...
            </p>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Processing with medical AI</span>
            </div>
          </div>
          
          {/* Loading progress indicators */}
          <div className="space-y-2 max-w-md mx-auto">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Analyzing conditions</span>
              <span>Processing symptoms</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2">
              <div className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Error state
  if (error && !consultation) {
    return (
      <Card className={`p-8 bg-gradient-to-br from-card to-card/80 border-2 border-red-200 shadow-lg ${className}`}>
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-foreground">Consultation Unavailable</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              We encountered an issue generating your AI consultation. This could be due to temporary service limitations.
            </p>
            <Alert className="bg-red-50 border-red-200 max-w-md mx-auto">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={onRegenerate}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open('https://www.practo.com/search/doctors?results_type=doctor&q=%5B%7B%22word%22%3A%22Dermatologist%22%2C%22autocompleted%22%3Atrue%2C%22category%22%3A%22subspeciality%22%7D%5D&city=Bangalore', '_blank')}
              className="flex items-center gap-2"
            >
              <Stethoscope className="w-4 h-4" />
              Find Healthcare Provider
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // No consultation available
  if (!consultation) {
    return (
      <Card className={`p-8 bg-gradient-to-br from-muted/20 to-muted/30 border-2 border-dashed border-muted-foreground/20 ${className}`}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
            <Brain className="w-8 h-8 text-muted-foreground/60" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">AI Consultation Ready</h3>
            <p className="text-muted-foreground">
              Complete your analysis to receive personalized medical consultation
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const urgencyConfig = getUrgencyConfig(consultation.consultation.urgencyLevel)
  const UrgencyIcon = urgencyConfig.icon

  return (
    <Card className={`p-8 bg-gradient-to-br from-card to-card/80 border-2 border-border/50 shadow-lg ${className}`}>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h3 className="text-2xl font-bold text-foreground">AI Medical Consultation</h3>
              <p className="text-muted-foreground">Powered by {consultation.metadata.modelUsed}</p>
            </div>
          </div>

          {/* Metadata badges */}
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Safety Validated
            </Badge>
            {consultation.metadata.fallbackUsed && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Enhanced Analysis
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {consultation.metadata.processingTime}ms
            </Badge>
          </div>
        </div>

        {/* Urgency Level */}
        <div className="flex justify-center">
          <Badge 
            variant="outline" 
            className={`px-4 py-2 text-sm font-semibold border-2 ${urgencyConfig.color}`}
          >
            <div className="flex items-center gap-2">
              <UrgencyIcon className="w-4 h-4" />
              <div className="text-left">
                <div className="font-semibold">{urgencyConfig.label}</div>
                <div className="text-xs opacity-80">{urgencyConfig.description}</div>
              </div>
            </div>
          </Badge>
        </div>

        {/* Condition Assessment */}
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('assessment')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 hover:bg-primary/15 transition-colors"
          >
            <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Condition Assessment
            </h4>
            <div className={`transform transition-transform ${expandedSections.assessment ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {expandedSections.assessment && (
            <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl p-6 border border-border/50 shadow-inner">
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line">
                {consultation.consultation.conditionAssessment}
              </div>
            </div>
          )}
        </div>

        {/* Symptom Correlation */}
        {consultation.consultation.symptomCorrelation && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 rounded-xl p-6 border border-blue-200">
            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Symptom Analysis
            </h4>
            <p className="text-sm text-foreground leading-relaxed">
              {consultation.consultation.symptomCorrelation}
            </p>
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('recommendations')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-50/50 rounded-xl border border-green-200 hover:bg-green-100/50 transition-colors"
          >
            <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Recommendations ({consultation.consultation.recommendations.length})
            </h4>
            <div className={`transform transition-transform ${expandedSections.recommendations ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {expandedSections.recommendations && (
            <div className="space-y-3">
              {consultation.consultation.recommendations.map((recommendation, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50/50 to-transparent rounded-lg border border-green-100"
                >
                  <div className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Educational Information */}
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('educational')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-50/50 rounded-xl border border-purple-200 hover:bg-purple-100/50 transition-colors"
          >
            <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-600" />
              Educational Information
            </h4>
            <div className={`transform transition-transform ${expandedSections.educational ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {expandedSections.educational && (
            <div className="bg-gradient-to-br from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line">
                {consultation.consultation.educationalInfo}
              </div>
            </div>
          )}
        </div>

        {/* Emergency Contacts */}
        {consultation.emergencyContacts && consultation.emergencyContacts.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={() => toggleSection('contacts')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-50/50 rounded-xl border border-red-200 hover:bg-red-100/50 transition-colors"
            >
              <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Phone className="w-5 h-5 text-red-600" />
                Emergency Contacts ({consultation.emergencyContacts.length})
              </h4>
              <div className={`transform transition-transform ${expandedSections.contacts ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {expandedSections.contacts && (
              <div className="space-y-3">
                {consultation.emergencyContacts.map((contact, index) => {
                  const ContactIcon = getEmergencyContactIcon(contact.type)
                  return (
                    <div 
                      key={index}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-50/50 to-transparent rounded-lg border border-red-100"
                    >
                      <div className="w-10 h-10 bg-red-100 text-red-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <ContactIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-foreground">{contact.name}</h5>
                        <p className="text-sm text-muted-foreground">{contact.description}</p>
                        <p className="text-sm font-medium text-red-700">{contact.phone}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Medical Disclaimer */}
        <Alert className="bg-amber-50 border-amber-200 shadow-sm">
          <Shield className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-sm leading-relaxed text-amber-800">
            {consultation.consultation.medicalDisclaimer}
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border/50">
          <Button
            onClick={onRegenerate}
            variant="outline"
            className="flex-1 h-12 font-semibold border-2 hover:bg-muted/50 transition-all duration-300"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Get New Consultation
          </Button>
          <Button 
            className="flex-1 h-12 font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300" 
            onClick={() => window.open('https://www.practo.com/search/doctors?results_type=doctor&q=%5B%7B%22word%22%3A%22Dermatologist%22%2C%22autocompleted%22%3Atrue%2C%22category%22%3A%22subspeciality%22%7D%5D&city=Bangalore', '_blank')}
          >
            <Stethoscope className="mr-2 h-5 w-5" />
            Find Healthcare Provider
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}