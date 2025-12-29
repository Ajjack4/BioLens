"""
Data models for the Image Analysis service
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
import numpy as np


class DetectedCondition(BaseModel):
    """Model representing a detected medical condition from image analysis"""
    condition_name: str = Field(..., description="Name of the detected condition")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0 and 1")
    severity: str = Field(..., description="Severity level: mild, moderate, severe")
    category: str = Field(..., description="Category: dermatological, infectious, etc.")
    description: str = Field(..., description="Human-readable description of the condition")
    requires_attention: bool = Field(..., description="Whether the condition requires medical attention")


class SkinAnalysis(BaseModel):
    """Model representing the complete analysis of a skin condition image"""
    analysis_id: str = Field(..., description="Unique identifier for this analysis")
    conditions: List[DetectedCondition] = Field(default_factory=list, description="List of detected conditions")
    confidence_scores: Dict[str, float] = Field(default_factory=dict, description="Confidence scores for different conditions")
    processing_time: float = Field(..., description="Time taken to process the image in seconds")
    image_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Metadata about the processed image")
    timestamp: datetime = Field(default_factory=datetime.now, description="When the analysis was performed")


class ImageAnalysisRequest(BaseModel):
    """Request model for image analysis"""
    image_id: str = Field(..., description="Unique identifier for the image")
    session_id: str = Field(..., description="Session identifier")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class ImageAnalysisResponse(BaseModel):
    """Response model for image analysis"""
    analysis_id: str = Field(..., description="Unique identifier for this analysis")
    conditions: List[DetectedCondition] = Field(..., description="List of detected conditions")
    confidence_scores: Dict[str, float] = Field(..., description="Overall confidence scores")
    processing_time: float = Field(..., description="Processing time in seconds")
    status: str = Field(default="completed", description="Analysis status")
    error_message: Optional[str] = Field(default=None, description="Error message if analysis failed")


class ProcessingStatus(str, Enum):
    """Enumeration for processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ImageMetadata(BaseModel):
    """Model for image metadata"""
    width: int = Field(..., description="Image width in pixels")
    height: int = Field(..., description="Image height in pixels")
    channels: int = Field(..., description="Number of color channels")
    format: str = Field(..., description="Image format (JPEG, PNG, etc.)")
    size_bytes: int = Field(..., description="File size in bytes")
    has_alpha: bool = Field(default=False, description="Whether image has alpha channel")