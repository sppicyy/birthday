# 🎂 Birthday Surprise - Interactive 3D Experience

> A magical 3D interactive birthday experience built with **React**, **Three.js (R3F)**, and **AI gesture recognition**. Create a stunning 3D tree decorated with your photos that responds to hand movements!

This is a special birthday surprise project where you can display your memories in a beautiful 3D interactive tree. The tree is decorated with hundreds of your photos, sparkling particles, and birthday decorations. Control it with hand gestures - no mouse needed!

## ✨ Features

* **Magical 3D Experience**: Thousands of glowing particles form a beautiful tree structure with dynamic lighting and bloom effects
* **Photo Gallery**: Your photos appear as floating polaroid-style ornaments throughout the tree
* **AI Gesture Control**: Use your hands to control the tree - open palm to disperse, closed fist to assemble, move hand to rotate
* **Birthday Theme**: Pink, purple, and gold colors with birthday decorations and a cake on top
* **Background Music**: Add your favorite music to make it even more special
* **Fully Customizable**: Easy to add your own photos, music, and adjust settings

## 🛠️ Technology Stack

* **Framework**: React 18, Vite
* **3D Engine**: React Three Fiber (Three.js)
* **Libraries**: @react-three/drei, Maath
* **Post-processing**: @react-three/postprocessing
* **AI Vision**: MediaPipe Tasks Vision (Google)

## 🚀 Quick Start Guide

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (version 18 or higher recommended).

### Step 1: Install Dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

This will install all required packages. It may take a few minutes.

### Step 2: Add Your Photos and Videos

1. Navigate to the `public/photos/` folder
2. Add your media files with these names:
   - **`top.jpg` or `top.mp4`** - This will appear on the birthday cake at the top (use a special photo or video!)
   - **`1.jpg`/`1.mp4`, `2.jpg`/`2.mp4`, `3.jpg`/`3.mp4`** ... up to **`31.jpg`/`31.mp4`** - These will appear as ornaments on the tree

**Media Tips:**
- **Photos**: Use square or 4:3 ratio images for best results
- **Videos**: MP4 format, muted automatically, will loop
- Keep file sizes reasonable (photos under 500KB, videos under 5MB for best performance)
- The system automatically detects whether you have a .jpg or .mp4 file
- If both exist, it will prefer the video (.mp4)
- You can mix photos and videos - some can be .jpg, others can be .mp4
- You can have more or fewer files (see customization below)

### Step 2.5: Add Music (Optional but Recommended!)

1. Navigate to the `public/music/` folder
2. Add your music file and name it: **`birthday-song.mp3`**
3. Supported formats: MP3, OGG, WAV (MP3 recommended)
4. Keep file size under 5MB for best performance

**Music Tips:**
- Use happy birthday songs, romantic music, or your favorite song together
- The music will loop automatically
- Click the music button (top-right) to play/pause
- Music will auto-play when the tree forms (after first click)

### Step 3: Adjust Photo Count (Optional)

If you have more or fewer than 31 photos:

1. Open `src/App.tsx`
2. Find line 20: `const TOTAL_NUMBERED_PHOTOS = 31;`
3. Change `31` to match your number of photos (e.g., if you have 50 photos, change to `50`)

### Step 4: Run the Project

Start the development server:

```bash
npm run dev
```

The app will open in your browser automatically (usually at `http://localhost:5173`).

### Step 5: Test It Out!

1. **Allow Camera Access**: When prompted, allow the browser to access your camera
2. **Wait for AI to Load**: You'll see status messages at the top - wait for "AI READY: SHOW HAND"
3. **Try the Gestures**:
   - 🖐 **Open Palm** → Disperses the tree (photos and particles fly apart)
   - ✊ **Closed Fist** → Assembles the tree (everything comes together)
   - 👋 **Move Hand Left/Right** → Rotates the view
4. **Debug Mode**: Click the "🛠 DEBUG" button to see the camera view and hand detection

## 🎮 Controls

