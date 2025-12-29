"""
ImageAnalyzer class for medical image analysis using BiomedCLIP zero-shot classification
"""

import os
import uuid
import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import numpy as np
import cv2
from PIL import Image, ImageOps
import torch
import torch.nn.functional as F

from .models import DetectedCondition, SkinAnalysis, ImageMetadata, ProcessingStatus

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BiomedCLIPModel:
    """
    BiomedCLIP-based zero-shot medical image classification model
    Uses vision-language model for medical image analysis without training
    """
    
    def __init__(self, device: str = "cpu"):
        """Initialize BiomedCLIP model"""
        self.device = device
        
        # Disease label prompts - engineered for better medical context
        self.disease_prompts = {
            "healthy_skin": "a photograph of healthy normal skin",
            "acne": "a clinical image of acne with comedones and inflammatory lesions",
            "eczema": "a dermatology image showing eczema with red inflamed patches",
            "psoriasis": "a clinical photograph of psoriasis with scaly plaques",
            "fungal_infection": "a skin lesion that is a fungal infection with scaling",
            "melanoma": "a highly suspicious melanoma lesion requiring immediate attention",
            "basal_cell_carcinoma": "a clinical image of basal cell carcinoma",
            "seborrheic_keratosis": "a photograph of seborrheic keratosis with waxy appearance",
            "dermatitis": "a clinical image of contact dermatitis with inflammation",
            "rosacea": "a dermatology photograph showing rosacea with facial redness"
        }
        
        # Initialize mock embeddings for demonstration
        # In production, this would load actual BiomedCLIP model
        self.embedding_dim = 512
        self._initialize_mock_embeddings()
        
        logger.info("BiomedCLIP model initialized (mock version for demo)")
    
    def _initialize_mock_embeddings(self):
        """Initialize mock text embeddings for disease prompts"""
        # Create mock normalized embeddings for each disease prompt
        self.text_embeddings = {}
        np.random.seed(42)  # For reproducible results
        
        for disease, prompt in self.disease_prompts.items():
            # Generate mock embedding based on disease characteristics
            embedding = np.random.randn(self.embedding_dim)
            
            # Add some disease-specific patterns to make results more realistic
            if "melanoma" in disease or "carcinoma" in disease:
                embedding[:50] += 2.0  # Boost certain dimensions for cancer-related
            elif "healthy" in disease:
                embedding[50:100] += 1.5  # Different pattern for healthy skin
            elif "acne" in disease or "eczema" in disease:
                embedding[100:150] += 1.0  # Pattern for inflammatory conditions
            
            # Normalize embedding
            embedding = embedding / np.linalg.norm(embedding)
            self.text_embeddings[disease] = embedding
    
    def encode_image(self, image: np.ndarray) -> np.ndarray:
        """
        Encode image to embedding vector using BiomedCLIP image encoder
        
        Args:
            image: Preprocessed image array (224, 224, 3)
            
        Returns:
            Normalized image embedding vector
        """
        # Mock image encoding based on image characteristics
        # In production, this would use actual BiomedCLIP image encoder
        
        # Extract image features for mock encoding
        mean_rgb = np.mean(image, axis=(0, 1))
        std_rgb = np.std(image, axis=(0, 1))
        texture_var = np.var(cv2.cvtColor((image * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY))
        
        # Create mock embedding based on image characteristics
        embedding = np.random.randn(self.embedding_dim)
        
        # Modify embedding based on image properties
        embedding[:3] = mean_rgb / 255.0  # Color information
        embedding[3:6] = std_rgb / 255.0  # Color variation
        embedding[6] = texture_var / 10000.0  # Texture information
        
        # Add some random variation
        embedding[7:] += np.random.randn(self.embedding_dim - 7) * 0.1
        
        # Normalize embedding
        embedding = embedding / np.linalg.norm(embedding)
        
        return embedding
    
    def compute_similarities(self, image_embedding: np.ndarray) -> Dict[str, float]:
        """
        Compute similarity scores between image and text embeddings
        
        Args:
            image_embedding: Normalized image embedding vector
            
        Returns:
            Dictionary of disease -> similarity score
        """
        similarities = {}
        
        for disease, text_embedding in self.text_embeddings.items():
            # Compute cosine similarity (dot product of normalized vectors)
            similarity = np.dot(image_embedding, text_embedding)
            similarities[disease] = float(similarity)
        
        return similarities
    
    def predict(self, image_array: np.ndarray, temperature: float = 0.07) -> Dict[str, float]:
        """
        Perform zero-shot classification using BiomedCLIP
        
        Args:
            image_array: Preprocessed image array
            temperature: Temperature scaling for softmax
            
        Returns:
            Dictionary of disease -> probability
        """
        # Step 1: Encode image
        image_embedding = self.encode_image(image_array)
        
        # Step 2: Compute similarities with all disease prompts
        similarities = self.compute_similarities(image_embedding)
        
        # Step 3: Apply temperature scaling and softmax
        similarity_values = np.array(list(similarities.values()))
        scaled_similarities = similarity_values / temperature
        probabilities = F.softmax(torch.tensor(scaled_similarities), dim=0).numpy()
        
        # Step 4: Create result dictionary
        result = {}
        for i, disease in enumerate(similarities.keys()):
            result[disease] = float(probabilities[i])
        
        return result


class ImageAnalyzer:
    """
    Main class for analyzing medical images using CNN models
    Implements skin condition detection and feature extraction
    """
    
    def __init__(self, model_path: Optional[str] = None, device: str = "cpu"):
        """
        Initialize the ImageAnalyzer
        
        Args:
            model_path: Path to trained model weights (optional)
            device: Device to run inference on ('cpu' or 'cuda')
        """
        self.device = device
        logger.info(f"Using device: {self.device}")
        
        # Initialize mock model
        self.model = MockCNNModel()
        
        if model_path and os.path.exists(model_path):
            logger.info(f"Model path provided: {model_path} (using mock model for demo)")
        else:
            logger.info("Using mock model for demonstration")
        
        # Supported image formats
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
        self.max_image_size = 10 * 1024 * 1024  # 10MB
    
    def validate_image(self, image_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate image format and size
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check if file exists
            if not os.path.exists(image_path):
                return False, "Image file not found"
            
            # Check file size
            file_size = os.path.getsize(image_path)
            if file_size > self.max_image_size:
                return False, f"Image size ({file_size} bytes) exceeds maximum allowed size ({self.max_image_size} bytes)"
            
            # Check file extension
            _, ext = os.path.splitext(image_path.lower())
            if ext not in self.supported_formats:
                return False, f"Unsupported image format: {ext}. Supported formats: {', '.join(self.supported_formats)}"
            
            # Try to open and validate the image
            with Image.open(image_path) as img:
                img.verify()  # Verify it's a valid image
            
            return True, None
            
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"
    
    def extract_image_metadata(self, image_path: str) -> ImageMetadata:
        """
        Extract metadata from the image
        
        Args:
            image_path: Path to the image file
            
        Returns:
            ImageMetadata object with image properties
        """
        with Image.open(image_path) as img:
            width, height = img.size
            channels = len(img.getbands())
            format_name = img.format or "Unknown"
            size_bytes = os.path.getsize(image_path)
            has_alpha = img.mode in ('RGBA', 'LA') or 'transparency' in img.info
            
            return ImageMetadata(
                width=width,
                height=height,
                channels=channels,
                format=format_name,
                size_bytes=size_bytes,
                has_alpha=has_alpha
            )
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Preprocess image for model input
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Preprocessed image array ready for model inference
        """
        try:
            # Load image
            image = Image.open(image_path)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize to standard size (224x224 is common for medical image analysis)
            image = image.resize((224, 224), Image.Resampling.LANCZOS)
            
            # Convert to numpy array
            image_array = np.array(image)
            
            # Normalize pixel values to [0, 1]
            image_array = image_array.astype(np.float32) / 255.0
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error preprocessing image {image_path}: {e}")
            raise
    
    def postprocess_results(self, predictions: np.ndarray) -> List[DetectedCondition]:
        """
        Convert model predictions to structured DetectedCondition objects
        
        Args:
            predictions: Raw model predictions array
            
        Returns:
            List of DetectedCondition objects
        """
        probs_np = predictions[0]  # Remove batch dimension
        
        conditions = []
        
        # Get top predictions (conditions with confidence > 0.1)
        for i, prob in enumerate(probs_np):
            if prob > 0.1:  # Only include conditions with reasonable confidence
                condition_name = self.model.condition_classes[i]
                
                # Map condition names to more descriptive information
                condition_info = self._get_condition_info(condition_name, prob)
                
                condition = DetectedCondition(
                    condition_name=condition_info["name"],
                    confidence=float(prob),
                    severity=condition_info["severity"],
                    category=condition_info["category"],
                    description=condition_info["description"],
                    requires_attention=condition_info["requires_attention"]
                )
                conditions.append(condition)
        
        # Sort by confidence (highest first)
        conditions.sort(key=lambda x: x.confidence, reverse=True)
        
        # Return top 5 conditions
        return conditions[:5]
    
    def _get_condition_info(self, condition_name: str, confidence: float) -> Dict[str, Any]:
        """
        Get detailed information about a detected condition
        
        Args:
            condition_name: Name of the condition
            confidence: Confidence score
            
        Returns:
            Dictionary with condition details
        """
        # This is a simplified mapping - in production, this would be more comprehensive
        condition_mapping = {
            "normal_skin": {
                "name": "Normal Skin",
                "severity": "none",
                "category": "normal",
                "description": "No significant skin abnormalities detected",
                "requires_attention": False
            },
            "acne": {
                "name": "Acne",
                "severity": "mild" if confidence < 0.7 else "moderate",
                "category": "dermatological",
                "description": "Common skin condition with pimples, blackheads, or whiteheads",
                "requires_attention": confidence > 0.8
            },
            "eczema": {
                "name": "Eczema (Atopic Dermatitis)",
                "severity": "mild" if confidence < 0.6 else "moderate",
                "category": "dermatological",
                "description": "Inflammatory skin condition causing itchy, red, swollen skin",
                "requires_attention": True
            },
            "psoriasis": {
                "name": "Psoriasis",
                "severity": "moderate",
                "category": "dermatological",
                "description": "Autoimmune condition causing scaly, itchy patches",
                "requires_attention": True
            },
            "melanoma_risk": {
                "name": "Potential Melanoma Risk",
                "severity": "severe",
                "category": "oncological",
                "description": "Suspicious pigmented lesion that may require immediate medical evaluation",
                "requires_attention": True
            },
            "basal_cell_carcinoma_risk": {
                "name": "Potential Basal Cell Carcinoma",
                "severity": "moderate",
                "category": "oncological",
                "description": "Suspicious lesion that may be basal cell carcinoma",
                "requires_attention": True
            },
            "seborrheic_keratosis": {
                "name": "Seborrheic Keratosis",
                "severity": "mild",
                "category": "benign",
                "description": "Common benign skin growth, usually harmless",
                "requires_attention": False
            },
            "dermatofibroma": {
                "name": "Dermatofibroma",
                "severity": "mild",
                "category": "benign",
                "description": "Benign fibrous skin nodule",
                "requires_attention": False
            },
            "nevus": {
                "name": "Nevus (Mole)",
                "severity": "mild",
                "category": "benign",
                "description": "Common pigmented skin lesion, usually benign",
                "requires_attention": confidence > 0.8  # High confidence unusual moles should be checked
            },
            "vascular_lesion": {
                "name": "Vascular Lesion",
                "severity": "mild",
                "category": "vascular",
                "description": "Blood vessel-related skin lesion",
                "requires_attention": confidence > 0.7
            }
        }
        
        return condition_mapping.get(condition_name, {
            "name": condition_name.replace("_", " ").title(),
            "severity": "unknown",
            "category": "unknown",
            "description": "Detected condition requiring professional evaluation",
            "requires_attention": True
        })
    
    def analyze_skin_condition(self, image_path: str) -> SkinAnalysis:
        """
        Analyze skin conditions in the provided image
        
        Args:
            image_path: Path to the image file
            
        Returns:
            SkinAnalysis object with detected conditions and metadata
        """
        start_time = time.time()
        analysis_id = str(uuid.uuid4())
        
        try:
            # Validate image
            is_valid, error_msg = self.validate_image(image_path)
            if not is_valid:
                raise ValueError(error_msg)
            
            # Extract image metadata
            image_metadata = self.extract_image_metadata(image_path)
            
            # Preprocess image
            image_array = self.preprocess_image(image_path)
            
            # Run inference
            predictions = self.model.predict(image_array)
            
            # Postprocess results
            conditions = self.postprocess_results(predictions)
            
            # Calculate confidence scores
            confidence_scores = {
                condition.condition_name: condition.confidence 
                for condition in conditions
            }
            
            processing_time = time.time() - start_time
            
            # Create analysis result
            analysis = SkinAnalysis(
                analysis_id=analysis_id,
                conditions=conditions,
                confidence_scores=confidence_scores,
                processing_time=processing_time,
                image_metadata=image_metadata.model_dump(),
                timestamp=datetime.now()
            )
            
            logger.info(f"Successfully analyzed image {image_path} in {processing_time:.2f}s")
            return analysis
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Error analyzing image {image_path}: {e}")
            
            # Return analysis with error information
            return SkinAnalysis(
                analysis_id=analysis_id,
                conditions=[],
                confidence_scores={},
                processing_time=processing_time,
                image_metadata={"error": str(e)},
                timestamp=datetime.now()
            )
    
    def extract_visual_features(self, image_path: str) -> Dict[str, Any]:
        """
        Extract visual medical features from the image
        This method provides additional feature extraction beyond condition detection
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary containing extracted visual features
        """
        try:
            # Load image with OpenCV for feature extraction
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Could not load image")
            
            # Convert to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Extract basic visual features
            features = {
                "color_analysis": self._analyze_colors(image_rgb),
                "texture_features": self._extract_texture_features(image_rgb),
                "shape_features": self._extract_shape_features(image_rgb),
                "symmetry_analysis": self._analyze_symmetry(image_rgb)
            }
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting visual features from {image_path}: {e}")
            return {"error": str(e)}
    
    def _analyze_colors(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze color distribution in the image"""
        # Calculate color statistics
        mean_colors = np.mean(image, axis=(0, 1))
        std_colors = np.std(image, axis=(0, 1))
        
        return {
            "mean_rgb": mean_colors.tolist(),
            "std_rgb": std_colors.tolist(),
            "dominant_color_channel": int(np.argmax(mean_colors))
        }
    
    def _extract_texture_features(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract texture features using simple statistical measures"""
        # Convert to grayscale for texture analysis
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Calculate texture measures
        texture_variance = np.var(gray)
        texture_mean = np.mean(gray)
        
        return {
            "texture_variance": float(texture_variance),
            "texture_mean": float(texture_mean),
            "texture_contrast": float(np.max(gray) - np.min(gray))
        }
    
    def _extract_shape_features(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract basic shape features"""
        # Convert to grayscale and apply threshold
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Get largest contour
            largest_contour = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest_contour)
            perimeter = cv2.arcLength(largest_contour, True)
            
            return {
                "largest_area": float(area),
                "perimeter": float(perimeter),
                "circularity": float(4 * np.pi * area / (perimeter * perimeter)) if perimeter > 0 else 0
            }
        
        return {"largest_area": 0, "perimeter": 0, "circularity": 0}
    
    def _analyze_symmetry(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze symmetry of the image"""
        height, width = image.shape[:2]
        
        # Vertical symmetry
        left_half = image[:, :width//2]
        right_half = cv2.flip(image[:, width//2:], 1)
        
        # Resize to match if needed
        min_width = min(left_half.shape[1], right_half.shape[1])
        left_half = left_half[:, :min_width]
        right_half = right_half[:, :min_width]
        
        # Calculate symmetry score
        diff = np.abs(left_half.astype(float) - right_half.astype(float))
        symmetry_score = 1.0 - (np.mean(diff) / 255.0)
        
        return {
            "vertical_symmetry_score": float(symmetry_score)
        }