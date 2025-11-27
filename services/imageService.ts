/**
 * Handles image resizing and format conversion for Telegram Stickers.
 * Current rules (user request):
 * - Convert to PNG instead of WebP.
 * - Target size window: 400KB–500KB (must not exceed 500KB and should not be below 400KB).
 * - Longest side starts at 512px; it may scale down if needed to satisfy the upper bound.
 */

const TARGET_MAX = 500 * 1024; // 500 KB upper bound
const TARGET_MIN = 400 * 1024; // 400 KB lower bound
const BASE_MAX_DIMENSION = 512; // Starting longest side
const MIN_DIMENSION = 240; // Safeguard lower bound to avoid excessive downscaling

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getPngBlob = (sourceCanvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    sourceCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to encode PNG'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};

const drawWithScaleAndNoise = (
  image: HTMLImageElement,
  baseWidth: number,
  baseHeight: number,
  scale: number,
  noiseStrength: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const width = Math.max(MIN_DIMENSION, Math.round(baseWidth * scale));
  const height = Math.max(MIN_DIMENSION, Math.round(baseHeight * scale));

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  if (noiseStrength > 0) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Add subtle random noise to increase entropy and file size when PNG output is too small.
    for (let i = 0; i < data.length; i += 4) {
      const delta = (Math.random() * 2 - 1) * noiseStrength;
      data[i] = clamp(data[i] + delta, 0, 255);     // R
      data[i + 1] = clamp(data[i + 1] + delta, 0, 255); // G
      data[i + 2] = clamp(data[i + 2] + delta, 0, 255); // B
      // Alpha stays untouched
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
};

const generatePng = async (
  image: HTMLImageElement,
  baseWidth: number,
  baseHeight: number,
  scale: number,
  noiseStrength: number
) => {
  const canvas = drawWithScaleAndNoise(image, baseWidth, baseHeight, scale, noiseStrength);
  const blob = await getPngBlob(canvas);
  return { blob, width: canvas.width, height: canvas.height };
};

export const processImageForSticker = (file: File): Promise<{ blob: Blob; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Establish base dimensions (longest side = BASE_MAX_DIMENSION)
          let baseWidth = img.width;
          let baseHeight = img.height;
          if (baseWidth >= baseHeight) {
            baseHeight = Math.round((baseHeight * BASE_MAX_DIMENSION) / baseWidth);
            baseWidth = BASE_MAX_DIMENSION;
          } else {
            baseWidth = Math.round((baseWidth * BASE_MAX_DIMENSION) / baseHeight);
            baseHeight = BASE_MAX_DIMENSION;
          }

          // 1) Initial attempt: full size, no noise
          let best = await generatePng(img, baseWidth, baseHeight, 1, 0);
          if (best.blob.size >= TARGET_MIN && best.blob.size <= TARGET_MAX) {
            resolve(best);
            return;
          }

          // 2) Handle oversize: binary search on scale to get under TARGET_MAX
          if (best.blob.size > TARGET_MAX) {
            let low = Math.max(MIN_DIMENSION / BASE_MAX_DIMENSION, 0.35);
            let high = 1;
            let candidate = best;

            for (let i = 0; i < 10; i++) {
              const mid = (low + high) / 2;
              const attempt = await generatePng(img, baseWidth, baseHeight, mid, 0);

              if (attempt.blob.size > TARGET_MAX) {
                high = mid;
              } else {
                candidate = attempt;
                low = mid;
              }
            }

            best = candidate;

            // If we are still above the ceiling, fail fast.
            if (best.blob.size > TARGET_MAX) {
              reject(new Error('Unable to reduce PNG under 500KB. Try a simpler image.'));
              return;
            }
          }

          // 3) If too small, add controlled noise to raise size into the window
          if (best.blob.size < TARGET_MIN) {
            let padded: typeof best | null = null;
            for (let noise = 2; noise <= 40; noise += 2) {
              const attempt = await generatePng(img, baseWidth, baseHeight, 1, noise);
              if (attempt.blob.size > TARGET_MAX) break;
              padded = attempt;
              if (attempt.blob.size >= TARGET_MIN) {
                best = attempt;
                break;
              }
            }

            if (best.blob.size < TARGET_MIN && padded) {
              // Use the largest we managed without breaching the ceiling
              best = padded;
            }
          }

          if (best.blob.size < TARGET_MIN) {
            reject(new Error('Could not reach 400KB without breaking the 500KB cap.'));
            return;
          }

          resolve(best);
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
