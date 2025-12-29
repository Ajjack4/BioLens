#!/usr/bin/env python3
"""
Demo script for the Image Analysis Service
Shows how to use the ImageAnalyzer class for medical image analysis
"""

import tempfile
import os
from PIL import Image
import numpy as np
from app.image_analyzer import ImageAnalyzer


def create_demo_image(width=300, height=300, pattern="skin"):
    """Create a demo image for testing"""
    if pattern == "skin":
        # Create a skin-like image with some texture
        base_color = (220, 180, 140)  # Skin tone
        image = Image.new('RGB', (width, height), base_color)
        
        # Add some random variation to simulate skin texture
        pixels = np.array(image)
        noise = np.random.randint(-20, 20, pixels.shape)
        pixels = np.clip(pixels + noise, 0, 255)
        image = Image.fromarray(pixels.astype(np.uint8))
        
    elif pattern == "lesion":
        # Create an image with a dark spot (simulating a lesion)
        base_color = (220, 180, 140)  # Skin tone
        image = Image.new('RGB', (width, height), base_color)
        
        # Add a dark circular region
        pixels = np.array(image)
        center_x, center_y = width // 2, height // 2
        radius = 30
        
        for y in range(height):
            for x in range(width):
                distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)
                if distance < radius:
                    # Make it darker (brownish)
                    pixels[y, x] = [80, 50, 30]
        
        image = Image.fromarray(pixels.astype(np.uint8))
    
    return image


def main():
    """Main demo function"""
    print("🔬 BioLens Image Analysis Service Demo")
    print("=" * 50)
    
    # Initialize the analyzer
    print("Initializing ImageAnalyzer...")
    analyzer = ImageAnalyzer(device="cpu")
    print(f"✅ Analyzer initialized with device: {analyzer.device}")
    print(f"📋 Supported formats: {', '.join(analyzer.supported_formats)}")
    print(f"🏷️  Condition classes: {len(analyzer.model.condition_classes)} classes")
    print()
    
    # Demo 1: Normal skin analysis
    print("Demo 1: Analyzing normal skin image")
    print("-" * 30)
    
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
        demo_image = create_demo_image(pattern="skin")
        demo_image.save(temp_file.name, 'JPEG')
        temp_path = temp_file.name
    
    try:
        analysis = analyzer.analyze_skin_condition(temp_path)
        print(f"📊 Analysis ID: {analysis.analysis_id}")
        print(f"⏱️  Processing time: {analysis.processing_time:.3f} seconds")
        print(f"🔍 Detected conditions: {len(analysis.conditions)}")
        
        for i, condition in enumerate(analysis.conditions[:3], 1):
            print(f"  {i}. {condition.condition_name}")
            print(f"     Confidence: {condition.confidence:.3f}")
            print(f"     Severity: {condition.severity}")
            print(f"     Category: {condition.category}")
            print(f"     Requires attention: {condition.requires_attention}")
            print()
        
        # Extract visual features
        features = analyzer.extract_visual_features(temp_path)
        print("🎨 Visual Features:")
        if "color_analysis" in features:
            colors = features["color_analysis"]
            print(f"  Mean RGB: {[f'{c:.1f}' for c in colors['mean_rgb']]}")
            print(f"  Dominant channel: {colors['dominant_color_channel']} (0=R, 1=G, 2=B)")
        
        if "texture_features" in features:
            texture = features["texture_features"]
            print(f"  Texture variance: {texture['texture_variance']:.1f}")
            print(f"  Texture contrast: {texture['texture_contrast']:.1f}")
        
        if "symmetry_analysis" in features:
            symmetry = features["symmetry_analysis"]
            print(f"  Vertical symmetry: {symmetry['vertical_symmetry_score']:.3f}")
        
    finally:
        os.unlink(temp_path)
    
    print()
    
    # Demo 2: Lesion analysis
    print("Demo 2: Analyzing image with lesion")
    print("-" * 30)
    
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
        demo_image = create_demo_image(pattern="lesion")
        demo_image.save(temp_file.name, 'JPEG')
        temp_path = temp_file.name
    
    try:
        analysis = analyzer.analyze_skin_condition(temp_path)
        print(f"📊 Analysis ID: {analysis.analysis_id}")
        print(f"⏱️  Processing time: {analysis.processing_time:.3f} seconds")
        print(f"🔍 Detected conditions: {len(analysis.conditions)}")
        
        for i, condition in enumerate(analysis.conditions[:3], 1):
            print(f"  {i}. {condition.condition_name}")
            print(f"     Confidence: {condition.confidence:.3f}")
            print(f"     Severity: {condition.severity}")
            print(f"     Requires attention: {condition.requires_attention}")
            print()
        
    finally:
        os.unlink(temp_path)
    
    print("✅ Demo completed successfully!")
    print("\n📝 Note: This demo uses a mock CNN model for demonstration.")
    print("   In production, this would be replaced with a trained medical image model.")


if __name__ == "__main__":
    main()