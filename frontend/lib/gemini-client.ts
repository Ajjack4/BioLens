/**
 * Gemini API Client for BioLens Application
 * Handles authentication and communication with Google Gemini AI
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai'

export interface GeminiConfig {
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  safetySettings?: any[]
  timeout?: number
  maxRetries?: number
  baseRetryDelay?: number
  maxRetryDelay?: number
  rateLimitConfig?: {
    requestsPerMinute: number
    requestsPerHour: number
  }
}

export interface GeminiResponse {
  success: boolean
  content?: string
  error?: string
  metadata?: {
    modelUsed: string
    processingTime: number
    tokensUsed?: number
    retryCount?: number
    rateLimited?: boolean
  }
}

export interface GeminiRequest {
  prompt: string
  systemInstruction?: string
  context?: any
  timeout?: number
  priority?: 'low' | 'normal' | 'high'
}

export interface RateLimitState {
  requestsThisMinute: number
  requestsThisHour: number
  lastMinuteReset: number
  lastHourReset: number
  isLimited: boolean
}

export interface MedicalPrompt {
  systemInstruction: string
  userPrompt: string
  safetyInstructions: string[]
  contextData: {
    predictions: any[]
    symptoms: string
    riskLevel: any
  }
}

/**
 * Gemini API Client Class
 * Provides secure authentication and communication with Google Gemini AI
 * Enhanced with rate limiting, timeout management, and medical-specific configuration
 */
export class GeminiAPIClient {
  private genAI: GoogleGenerativeAI | null = null
  private model: GenerativeModel | null = null
  private config: GeminiConfig
  private isInitialized = false
  private rateLimitState: RateLimitState
  private requestQueue: Array<{
    request: GeminiRequest
    resolve: (value: GeminiResponse) => void
    reject: (error: Error) => void
    timestamp: number
    priority: 'low' | 'normal' | 'high'
  }> = []
  private isProcessingQueue = false

  constructor(config?: Partial<GeminiConfig>) {
    // Default configuration optimized for medical consultation
    this.config = {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: 'gemini-1.5-pro',
      temperature: 0.3, // Lower temperature for medical consistency
      maxTokens: 2048,
      timeout: 30000, // 30 seconds timeout
      maxRetries: 3,
      baseRetryDelay: 1000, // 1 second base delay
      maxRetryDelay: 10000, // 10 seconds max delay
      rateLimitConfig: {
        requestsPerMinute: 15, // Conservative rate limiting for medical use
        requestsPerHour: 100
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ],
      ...config
    }

    // Initialize rate limit state
    this.rateLimitState = {
      requestsThisMinute: 0,
      requestsThisHour: 0,
      lastMinuteReset: Date.now(),
      lastHourReset: Date.now(),
      isLimited: false
    }

    // Start queue processing
    this.startQueueProcessor()
  }

  /**
   * Initialize the Gemini client with authentication
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Gemini API key is required')
      }

      // Initialize Google Generative AI
      this.genAI = new GoogleGenerativeAI(this.config.apiKey)

      // Configure the model
      const generationConfig: GenerationConfig = {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
      }

      // Get the model with configuration
      this.model = this.genAI.getGenerativeModel({
        model: this.config.model,
        generationConfig,
        safetySettings: this.config.safetySettings
      })

      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize Gemini client:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * Validate API key by making a test request
   */
  async validateAPIKey(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize()
        if (!initialized) return false
      }

      if (!this.model) {
        return false
      }

