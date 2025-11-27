/**
 * Handles image resizing and format conversion for Telegram Stickers.
 * Rules:
 * - One side must be exactly 512px.
 * - The other side must be <= 512px.
 * - Format: WebP.
 * - Size: Must be strictly < 512KB. (We target 500KB for safety)
 */

const MAX_FILE_SIZE = 500 * 1024; // 500 KB (Target limit)
const HARD_LIMIT = 512 * 1024; // 512 KB (Telegram strict limit)

const getCanvasBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> => {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/webp',
      Math.max(0.01, Math.min(1, quality)) // Ensure quality is between 0.01 and 1
    );
  });
};

export const processImageForSticker = (file: File): Promise<{ blob: Blob; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Calculate new dimensions (Max 512px on longest side, keeping aspect ratio)
          // Telegram rule: One side must be 512px, other side <= 512px.
          if (width >= height) {
            height = Math.round((height * 512) / width);
            width = 512;
          } else {
            width = Math.round((width * 512) / height);
            height = 512;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          // High quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // ---------------------------------------------------------
          // BINARY SEARCH COMPRESSION STRATEGY
          // Goal: Find the highest Quality (Q) such that Size(Q) <= 500KB.
          // ---------------------------------------------------------
          
          // 1. Check Max Quality (1.0)
          let bestBlob: Blob | null = null;
          const maxQBlob = await getCanvasBlob(canvas, 1.0);
          
          if (maxQBlob && maxQBlob.size <= MAX_FILE_SIZE) {
            // If it fits at 100% quality, just use it. 
            // We cannot make it larger without artificially padding it, which is not useful.
            resolve({ blob: maxQBlob, width, height });
            return;
          }

          // 2. Binary Search for best fit
          let minQ = 0.01;
          let maxQ = 1.0;
          let iterations = 0;

          // We try to find the "sweet spot" where quality is maximized but size is <= MAX_FILE_SIZE
          while (iterations < 12) { // 12 iterations gives precision of ~0.0002 which is plenty
            const midQ = (minQ + maxQ) / 2;
            const blob = await getCanvasBlob(canvas, midQ);

            if (!blob) {
               // Should not happen, but safe fallback to lower range
               maxQ = midQ; 
               continue;
            }

            if (blob.size <= MAX_FILE_SIZE) {
               // This quality fits!
               // Store it as a candidate, but try to see if we can go higher.
               bestBlob = blob;
               minQ = midQ; 
            } else {
               // Too big, we must reduce quality.
               maxQ = midQ; 
            }
            
            // Optimization: If the window is extremely small, stop.
            if (maxQ - minQ < 0.005) break;
            
            iterations++;
          }

          // 3. Final Result Handling
          if (bestBlob) {
             resolve({ blob: bestBlob, width, height });
          } else {
             // Fallback: Try absolute minimum quality if search failed (extremely rare for 512px)
             const minBlob = await getCanvasBlob(canvas, 0.01);
             if (minBlob && minBlob.size <= HARD_LIMIT) {
                resolve({ blob: minBlob, width, height });
             } else {
                reject(new Error("Image is too complex to fit 512KB even at lowest quality."));
             }
          }

        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};