# 🎂 Quick Setup Guide - Birthday Surprise

## Step-by-Step Instructions

### 1️⃣ Install Everything (First Time Only)

```bash
cd christmas-tree
npm install
```

**Wait for this to finish** - it downloads all the 3D libraries and AI models.

### 2️⃣ Add Your Photos

1. Open the folder: `public/photos/`
2. Replace the existing photos with your own:
   - `top.jpg` - A special photo (this goes on the cake!)
   - `1.jpg`, `2.jpg`, `3.jpg` ... `31.jpg` - Your photos together

**Quick Tip**: You can use fewer photos (like 10-20) if you want. Just update the number in the code (see step 3).

### 3️⃣ Update Photo Count (If Needed)

If you have a different number of photos:

1. Open `src/App.tsx`
2. Find this line (around line 20):
   ```typescript
   const TOTAL_NUMBERED_PHOTOS = 31;
   ```
3. Change `31` to your number (e.g., `20` if you have 20 photos)

### 4️⃣ Run It!

```bash
npm run dev
```

Your browser should open automatically. If not, go to: `http://localhost:5173`

### 5️⃣ Test the Gestures

1. **Allow camera access** when asked
2. Wait for "AI READY: SHOW HAND" message
3. Try these gestures:
   - 🖐 **Open hand** = Tree explodes
   - ✊ **Fist** = Tree forms
   - 👋 **Move hand** = Rotate view

### 6️⃣ Show Her! 🎉

When everything works:
- Click "🛠 DEBUG" to hide the camera view
- Press F11 for fullscreen
- Let her control it with her hands!

## Common Issues

**Photos not showing?**
- Check file names are exactly `1.jpg`, `2.jpg`, etc. (lowercase)
- Make sure photos are in `public/photos/` folder

**Camera not working?**
- Click "Allow" when browser asks for camera permission
- Try Chrome or Edge browser

**Too slow?**
- Open `src/App.tsx`
- Find `foliage: 15000` and change to `foliage: 8000` (lower = faster)

## Need Help?

Check the full README.md for more details!