      // Make a simple test request
      const result = await this.model.generateContent('Hello')
      return result.response.text().length > 0
    } catch (error) {
      console.error('API key validation failed:', error)
      return false
    }
  }

  /**
   * Send a consultation request to Gemini with enhanced error handling and rate limiting
   */
  async sendConsultationRequest(request: GeminiRequest): Promise<GeminiResponse> {
    return new Promise((resolve, reject) => {
      // Add request to queue with priority
      this.requestQueue.push({
        request,
        resolve,
        reject,
        timestamp: Date.now(),
        priority: request.priority || 'normal'
      })

      // Sort queue by priority (high -> normal -> low) and timestamp
      this.requestQueue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return a.timestamp - b.timestamp
      })
    })
  }

  /**
   * Process the request queue with rate limiting and timeout management
   */
  private async startQueueProcessor(): Promise<void> {
    if (this.isProcessingQueue) return
    this.isProcessingQueue = true

    while (true) {
      try {
        // Check if we have requests to process
        if (this.requestQueue.length === 0) {
          await this.sleep(100) // Short sleep when queue is empty
          continue
        }

        // Update rate limit state
        this.updateRateLimitState()

        // Check if we're rate limited
        if (this.rateLimitState.isLimited) {
          await this.sleep(1000) // Wait 1 second if rate limited
          continue
        }

        // Process next request
        const queueItem = this.requestQueue.shift()
        if (!queueItem) continue

        // Check if request has timed out in queue
        const queueTime = Date.now() - queueItem.timestamp
        const timeout = queueItem.request.timeout || this.config.timeout || 30000
        
        if (queueTime > timeout) {
          queueItem.reject(new Error('Request timed out in queue'))
          continue
        }

        // Process the request
        try {
          const response = await this.processConsultationRequest(queueItem.request)
          queueItem.resolve(response)
        } catch (error) {
          queueItem.reject(error as Error)
        }

        // Update rate limit counters
        this.rateLimitState.requestsThisMinute++
        this.rateLimitState.requestsThisHour++

      } catch (error) {
        console.error('Queue processor error:', error)
        await this.sleep(1000) // Wait before retrying
      }
    }
  }

  /**
   * Process individual consultation request with retries and timeout
   */
  private async processConsultationRequest(request: GeminiRequest): Promise<GeminiResponse> {
    const startTime = Date.now()
    const timeout = request.timeout || this.config.timeout || 30000
    let retryCount = 0
    let lastError: Error | null = null

    while (retryCount <= (this.config.maxRetries || 3)) {
      try {
        // Check timeout
        if (Date.now() - startTime > timeout) {
          throw new Error(`Request timed out after ${timeout}ms`)
        }

        // Initialize client if needed
        if (!this.isInitialized) {
          const initialized = await this.initialize()
          if (!initialized) {
            throw new Error('Failed to initialize Gemini client')
          }
        }

        if (!this.model) {
          throw new Error('Gemini model not initialized')
        }

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout - (Date.now() - startTime))
        })

        // Construct the full prompt with system instruction if provided
        let fullPrompt = request.prompt
        if (request.systemInstruction) {
          fullPrompt = `${request.systemInstruction}\n\n${request.prompt}`
        }

        // Generate content with timeout
        const resultPromise = this.model.generateContent(fullPrompt)
        const result = await Promise.race([resultPromise, timeoutPromise])
        
        const response = await result.response
        const content = response.text()

        const processingTime = Date.now() - startTime

        return {
          success: true,
          content,
          metadata: {
            modelUsed: this.config.model,
            processingTime,
            tokensUsed: response.usageMetadata?.totalTokenCount,
            retryCount,
            rateLimited: false
          }
        }

      } catch (error) {
        lastError = error as Error
        retryCount++

        console.warn(`Gemini API request attempt ${retryCount} failed:`, error)

        // Handle specific error types
        if (this.isRateLimitError(error)) {
          await this.handleRateLimit(error)
          // Don't count rate limit as a retry
          retryCount--
          continue
        }

        if (this.isAuthenticationError(error)) {
          // Don't retry auth errors
          break
        }

        // Check if we should retry
        if (retryCount <= (this.config.maxRetries || 3)) {
          const delay = this.calculateRetryDelay(retryCount)
          console.log(`Retrying in ${delay}ms...`)
          await this.sleep(delay)
        }
      }
    }

    // All retries failed
    const processingTime = Date.now() - startTime
    
    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred',
      metadata: {
        modelUsed: this.config.model,
        processingTime,
        retryCount,
        rateLimited: this.isRateLimitError(lastError)
      }
    }
  }

  /**
   * Update rate limit state and check if we're currently limited
   */
  private updateRateLimitState(): void {
    const now = Date.now()
    const minuteMs = 60 * 1000
    const hourMs = 60 * 60 * 1000

    // Reset minute counter if needed
    if (now - this.rateLimitState.lastMinuteReset > minuteMs) {
      this.rateLimitState.requestsThisMinute = 0
      this.rateLimitState.lastMinuteReset = now
    }

    // Reset hour counter if needed
    if (now - this.rateLimitState.lastHourReset > hourMs) {
      this.rateLimitState.requestsThisHour = 0
      this.rateLimitState.lastHourReset = now
    }

    // Check if we're rate limited
    const rateLimitConfig = this.config.rateLimitConfig!
    this.rateLimitState.isLimited = 
      this.rateLimitState.requestsThisMinute >= rateLimitConfig.requestsPerMinute ||
      this.rateLimitState.requestsThisHour >= rateLimitConfig.requestsPerHour
  }

  /**
   * Calculate exponential backoff delay for retries
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.config.baseRetryDelay || 1000
    const maxDelay = this.config.maxRetryDelay || 10000
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1)
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay
    
    return Math.min(exponentialDelay + jitter, maxDelay)
  }

  /**
   * Enhanced rate limit handling with exponential backoff
   */
  async handleRateLimit(error: any): Promise<void> {
    // Extract retry delay from error if available
    let retryAfter = 60000 // Default 1 minute for rate limits
    
    if (error.retryAfter) {
      retryAfter = error.retryAfter
    } else if (error.message && error.message.includes('retry after')) {
      // Try to extract retry time from error message
      const match = error.message.match(/retry after (\d+)/i)
      if (match) {
        retryAfter = parseInt(match[1]) * 1000
      }
    }
    
    console.log(`Rate limited, waiting ${retryAfter}ms before retry...`)
    await this.sleep(retryAfter)
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false
    
    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = error.code || error.status
    
    return errorMessage.includes('rate limit') || 
           errorMessage.includes('quota') || 
           errorMessage.includes('too many requests') ||
           errorMessage.includes('resource_exhausted') ||
           errorCode === 429 ||
           errorCode === 'RATE_LIMIT_EXCEEDED'
  }

  /**
   * Check if error is an authentication error
   */
  private isAuthenticationError(error: any): boolean {
    if (!error) return false
    
    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = error.code || error.status
    
    return errorMessage.includes('authentication') || 
           errorMessage.includes('api key') || 
           errorMessage.includes('unauthorized') ||
           errorMessage.includes('invalid_api_key') ||
           errorCode === 401 || 
           errorCode === 403 ||
           errorCode === 'UNAUTHENTICATED' ||
           errorCode === 'PERMISSION_DENIED'
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitState & { 
    remainingThisMinute: number
    remainingThisHour: number 
  } {
    this.updateRateLimitState()
    const rateLimitConfig = this.config.rateLimitConfig!
    
    return {
      ...this.rateLimitState,
      remainingThisMinute: Math.max(0, rateLimitConfig.requestsPerMinute - this.rateLimitState.requestsThisMinute),
      remainingThisHour: Math.max(0, rateLimitConfig.requestsPerHour - this.rateLimitState.requestsThisHour)
    }
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): {
    queueLength: number
    isProcessing: boolean
    oldestRequestAge: number
    priorityBreakdown: Record<string, number>
  } {
    const now = Date.now()
    const priorityBreakdown = { high: 0, normal: 0, low: 0 }
    
    this.requestQueue.forEach(item => {
      priorityBreakdown[item.priority]++
    })
    
    const oldestRequestAge = this.requestQueue.length > 0 
      ? now - Math.min(...this.requestQueue.map(item => item.timestamp))
      : 0

    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      oldestRequestAge,
      priorityBreakdown
    }
  }

  /**
   * Send a medical consultation request with enhanced safety and validation
   */
  async sendMedicalConsultationRequest(medicalPrompt: MedicalPrompt): Promise<GeminiResponse> {
    // Validate medical prompt structure
    if (!medicalPrompt.systemInstruction || !medicalPrompt.userPrompt) {
      throw new Error('Medical prompt must include both system instruction and user prompt')
    }

    // Ensure safety instructions are included
    if (!medicalPrompt.safetyInstructions || medicalPrompt.safetyInstructions.length === 0) {
      throw new Error('Medical prompts must include safety instructions')
    }

    // Create enhanced request with medical-specific settings
    const request: GeminiRequest = {
      prompt: medicalPrompt.userPrompt,
      systemInstruction: medicalPrompt.systemInstruction,
      context: {
        ...medicalPrompt.contextData,
        safetyInstructions: medicalPrompt.safetyInstructions,
        medicalConsultation: true
      },
      priority: medicalPrompt.contextData.riskLevel?.level === 'high' ? 'high' : 'normal',
      timeout: medicalPrompt.contextData.riskLevel?.level === 'high' ? 20000 : 30000 // Faster timeout for high-risk
    }

    return this.sendConsultationRequest(request)
  }

  /**
   * Configure model settings with medical-specific optimizations
   */
  configureModel(settings: Partial<GeminiConfig>): void {
    // Validate medical-specific settings
    if (settings.temperature !== undefined && settings.temperature > 0.5) {
      console.warn('High temperature values (>0.5) not recommended for medical consultations')
    }

    if (settings.rateLimitConfig) {
      const { requestsPerMinute, requestsPerHour } = settings.rateLimitConfig
      if (requestsPerMinute > 30 || requestsPerHour > 200) {
        console.warn('High rate limits may violate API terms for medical applications')
      }
    }

    this.config = { ...this.config, ...settings }
    this.isInitialized = false // Force re-initialization with new settings
  }

  /**
   * Get current configuration
   */
  getConfig(): GeminiConfig {
    return { ...this.config }
  }

  /**
   * Check if client is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.model !== null
  }

  /**
   * Reset the client (useful for testing or configuration changes)
   */
  reset(): void {
    this.genAI = null
    this.model = null
    this.isInitialized = false
  }
}

/**
 * Create a singleton instance of the Gemini client
 */
let geminiClientInstance: GeminiAPIClient | null = null

/**
 * Get the singleton Gemini client instance
 */
export function getGeminiClient(): GeminiAPIClient {
  if (!geminiClientInstance) {
    geminiClientInstance = new GeminiAPIClient()
  }
  return geminiClientInstance
}

/**
 * Initialize the global Gemini client
 */
export async function initializeGeminiClient(): Promise<boolean> {
  const client = getGeminiClient()
  return await client.initialize()
}

/**
 * Validate the Gemini API configuration
 */
export async function validateGeminiConfig(): Promise<{ valid: boolean; error?: string }> {
  try {
    const client = getGeminiClient()
    const isValid = await client.validateAPIKey()
    
    if (!isValid) {
      return {
        valid: false,
        error: 'Invalid API key or configuration'
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Configuration validation failed'
    }
  }
}

/**
 * Test the Gemini connection with a simple request
 */
export async function testGeminiConnection(): Promise<GeminiResponse> {
  const client = getGeminiClient()
  
  return await client.sendConsultationRequest({
    prompt: 'Respond with "Connection successful" if you can read this message.',
    systemInstruction: 'You are a test assistant. Respond briefly and clearly.'
  })
}