### Hand Gestures (AI Detection)
- **🖐 Open Palm**: Disperse - Makes the tree explode into particles
- **✊ Closed Fist**: Assemble - Forms the tree back together
- **👋 Hand Movement**: Rotate - Move your hand left/right to rotate the view

### Mouse/Keyboard
- **Click and Drag**: Rotate the camera (when not using gestures)
- **Scroll Wheel**: Zoom in/out
- **"🎂 Create Magic" Button**: Manually toggle between disperse/assemble
- **"🛠 DEBUG" Button**: Toggle camera view overlay

## 📸 Adding Your Photos

### Quick Guide

1. **Prepare your photos**: Resize them to be square or 4:3 ratio (recommended: 800x800px or 1200x900px)
2. **Name them correctly**:
   - `top.jpg` - Special photo for the cake
   - `1.jpg`, `2.jpg`, `3.jpg`, etc. - Tree ornaments
3. **Copy to folder**: Place all photos in `public/photos/`
4. **Update count**: If you have a different number, update `TOTAL_NUMBERED_PHOTOS` in `App.tsx`

### Example Structure

```
public/photos/
  ├── top.jpg      (special photo)
  ├── 1.jpg
  ├── 2.jpg
  ├── 3.jpg
  ...
  └── 31.jpg
```

## ⚙️ Customization

### Change Colors

In `src/App.tsx`, find the `CONFIG` object (around line 28) and modify the colors:

```typescript
colors: {
  primary: '#FF69B4',    // Main tree color (hot pink)
  secondary: '#BA55D3',  // Secondary color (purple)
  gold: '#FFD700',       // Gold accents
  // ... more colors
}
```

### Adjust Particle Counts

In the same `CONFIG` object:

```typescript
counts: {
  foliage: 15000,      // Tree particles (lower = better performance)
  ornaments: 300,      // Number of photo ornaments
  elements: 200,       // Birthday decorations
  lights: 400          // Party lights
}
```

**Performance Note**: Lower numbers = better performance on slower devices

### Change Tree Size

```typescript
tree: { 
  height: 22,  // Tree height
  radius: 9    // Tree width
}
```

## 🐛 Troubleshooting

### Camera Not Working
- **Check permissions**: Make sure you allowed camera access in your browser
- **Try different browser**: Chrome or Edge work best
- **Check camera**: Make sure no other app is using your camera

### Photos Not Showing
- **Check file names**: Must be exactly `top.jpg`, `1.jpg`, `2.jpg`, etc.
- **Check file location**: Photos must be in `public/photos/` folder
- **Check file format**: Use JPG format
- **Check console**: Open browser DevTools (F12) to see any errors

### Performance Issues
- **Lower particle count**: Reduce `foliage` count in CONFIG
- **Reduce photo count**: Use fewer photos
- **Close other apps**: Free up computer resources
- **Use smaller photos**: Compress images to smaller file sizes

### AI Not Detecting Gestures
- **Enable DEBUG mode**: Click the DEBUG button to see camera view
- **Check lighting**: Make sure you're in a well-lit area
- **Show full hand**: Make sure your entire hand is visible to the camera
- **Wait for "AI READY"**: Make sure the status says "AI READY: SHOW HAND"

## 📦 Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` folder. You can deploy this to any static hosting service (Netlify, Vercel, GitHub Pages, etc.).

## 🎉 Tips for the Best Experience

1. **Good Lighting**: Make sure you're in a well-lit room for gesture detection
2. **Stand Back**: Give the camera a good view of your hands
3. **Use Full Screen**: Press F11 for fullscreen mode
4. **Add Personal Touch**: Use your favorite photos together
5. **Test First**: Try it yourself before showing it to your girlfriend!

## 📝 Notes

- The AI model downloads on first use (may take a minute)
- Camera access is required for gesture control
- Works best in Chrome or Edge browsers
- For best performance, use a modern computer with a dedicated graphics card

## 🎂 Happy Birthday!

Enjoy creating this magical surprise! The tree will display all your memories together in a beautiful, interactive 3D experience.

---

**Made with ❤️ for a special birthday surprise**
