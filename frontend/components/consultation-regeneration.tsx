"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  RefreshCw, 
  Plus, 
  History, 
  MessageSquare, 
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConsultationResponse } from '@/lib/api-client'

export interface ConsultationHistoryEntry {
  id: string
  timestamp: Date
  symptoms: string
  consultation: ConsultationResponse
  regenerationReason?: string
}

interface ConsultationRegenerationProps {
  currentSymptoms: string
  consultationHistory: ConsultationHistoryEntry[]
  isRegenerating: boolean
  onRegenerate: (newSymptoms: string, reason?: string) => Promise<void>
  onViewHistory: (entry: ConsultationHistoryEntry) => void
  className?: string
}

export function ConsultationRegeneration({
  currentSymptoms,
  consultationHistory,
  isRegenerating,
  onRegenerate,
  onViewHistory,
  className = ''
}: ConsultationRegenerationProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newSymptoms, setNewSymptoms] = useState(currentSymptoms)
  const [regenerationReason, setRegenerationReason] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const handleRegenerate = async () => {
    if (newSymptoms.trim() === currentSymptoms.trim() && !regenerationReason.trim()) {
      // If no changes, just regenerate with same symptoms
      await onRegenerate(currentSymptoms, 'Requested new consultation with same symptoms')
    } else {
      await onRegenerate(newSymptoms.trim(), regenerationReason.trim() || 'Updated symptoms provided')
    }
    setIsDialogOpen(false)
    setRegenerationReason('')
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getRegenerationSuggestions = () => {
    const suggestions = [
      "Add more specific symptoms",
      "Include timing information (when symptoms started)",
      "Describe symptom severity or changes",
      "Add related symptoms or concerns",
      "Request different perspective or focus"
    ]
    return suggestions
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main regeneration controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 h-12 font-semibold border-2 hover:bg-muted/50 transition-all duration-300"
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Get New Consultation
                </>
              )}
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Regenerate Consultation
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Current symptoms display */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Current Symptoms:</label>
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    {currentSymptoms || "No symptoms provided"}
                  </p>
                </div>
              </div>

              {/* New symptoms input */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Update or Add Symptoms:
                </label>
                <Textarea
                  value={newSymptoms}
                  onChange={(e) => setNewSymptoms(e.target.value)}
                  placeholder="Describe any new symptoms, changes, or additional details..."
                  className="min-h-[120px] resize-none"
                  maxLength={2000}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Be specific about timing, severity, and any changes</span>
                  <span>{newSymptoms.length}/2000</span>
                </div>
              </div>

              {/* Regeneration reason */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Reason for Regeneration (Optional):</label>
                <Textarea
                  value={regenerationReason}
                  onChange={(e) => setRegenerationReason(e.target.value)}
                  placeholder="e.g., 'Need more specific recommendations', 'Symptoms have changed', 'Want different perspective'..."
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                />
              </div>

              {/* Suggestions */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Suggestions for Better Results:</label>
                <div className="grid gap-2">
                  {getRegenerationSuggestions().map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-800">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning for similar symptoms */}
              {newSymptoms.trim() === currentSymptoms.trim() && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    You haven't changed the symptoms. The new consultation may be similar to the current one.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => setIsDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="flex-1"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate New Consultation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* History button */}
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="h-12 px-6 font-semibold border-2 hover:bg-muted/50 transition-all duration-300"
          disabled={consultationHistory.length === 0}
        >
          <History className="mr-2 h-5 w-5" />
          History ({consultationHistory.length})
        </Button>
      </div>

      {/* Consultation History */}
      {showHistory && consultationHistory.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-muted/20 to-muted/30 border border-border/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Consultation History
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {consultationHistory.map((entry, index) => (
                <div
                  key={entry.id}
                  className="p-4 bg-card rounded-lg border border-border/50 hover:bg-card/80 transition-colors cursor-pointer"
                  onClick={() => onViewHistory(entry)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 0 ? "default" : "outline"} className="text-xs">
                          {index === 0 ? "Current" : `Version ${consultationHistory.length - index}`}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(entry.timestamp)}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          Symptoms: {entry.symptoms || "No symptoms provided"}
                        </p>
                        {entry.regenerationReason && (
                          <p className="text-xs text-muted-foreground">
                            Reason: {entry.regenerationReason}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {consultationHistory.length > 5 && (
              <div className="text-center pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Showing recent consultations. Older entries are automatically archived.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}