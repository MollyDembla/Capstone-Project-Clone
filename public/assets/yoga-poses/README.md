# Yoga Pose Images Setup

This directory contains yoga pose reference images for the Mental Module dashboard.

## Required Images

Place the following images in this directory:

1. **pose-neutral.png** - Standing neutral pose (feet together, arms at sides)
2. **pose-arms-raised.png** - Arms stretched overhead (interlinked fingers)
3. **pose-stretch.png** - Full stretch with arms overhead and slight lean

## Image Specifications

- **Format**: PNG, JPG, or JPEG
- **Dimensions**: 
  - Recommended: 400x600px (portrait orientation)
  - Minimum: 300x450px
  - Maximum: 800x1200px
- **File Size**: Keep under 500KB for optimal performance
- **Background**: Light or neutral background recommended for clarity

## Usage

These images are automatically loaded by the Mental Module dashboard when users:
1. Visit the Tadasana, Konasana, or Trikonasana tutorial sections
2. Switch to "Show Pose" mode in the tutorial gallery
3. Browse through the step-by-step yoga pose demonstrations

## Setup Steps

1. Save the yoga pose images to this directory with the exact filenames listed above
2. Restart the development server (`npm run dev`)
3. Navigate to the mental module dashboard
4. Click on any asana to see the tutorial with the new pose images

## Note

- All three asanas (Tadasana, Konasana, Trikonasana) currently use the same set of three images
- Images are displayed in sequence: neutral → arms raised → full stretch
- Each step has a caption below it explaining the pose progression
