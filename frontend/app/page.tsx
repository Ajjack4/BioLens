"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, CheckCircle2, Loader2, Brain, Stethoscope, Shield, Zap, Activity } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SymptomInput } from "@/components/symptom-input"
import { AnalysisPieChart } from "@/components/analysis-pie-chart"
import { 
  uploadImage, 
  analyzeSkinCondition, 
  cleanupImage, 
  formatAnalysisForDisplay, 
  validateImageFile,
  generateSessionId,
  generateConsultation,
  type AnalysisResult,
  type ConsultationResponse as ConsultationResponseType
} from "@/lib/api-client"
import { ConsultationDisplay, type ConsultationResponse } from "@/components/consultation-display"

export default function BioLensHome() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [symptoms, setSymptoms] = useState<string>("")
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [formattedResult, setFormattedResult] = useState<string | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [uploadedPublicId, setUploadedPublicId] = useState<string | null>(null)
  const [sessionId] = useState<string>(() => generateSessionId())
  
  // Consultation state
  const [consultation, setConsultation] = useState<ConsultationResponse | null>(null)
  const [isConsultationLoading, setIsConsultationLoading] = useState(false)
  const [consultationError, setConsultationError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      handleFileSelect(droppedFile)
    }
  }, [])

  const handleFileSelect = (selectedFile: File) => {
    // Validate file before processing
    const validation = validateImageFile(selectedFile)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    setFile(selectedFile)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
    setAnalysisResult(null)
    setFormattedResult(null)
    setUploadedImageUrl(null)
    setUploadedPublicId(null)
    setConsultation(null)
    setConsultationError(null)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleAnalyze = async () => {
    if (!file) return

    setIsProcessing(true)

    try {
      // Step 1: Upload image to Cloudinary
      console.log('📤 Uploading image to Cloudinary...')
      const uploadResponse = await uploadImage(file)
      
      if (!uploadResponse.success || !uploadResponse.imageUrl) {
        throw new Error(uploadResponse.error || 'Failed to upload image')
      }

      console.log('✅ Image uploaded successfully:', uploadResponse.imageUrl)
      setUploadedImageUrl(uploadResponse.imageUrl)
      setUploadedPublicId(uploadResponse.publicId || null)

      // Step 2: Analyze the uploaded image
      console.log('🔬 Starting analysis...')
      const analysisResponse = await analyzeSkinCondition(
        uploadResponse.imageUrl, 
        symptoms, 
        sessionId
      )
      
      if (analysisResponse.analysis) {
        setAnalysisResult(analysisResponse.analysis)
        setFormattedResult(formatAnalysisForDisplay(analysisResponse.analysis))
        console.log('✅ Analysis completed successfully')
        
        // Step 3: Automatically generate consultation
        await generateConsultationForAnalysis(analysisResponse.analysis, symptoms)
      } else {
        throw new Error(analysisResponse.error || 'Analysis failed')
      }

    } catch (error) {
      console.error('❌ Analysis failed:', error)
      setFormattedResult(
        "❌ **Analysis Failed**\n\nWe encountered an error while analyzing your image. This could be due to:\n\n• Network connectivity issues\n• Server temporarily unavailable\n• Image upload or processing error\n\n**What to do next:**\n• Check your internet connection\n• Try uploading a different image\n• Wait a few minutes and try again\n• If the problem persists, consult a healthcare professional\n\n**⚠️ Important:** If you have urgent health concerns, please contact a healthcare provider immediately."
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const generateConsultationForAnalysis = async (analysis: AnalysisResult, currentSymptoms: string) => {
    setIsConsultationLoading(true)
    setConsultationError(null)
    
    try {
      console.log('🤖 Generating AI consultation...')
      const consultationResponse = await generateConsultation(analysis, currentSymptoms, sessionId)
      
      if (consultationResponse.success && consultationResponse.consultation) {
        // Convert API response to component format
        const consultationData: ConsultationResponse = {
          consultation: consultationResponse.consultation,
          metadata: consultationResponse.metadata!,
          emergencyContacts: consultationResponse.emergencyContacts
        }
        setConsultation(consultationData)
        console.log('✅ Consultation generated successfully')
      } else if (consultationResponse.fallbackConsultation) {
        // Handle fallback consultation
        setConsultation(consultationResponse.fallbackConsultation)
        console.log('✅ Fallback consultation provided')
      } else {
        throw new Error(consultationResponse.error || 'Failed to generate consultation')
      }
    } catch (error) {
      console.error('❌ Consultation generation failed:', error)
      setConsultationError(error instanceof Error ? error.message : 'Failed to generate consultation')
    } finally {
      setIsConsultationLoading(false)
    }
  }

  const handleRegenerateConsultation = async () => {
    if (!analysisResult) return
    await generateConsultationForAnalysis(analysisResult, symptoms)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Navbar */}
      <nav className="border-b border-border/40 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">BioLens</h1>
                <p className="text-xs text-muted-foreground font-medium">AI-Powered Skin Analysis</p>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="hidden md:flex items-center gap-8">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Brain className="w-4 h-4" />
                  <span className="font-medium">BiomedCLIP AI</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Privacy First</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">Instant Results</span>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                <Activity className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="text-center mb-16 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/20">
              <Zap className="w-4 h-4" />
              Powered by BiomedCLIP AI
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Advanced Skin
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"> Analysis</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              Get instant, AI-powered insights into your skin conditions with our advanced BiomedCLIP technology. 
              Upload an image and receive professional-grade analysis in seconds.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Privacy Protected</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Instant Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Medical Grade AI</span>
              </div>
            </div>
          </div>
        </section>

        {/* How to Use Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our advanced AI analyzes your skin images using state-of-the-art medical imaging technology
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1 */}
            <Card className="group p-8 text-center border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-gradient-to-b from-card to-card/50">
              <div className="mb-8 flex justify-center">
                <div className="relative w-56 h-56 rounded-2xl overflow-hidden bg-muted/50 shadow-lg group-hover:shadow-xl transition-shadow">
                  <img
                    src="/images/i1.jpeg"
                    alt="Person concerned about skin condition"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-6 font-bold text-lg shadow-lg">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Notice Symptoms</h3>
              <p className="text-muted-foreground leading-relaxed">
                Identify any unusual skin conditions, changes, or symptoms that concern you and need professional insight
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="group p-8 text-center border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-gradient-to-b from-card to-card/50">
              <div className="mb-8 flex justify-center">
                <div className="relative w-56 h-56 rounded-2xl overflow-hidden bg-muted/50 shadow-lg group-hover:shadow-xl transition-shadow">
                  <img
                    src="/animated-person-viewing-skin-rash-photos-on-smartpho.jpg"
                    alt="Person viewing skin rash photos on smartphone"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-6 font-bold text-lg shadow-lg">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Capture & Review</h3>
              <p className="text-muted-foreground leading-relaxed">
                Take clear, well-lit photos of the affected area and select the image that best shows your skin condition
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="group p-8 text-center border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-gradient-to-b from-card to-card/50">
              <div className="mb-8 flex justify-center">
                <div className="relative w-56 h-56 rounded-2xl overflow-hidden bg-muted/50 shadow-lg group-hover:shadow-xl transition-shadow">
                  <img
                    src="/animated-person-uploading-medical-image-to-biolens-.jpg"
                    alt="Person uploading medical image to BioLens website"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-6 font-bold text-lg shadow-lg">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Get AI Analysis</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upload your image to receive instant, comprehensive analysis powered by advanced BiomedCLIP AI technology
              </p>
            </Card>
          </div>
        </section>

        {/* Upload Section */}
        <section className="mb-20">
          <Card className="max-w-4xl mx-auto p-10 bg-gradient-to-br from-card via-card to-card/80 border-2 border-border/50 shadow-xl backdrop-blur-sm">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3 text-foreground">Upload Your Image</h2>
              <p className="text-muted-foreground">Drag and drop or click to select your skin image for analysis</p>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
                  : "border-border/60 hover:border-primary/50 bg-muted/20 hover:bg-muted/30"
              }`}
            >
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden rounded-2xl">
                <div className="absolute top-4 left-4 w-8 h-8 border-2 border-primary rounded-full animate-pulse"></div>
                <div className="absolute top-8 right-8 w-6 h-6 border-2 border-primary/60 rounded-full animate-pulse delay-300"></div>
                <div className="absolute bottom-8 left-8 w-4 h-4 border-2 border-primary/40 rounded-full animate-pulse delay-700"></div>
                <div className="absolute bottom-4 right-4 w-10 h-10 border-2 border-primary/30 rounded-full animate-pulse delay-1000"></div>
              </div>

              {preview ? (
                <div className="space-y-6">
                  <div className="relative w-80 h-80 mx-auto rounded-2xl overflow-hidden shadow-2xl">
                    <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">{file?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                    </p>
                  </div>
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={isProcessing} 
                    size="lg" 
                    className="w-full max-w-sm mx-auto h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-3 h-6 w-6" />
                        Analyze with BiomedCLIP
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <Upload className="w-20 h-20 mx-auto text-muted-foreground/60 mb-6" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-foreground">Drop your image here</h3>
                    <p className="text-muted-foreground">or click to browse your files</p>
                  </div>
                  <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={handleFileInput} />
                  <Button 
                    onClick={() => document.getElementById("file-upload")?.click()} 
                    size="lg"
                    className="h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Upload className="mr-3 h-6 w-6" />
                    Choose Image File
                  </Button>
                  <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground mt-6">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      JPG, PNG, WebP
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      Max 10MB
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      Secure Processing
                    </span>
                  </div>
                </div>
              )}
            </div>

            

            {/* Symptom Input Section */}
            <div className="mt-8">
              <SymptomInput 
                symptoms={symptoms}
                onSymptomsChange={setSymptoms}
                disabled={isProcessing}
              />
            </div>
            <Alert className="mt-8 bg-primary/5 border-primary/20 shadow-sm">
              <Shield className="h-5 w-5 text-primary" />
              <AlertDescription className="text-sm leading-relaxed">
                <strong className="text-primary">Privacy Guaranteed:</strong> Your images are processed securely using advanced encryption and are never stored on our servers. All analysis happens in real-time and data is immediately discarded after processing.
              </AlertDescription>
            </Alert>
          </Card>
        </section>

        {/* Detection Results Section */}
        <section className="mb-20">
          <Card className="max-w-4xl mx-auto p-10 border-2 border-muted/50 bg-gradient-to-br from-card via-card to-card/80 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg">
                <Activity className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Analysis Results</h2>
                <p className="text-muted-foreground">AI-powered insights from BiomedCLIP technology</p>
              </div>
            </div>

            {formattedResult ? (
              <>
                {/* Pie Chart Section */}
                {analysisResult && (
                  <div className="mb-8">
                    <AnalysisPieChart analysisResult={analysisResult} />
                  </div>
                )}

                {/* AI Consultation Section */}
                <div className="mb-8">
                  <ConsultationDisplay
                    consultation={consultation}
                    isLoading={isConsultationLoading}
                    error={consultationError}
                    onRegenerate={handleRegenerateConsultation}
                  />
                </div>

                <div className="prose prose-sm max-w-none">
                  <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl p-8 whitespace-pre-line text-sm leading-relaxed border border-border/50 shadow-inner">
                    {formattedResult}
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={async () => {
                      // Clean up uploaded image if it exists
                      if (uploadedPublicId) {
                        try {
                          await cleanupImage(uploadedPublicId)
                          console.log('🗑️ Image cleaned up from Cloudinary')
                        } catch (error) {
                          console.warn('⚠️ Failed to cleanup image:', error)
                        }
                      }
                      
                      // Reset all state
                      setFile(null)
                      setPreview(null)
                      setAnalysisResult(null)
                      setFormattedResult(null)
                      setSymptoms("")
                      setUploadedImageUrl(null)
                      setUploadedPublicId(null)
                      setConsultation(null)
                      setConsultationError(null)
                    }}
                    variant="outline"
                    className="flex-1 h-12 font-semibold border-2 hover:bg-muted/50 transition-all duration-300"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Analyze Another Image
                  </Button>
                  <Button className="flex-1 h-12 font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300" onClick={() => window.location.href = "https://www.practo.com/search/doctors?results_type=doctor&q=%5B%7B%22word%22%3A%22Dermatologist%22%2C%22autocompleted%22%3Atrue%2C%22category%22%3A%22subspeciality%22%7D%5D&city=Bangalore"}>
                    
                    <Stethoscope className="mr-2 h-5 w-5" />
                    Find Healthcare Providers
                    
                  </Button>
                </div>
              </>
            ) : (
              <div className="bg-gradient-to-br from-muted/20 to-muted/30 rounded-2xl p-16 text-center border-2 border-dashed border-muted-foreground/20">
                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-10 h-10 text-muted-foreground/60" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Ready for Analysis</h3>
                <p className="text-muted-foreground mb-2">
                  Your comprehensive AI analysis results will appear here
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload an image above to get started with BiomedCLIP analysis
                </p>
              </div>
            )}
          </Card>
        </section>

        {/* Footer Info */}
        <section className="text-center max-w-3xl mx-auto">
          <Alert className="bg-gradient-to-r from-muted/30 to-muted/50 border-border/50 shadow-lg">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertDescription className="text-sm text-left leading-relaxed">
              <strong className="text-primary">Medical Disclaimer:</strong> BioLens is an AI-powered screening tool designed to provide
              preliminary information only. It is not a substitute for professional medical advice, diagnosis, or
              treatment. Always consult a qualified healthcare provider for any health concerns or medical conditions.
              This tool should be used as a supplementary resource alongside professional medical care.
            </AlertDescription>
          </Alert>
        </section>
      </main>
    </div>
  )
}
