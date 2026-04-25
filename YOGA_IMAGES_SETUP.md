# Setting Up Yoga Pose Images for Mental Module

The Mental Health Yoga Dashboard is now showing placeholder boxes because the yoga pose images haven't been added yet. Follow these steps to add your images:

## Step 1: Locate Your Yoga Pose Images

You should have 3 yoga pose images. If you have them, proceed to Step 2. If not, you can:
- Use the screenshots provided (neutral, arms raised, stretch)
- Download similar yoga pose images from free stock photo sites
- Take your own photos

## Step 2: Place Images in the Correct Directory

1. Navigate to this folder in Windows Explorer:
   ```
   c:\projects\Capstone-Project-Clone\public\assets\yoga-poses\
   ```

2. If the folder doesn't exist, create it manually

## Step 3: Rename Your Images

Rename your 3 yoga pose images to match exactly:

1. **pose-neutral.png** - Standing pose with arms at sides
2. **pose-arms-raised.png** - Arms stretched overhead, interlinked fingers
3. **pose-stretch.png** - Full stretch position with lean

**Important**: The filenames must be exactly as shown above (lowercase with hyphens).

## Step 4: Verify File Names

Make sure the files are:
- PNG, JPG, or JPEG format
- Named exactly as specified (case-sensitive on some systems)
- Under 500KB in size each

Example folder structure:
```
c:\projects\Capstone-Project-Clone\
└── public\
    └── assets\
        └── yoga-poses\
            ├── pose-neutral.png
            ├── pose-arms-raised.png
            └── pose-stretch.png
```

## Step 5: Restart the Development Server

After adding the images:

1. Stop the dev server (press Ctrl+C in terminal)
2. Run: `npm run dev`
3. Navigate to the Mental Module dashboard
4. Select any asana (Tadasana, Konasana, or Trikonasana)
5. Click "Show Pose" button
6. Your yoga images should now appear!

## Troubleshooting

### Images Still Not Showing?

1. **Check the filename** - Must be exactly:
   - `pose-neutral.png`
   - `pose-arms-raised.png`
   - `pose-stretch.png`

2. **Check the folder path** - Should be in:
   ```
   public/assets/yoga-poses/
   ```

3. **Clear browser cache** - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

4. **Check browser console** - Open DevTools (F12) and look for 404 errors showing the expected file paths

### Image Dimensions

Recommended sizes for best display:
- **Width**: 400-600px
- **Height**: 600-900px (portrait orientation)
- **Aspect ratio**: 2:3 or 1:1.5

The dashboard will automatically scale images to fit the containers.

## Image Format Support

Supported formats:
- PNG (recommended) - .png
- JPEG - .jpg, .jpeg
- WebP - .webp (optional)

PNG is recommended for lossless quality with transparent backgrounds.

## Questions or Issues?

If you continue to see the placeholder with the camera icon 📸, it means the images are not found in the correct location. Double-check:

1. Folder exists: `public/assets/yoga-poses/`
2. Files have exact names (shown above)
3. Files are in PNG/JPG format
4. Dev server was restarted after adding files
