#!/bin/bash

# Script to rename WhatsApp images and process them for consistent backgrounds
# This will rename images to match the numbering scheme (starting from 15, filling gap at 7)

PHOTOS_DIR="/Users/techsecurity02/Projects/personal/birthday/christmas-tree/public/photos"
WHATSAPP_DIR="$PHOTOS_DIR/WhatsApp Unknown 2026-01-02 at 18.02.27"

cd "$PHOTOS_DIR"

# Get list of WhatsApp images sorted by timestamp (filename contains time)
images=(
  "WhatsApp Image 2026-01-02 at 18.01.47.jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.53.jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.53 (1).jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.54.jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.54 (1).jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.54 (2).jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.54 (3).jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.55.jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.55 (1).jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.55 (2).jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.56.jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.56 (1).jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.56 (2).jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.57.jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.57 (1).jpeg"
  "WhatsApp Image 2026-01-02 at 18.01.59.jpeg"
  "WhatsApp Image 2026-01-02 at 18.02.00.jpeg"
  "WhatsApp Image 2026-01-02 at 18.02.02.jpeg"
)

# Check if 7.jpg exists, if not use first image for it
counter=7
if [ ! -f "7.jpg" ]; then
  echo "Processing image 1 -> 7.jpg (filling gap)"
  if [ -f "$WHATSAPP_DIR/${images[0]}" ]; then
    sips -s format jpeg "$WHATSAPP_DIR/${images[0]}" --out "7_temp.jpg" > /dev/null 2>&1
    # Resize to standard size (maintain aspect ratio, pad if needed)
    sips -Z 1920 "7_temp.jpg" --out "7.jpg" > /dev/null 2>&1
    rm -f "7_temp.jpg"
    echo "Created 7.jpg"
    counter=15
  fi
else
  counter=15
fi

# Process remaining images starting from 15
for i in "${!images[@]}"; do
  if [ $counter -eq 7 ] && [ $i -eq 0 ]; then
    continue  # Skip first image if we used it for 7.jpg
  fi
  
  if [ $counter -gt 31 ]; then
    echo "Warning: More than 31 images, stopping at 31"
    break
  fi
  
  source_file="$WHATSAPP_DIR/${images[$i]}"
  dest_file="$counter.jpg"
  
  if [ -f "$source_file" ]; then
    echo "Processing ${images[$i]} -> $dest_file"
    # Convert to JPEG and resize to standard size
    sips -s format jpeg "$source_file" --out "${dest_file}_temp.jpg" > /dev/null 2>&1
    # Resize to max 1920px (maintain aspect ratio)
    sips -Z 1920 "${dest_file}_temp.jpg" --out "$dest_file" > /dev/null 2>&1
    rm -f "${dest_file}_temp.jpg"
    echo "Created $dest_file"
    ((counter++))
  fi
done

echo "Done! Processed images numbered from 7 (if missing) and 15 onwards."

