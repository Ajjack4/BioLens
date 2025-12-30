"use client"

import jsPDF from "jspdf"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download,
  Share2,
  FileText,
  Mail,
  Copy,
  CheckCircle,
  AlertCircle,
  Printer,
  QrCode,
  Shield,
  Clock,
  User,
  Stethoscope,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ConsultationResponse } from '@/lib/api-client'
import { ConsultationHistoryEntry } from '@/lib/consultation-history'

interface ConsultationExportProps {
  consultation: ConsultationResponse
  symptoms: string
  sessionId: string
  analysisResult?: any
  consultationHistory?: ConsultationHistoryEntry[]
  className?: string
}

interface ShareableLink {
  id: string
  url: string
  expiresAt: Date
  accessCount: number
  maxAccess: number
}

export function ConsultationExport({
  consultation,
  symptoms,
  sessionId,
  analysisResult,
  consultationHistory = [],
  className = ''
}: ConsultationExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'text' | 'json'>('pdf')
  const [shareableLink, setShareableLink] = useState<ShareableLink | null>(null)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [providerNotes, setProviderNotes] = useState('')

  // Generate consultation summary for healthcare providers
  const generateProviderSummary = () => {
    if (!consultation.consultation) return null

    const { consultation: consult, metadata } = consultation
    const timestamp = new Date().toLocaleString()

    return {
      patientInfo: {
        sessionId,
        consultationDate: timestamp,
        symptoms: symptoms || 'No symptoms provided',
        analysisMethod: 'BiomedCLIP AI Analysis'
      },
      aiAnalysis: {
        model: metadata?.modelUsed || 'Unknown',
        confidence: metadata?.confidenceScore || 0,
        processingTime: metadata?.processingTime || 0,
        fallbackUsed: metadata?.fallbackUsed || false,
        safetyValidated: metadata?.safetyValidated || false
      },
      clinicalFindings: {
        conditionAssessment: consult.conditionAssessment,
        symptomCorrelation: consult.symptomCorrelation,
        urgencyLevel: consult.urgencyLevel,
        recommendations: consult.recommendations
      },
      additionalInfo: {
        educationalContent: consult.educationalInfo,
        emergencyContacts: consultation.emergencyContacts || [],
        consultationHistory: consultationHistory.length,
        providerNotes: providerNotes.trim() || 'No additional notes'
      }
    }
  }

  // Generate PDF content
  const generatePDFContent = () => {
    if (!consultation.consultation) return ''

    const summary = generateProviderSummary()
    if (!summary) return ''

    const timestamp = new Date().toLocaleString()

    return `
# BioLens AI Consultation Report

**Generated:** ${timestamp}
**Session ID:** ${sessionId}

## Patient Information
- **Consultation Date:** ${summary.patientInfo.consultationDate}
- **Analysis Method:** ${summary.patientInfo.analysisMethod}
- **Reported Symptoms:** ${summary.patientInfo.symptoms}

## AI Analysis Details
- **Model Used:** ${summary.aiAnalysis.model}
- **Confidence Score:** ${(summary.aiAnalysis.confidence * 100).toFixed(1)}%
- **Processing Time:** ${summary.aiAnalysis.processingTime}ms
- **Fallback Used:** ${summary.aiAnalysis.fallbackUsed ? 'Yes' : 'No'}
- **Safety Validated:** ${summary.aiAnalysis.safetyValidated ? 'Yes' : 'No'}

## Clinical Assessment

### Condition Assessment
${summary.clinicalFindings.conditionAssessment}

### Symptom Analysis
${summary.clinicalFindings.symptomCorrelation || 'No specific symptom correlation provided'}

### Urgency Level
**${summary.clinicalFindings.urgencyLevel.toUpperCase().replace('_', ' ')}**

### AI Recommendations
${summary.clinicalFindings.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## Educational Information
${summary.additionalInfo.educationalContent}

## Provider Notes
${summary.additionalInfo.providerNotes}

## Emergency Contacts
${summary.additionalInfo.emergencyContacts.length > 0
        ? summary.additionalInfo.emergencyContacts.map(contact =>
          `- **${contact.name}** (${contact.type}): ${contact.phone}\n  ${contact.description}`
        ).join('\n')
        : 'No emergency contacts provided'
      }

## Consultation History
- **Total Consultations:** ${summary.additionalInfo.consultationHistory}
- **Current Session:** ${sessionId}

## Important Medical Disclaimer
${consultation.consultation?.medicalDisclaimer || 'This is supplementary information only and should not replace professional medical advice.'}

---
*This report was generated by BioLens AI consultation system. This is supplementary information only and should not replace professional medical evaluation and care.*
    `.trim()
  }

  // Export as PDF
  const exportAsPDF = async () => {
    setIsExporting(true)

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const content = generatePDFContent()

      const marginX = 15
      let cursorY = 20
      const pageHeight = doc.internal.pageSize.height

      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)

      const lines = doc.splitTextToSize(content, 180)

      lines.forEach((line: string) => {
        if (cursorY > pageHeight - 20) {
          doc.addPage()
          cursorY = 20
        }
        doc.text(line, marginX, cursorY)
        cursorY += 6
      })

      doc.save(`biolens-consultation-${sessionId}.pdf`)
      console.log("✅ PDF exported successfully")
    } catch (error) {
      console.error("❌ PDF export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  // Export as Text
  const exportAsText = async () => {
    setIsExporting(true)

    try {
      const content = generatePDFContent()

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = `biolens-consultation-${sessionId}.txt`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)

      console.log("✅ Text file exported successfully")
    } catch (error) {
      console.error("❌ Text export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  // Export as JSON
  const exportAsJSON = async () => {
    setIsExporting(true)
    try {
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          sessionId,
          version: '1.0',
          source: 'BioLens AI Consultation'
        },
        consultation,
        symptoms,
        analysisResult,
        consultationHistory,
        providerSummary: generateProviderSummary()
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `biolens-consultation-${sessionId}-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log('✅ Consultation exported as JSON')
    } catch (error) {
      console.error('❌ JSON export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Generate shareable link
  const generateShareableLink = async () => {
    setIsGeneratingLink(true)
    try {
      // In a real implementation, this would call an API to create a secure shareable link
      // For now, we'll simulate this with a local implementation
      const linkId = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      const link: ShareableLink = {
        id: linkId,
        url: `${window.location.origin}/shared-consultation/${linkId}`,
        expiresAt,
        accessCount: 0,
        maxAccess: 10
      }

      // Store in localStorage for demo purposes
      const shareData = {
        consultation,
        symptoms,
        sessionId,
        analysisResult,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      }
      localStorage.setItem(`shared-consultation-${linkId}`, JSON.stringify(shareData))

      setShareableLink(link)
      console.log('✅ Shareable link generated')
    } catch (error) {
      console.error('❌ Link generation failed:', error)
    } finally {
      setIsGeneratingLink(false)
    }
  }

  // Copy link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  // Send via email
  const sendViaEmail = async () => {
    if (!emailAddress.trim()) return

    setIsSendingEmail(true)
    try {
      // In a real implementation, this would call an API to send the email
      // For now, we'll open the default email client
      const subject = encodeURIComponent('BioLens AI Consultation Report')
      const body = encodeURIComponent(`
Please find attached your BioLens AI consultation report.

Session ID: ${sessionId}
Generated: ${new Date().toLocaleString()}

${shareableLink ? `View online: ${shareableLink.url}` : ''}

This consultation is for informational purposes only and should not replace professional medical advice.

Best regards,
BioLens Team
      `.trim())

      window.open(`mailto:${emailAddress}?subject=${subject}&body=${body}`)
      console.log('✅ Email client opened')
    } catch (error) {
      console.error('❌ Email sending failed:', error)
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Export Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="h-12 font-semibold border-2 hover:bg-muted/50 transition-all duration-300"
            >
              <Download className="mr-2 h-5 w-5" />
              Export PDF
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Export Consultation Report
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Provider Notes */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Additional Notes for Healthcare Provider:
                </label>
                <Textarea
                  value={providerNotes}
                  onChange={(e) => setProviderNotes(e.target.value)}
                  placeholder="Add any additional context, questions, or observations for your healthcare provider..."
                  className="min-h-[100px] resize-none"
                  maxLength={1000}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {providerNotes.length}/1000
                </div>
              </div>

              {/* Export Format Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Export Format:</label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                    onClick={() => setExportFormat('pdf')}
                    className="h-12"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    PDF Report
                  </Button>
                  <Button
                    variant={exportFormat === 'text' ? 'default' : 'outline'}
                    onClick={() => setExportFormat('text')}
                    className="h-12"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Text File
                  </Button>
                  <Button
                    variant={exportFormat === 'json' ? 'default' : 'outline'}
                    onClick={() => setExportFormat('json')}
                    className="h-12"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    JSON Data
                  </Button>
                </div>
              </div>

              {/* Export Preview */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Report Preview:</label>
                <div className="p-4 bg-muted/50 rounded-lg border max-h-60 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {exportFormat === 'json'
                      ? JSON.stringify(generateProviderSummary(), null, 2).substring(0, 500) + '...'
                      : generatePDFContent().substring(0, 500) + '...'
                    }
                  </pre>
                </div>
              </div>

              {/* Export Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => {
                    if (exportFormat === "pdf") exportAsPDF()
                    else if (exportFormat === "text") exportAsText()
                    else if (exportFormat === "json") exportAsJSON()
                  }}
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export {exportFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>


          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Share Consultation Securely
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Security Notice */}
              <Alert className="bg-amber-50 border-amber-200">
                <Shield className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Shared links expire in 7 days and are limited to 10 views for security. Only share with trusted healthcare providers.
                </AlertDescription>
              </Alert>

              {/* Generate Link */}
              {!shareableLink ? (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Generate a secure, temporary link to share your consultation with healthcare providers.
                  </p>
                  <Button
                    onClick={generateShareableLink}
                    disabled={isGeneratingLink}
                    className="w-full max-w-sm"
                  >
                    {isGeneratingLink ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Link...
                      </>
                    ) : (
                      <>
                        <QrCode className="mr-2 h-4 w-4" />
                        Generate Secure Link
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Link Details */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-semibold">Secure Link Generated</span>
                      </div>
                      <div className="text-sm text-green-700">
                        <p>Expires: {shareableLink.expiresAt.toLocaleDateString()}</p>
                        <p>Max Views: {shareableLink.maxAccess}</p>
                        <p>Current Views: {shareableLink.accessCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Link Sharing */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={shareableLink.url}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        onClick={() => copyToClipboard(shareableLink.url)}
                        variant="outline"
                        className="px-3"
                      >
                        {copySuccess ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {copySuccess && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Link copied to clipboard!
                      </p>
                    )}
                  </div>

                  {/* Email Sharing */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">Send via Email:</label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="healthcare.provider@example.com"
                        className="flex-1"
                      />
                      <Button
                        onClick={sendViaEmail}
                        disabled={!emailAddress.trim() || isSendingEmail}
                        variant="outline"
                      >
                        {isSendingEmail ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          onClick={() => window.print()}
          className="h-12 font-semibold border-2 hover:bg-muted/50 transition-all duration-300"
        >
          <Printer className="mr-2 h-5 w-5" />
          Print Report
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(generatePDFContent())}
          className="text-xs"
        >
          <Copy className="mr-1 h-3 w-3" />
          Copy Text
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('https://www.practo.com/search/doctors?results_type=doctor&q=%5B%7B%22word%22%3A%22Dermatologist%22%2C%22autocompleted%22%3Atrue%2C%22category%22%3A%22subspeciality%22%7D%5D&city=Bangalore', '_blank')}
          className="text-xs"
        >
          <ExternalLink className="mr-1 h-3 w-3" />
          Find Provider
        </Button>
      </div>

      {/* Export Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          Exported reports include your consultation details, AI analysis, and recommendations.
          Share only with trusted healthcare providers and follow your local privacy regulations.
        </AlertDescription>
      </Alert>
    </div>
  )
}