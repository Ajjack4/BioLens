"""
Tests for the Image Analysis service
"""

import pytest
import tempfile
import os
from PIL import Image
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.image_analyzer import ImageAnalyzer
from app.models import DetectedCondition, SkinAnalysis

client = TestClient(app)


def create_test_image(width=224, height=224, color=(255, 0, 0)):
    """Create a test image for testing purposes"""
    image = Image.new('RGB', (width, height), color)
    return image


def test_root_endpoint():
    """Test the root endpoint returns correct response"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Image Analysis Service is running"
    assert data["version"] == "0.1.0"


def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "image-analysis-service"
    assert data["version"] == "0.1.0"
    assert "model_loaded" in data


def test_model_info():
    """Test the model info endpoint"""
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "model_loaded" in data


def test_image_analyzer_initialization():
    """Test ImageAnalyzer can be initialized"""
    analyzer = ImageAnalyzer(device="cpu")
    assert analyzer is not None
    assert analyzer.device == "cpu"
    assert len(analyzer.supported_formats) > 0


def test_image_validation():
    """Test image validation functionality"""
    analyzer = ImageAnalyzer(device="cpu")
    
    # Test with non-existent file
    is_valid, error = analyzer.validate_image("nonexistent.jpg")
    assert not is_valid
    assert "not found" in error.lower()


def test_image_preprocessing():
    """Test image preprocessing"""
    analyzer = ImageAnalyzer(device="cpu")
    
    # Create a temporary test image
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
        test_image = create_test_image()
        test_image.save(temp_file.name, 'JPEG')
        temp_path = temp_file.name
    
    try:
        # Test preprocessing
        array = analyzer.preprocess_image(temp_path)
        assert array is not None
        assert array.shape == (224, 224, 3)  # Height, width, channels
        assert array.dtype == np.float32
        assert np.all(array >= 0.0) and np.all(array <= 1.0)  # Normalized values
    finally:
        os.unlink(temp_path)


def test_skin_analysis():
    """Test complete skin analysis pipeline"""
    analyzer = ImageAnalyzer(device="cpu")
    
    # Create a temporary test image
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
        test_image = create_test_image()
        test_image.save(temp_file.name, 'JPEG')
        temp_path = temp_file.name
    
    try:
        # Test analysis
        analysis = analyzer.analyze_skin_condition(temp_path)
        assert isinstance(analysis, SkinAnalysis)
        assert analysis.analysis_id is not None
        assert analysis.processing_time > 0
        assert isinstance(analysis.conditions, list)
        assert isinstance(analysis.confidence_scores, dict)
    finally:
        os.unlink(temp_path)


def test_visual_features_extraction():
    """Test visual features extraction"""
    analyzer = ImageAnalyzer(device="cpu")
    
    # Create a temporary test image
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
        test_image = create_test_image()
        test_image.save(temp_file.name, 'JPEG')
        temp_path = temp_file.name
    
    try:
        # Test feature extraction
        features = analyzer.extract_visual_features(temp_path)
        assert isinstance(features, dict)
        assert "color_analysis" in features
        assert "texture_features" in features
        assert "shape_features" in features
        assert "symmetry_analysis" in features
    finally:
        os.unlink(temp_path)


def test_analyze_image_endpoint():
    """Test the analyze image endpoint with file upload"""
    # Create a temporary test image
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
        test_image = create_test_image()
        test_image.save(temp_file.name, 'JPEG')
        temp_path = temp_file.name
    
    try:
        # Test the endpoint
        with open(temp_path, 'rb') as f:
            response = client.post(
                "/analyze-image",
                files={"file": ("test.jpg", f, "image/jpeg")},
                data={"session_id": "test_session"}
            )
        
        # Check response
        if response.status_code == 503:
            # Service not available (model not loaded) - this is acceptable in tests
            assert "not available" in response.json()["detail"]
        else:
            assert response.status_code == 200
            data = response.json()
            assert "analysis_id" in data
            assert "conditions" in data
            assert "processing_time" in data
    finally:
        os.unlink(temp_path)


def test_invalid_image_upload():
    """Test uploading invalid file type"""
    # Create a text file instead of image
    with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as temp_file:
        temp_file.write(b"This is not an image")
        temp_path = temp_file.name
    
    try:
        with open(temp_path, 'rb') as f:
            response = client.post(
                "/analyze-image",
                files={"file": ("test.txt", f, "text/plain")},
                data={"session_id": "test_session"}
            )
        
        # Should be either 400 (bad request) or 503 (service unavailable)
        assert response.status_code in [400, 503]
        if response.status_code == 400:
            assert "must be an image" in response.json()["detail"]
        elif response.status_code == 503:
            assert "not available" in response.json()["detail"]
    finally:
        os.unlink(temp_path)