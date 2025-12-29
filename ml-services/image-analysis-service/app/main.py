"""
Image Analysis Service
Computer vision service for medical image analysis
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
import uvicorn
import os
import tempfile
import logging
from typing import Optional
from dotenv import load_dotenv

from .image_analyzer import ImageAnalyzer
from .models import ImageAnalysisRequest, ImageAnalysisResponse, SkinAnalysis

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Image Analysis Service",
    description="Computer vision service for medical image analysis",
    version="0.1.0"
)

# Global image analyzer instance
image_analyzer: Optional[ImageAnalyzer] = None

@app.on_event("startup")
async def startup_event():
    """Initialize the image analyzer on startup"""
    global image_analyzer
    try:
        # Initialize with CPU by default (can be configured via environment)
        device = os.getenv("TORCH_DEVICE", "cpu")
        model_path = os.getenv("MODEL_PATH", None)
        
        image_analyzer = ImageAnalyzer(model_path=model_path, device=device)
        logger.info("Image analyzer initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize image analyzer: {e}")
        # Don't fail startup, but log the error
        image_analyzer = None

@app.get("/")
async def root():
    """Root endpoint for health check"""
    return {"message": "Image Analysis Service is running", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    model_loaded = image_analyzer is not None
    return {
        "status": "healthy" if model_loaded else "degraded",
        "service": "image-analysis-service",
        "version": "0.1.0",
        "model_loaded": model_loaded
    }

@app.post("/analyze-image", response_model=ImageAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    image_id: Optional[str] = Form(None)
):
    """
    Analyze a medical image for skin conditions
    
    Args:
        file: Uploaded image file
        session_id: Session identifier
        image_id: Optional image identifier
        
    Returns:
        ImageAnalysisResponse with detected conditions
    """
    if image_analyzer is None:
        raise HTTPException(
            status_code=503, 
            detail="Image analysis service is not available"
        )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image"
        )
    
    # Create temporary file
    temp_file = None
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Analyze the image
        analysis = image_analyzer.analyze_skin_condition(temp_file_path)
        
        # Create response
        response = ImageAnalysisResponse(
            analysis_id=analysis.analysis_id,
            conditions=analysis.conditions,
            confidence_scores=analysis.confidence_scores,
            processing_time=analysis.processing_time,
            status="completed" if analysis.conditions else "no_conditions_detected"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing image: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing image: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"Could not delete temporary file: {e}")

@app.post("/analyze-image-path")
async def analyze_image_path(request: ImageAnalysisRequest):
    """
    Analyze an image from a file path (for internal service communication)
    
    Args:
        request: ImageAnalysisRequest with image_id and session_id
        
    Returns:
        ImageAnalysisResponse with analysis results
    """
    if image_analyzer is None:
        raise HTTPException(
            status_code=503,
            detail="Image analysis service is not available"
        )
    
    try:
        # In a real implementation, this would retrieve the image from storage
        # For now, we'll return an error since we need the actual image path
        raise HTTPException(
            status_code=501,
            detail="Image path analysis not implemented - use /analyze-image endpoint with file upload"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing image from path: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing image: {str(e)}"
        )

@app.get("/extract-features/{image_id}")
async def extract_visual_features(image_id: str):
    """
    Extract visual medical features from an image
    
    Args:
        image_id: Identifier of the image to analyze
        
    Returns:
        Dictionary containing extracted visual features
    """
    if image_analyzer is None:
        raise HTTPException(
            status_code=503,
            detail="Image analysis service is not available"
        )
    
    try:
        # In a real implementation, this would retrieve the image from storage
        # For now, return a placeholder response
        raise HTTPException(
            status_code=501,
            detail="Feature extraction from stored images not implemented"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting features: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting features: {str(e)}"
        )

@app.get("/model-info")
async def get_model_info():
    """
    Get information about the loaded model
    
    Returns:
        Dictionary with model information
    """
    if image_analyzer is None:
        return {
            "model_loaded": False,
            "error": "Image analyzer not initialized"
        }
    
    return {
        "model_loaded": True,
        "device": str(image_analyzer.device),
        "supported_formats": list(image_analyzer.supported_formats),
        "max_image_size": image_analyzer.max_image_size,
        "condition_classes": image_analyzer.model.condition_classes
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred in Image Analysis service"
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )