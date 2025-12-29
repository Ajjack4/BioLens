import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const publicId = searchParams.get('publicId')
    
    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      )
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId)
    
    if (result.result === 'ok') {
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully',
        publicId
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to delete image',
        result
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup image' },
      { status: 500 }
    )
  }
}

// Cleanup old images (can be called by a cron job)
export async function POST(request: NextRequest) {
  try {
    const { maxAge = 24 } = await request.json() // Default 24 hours
    
    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - maxAge)
    
    // Search for old images in the biolens-uploads folder
    const searchResult = await cloudinary.search
      .expression(`folder:biolens-uploads AND created_at<${cutoffDate.toISOString()}`)
      .sort_by('created_at', 'desc')
      .max_results(100)
      .execute()
    
    const deletedImages = []
    
    // Delete old images
    for (const resource of searchResult.resources) {
      try {
        const deleteResult = await cloudinary.uploader.destroy(resource.public_id)
        if (deleteResult.result === 'ok') {
          deletedImages.push(resource.public_id)
        }
      } catch (deleteError) {
        console.error(`Failed to delete ${resource.public_id}:`, deleteError)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedImages.length} old images`,
      deletedImages,
      totalFound: searchResult.resources.length
    })

  } catch (error) {
    console.error('Bulk cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup old images' },
      { status: 500 }
    )
  }
}