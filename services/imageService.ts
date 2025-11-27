/**
 * Handles image resizing and format conversion for Telegram Stickers.
 * Current rules (user request):
 * - Convert to PNG instead of WebP.
 * - Target size: must not exceed 350KB (Telegram sticker cap).
 * - Longest side starts at 512px; it may scale down if needed to satisfy the upper bound.
 */

const TARGET_MAX = 350 * 1024; // 350 KB upper bound
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

const drawWithScale = (
  image: HTMLImageElement,
  baseWidth: number,
  baseHeight: number,
  scale: number
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

  return canvas;
};

const generatePng = async (
  image: HTMLImageElement,
  baseWidth: number,
  baseHeight: number,
  scale: number
) => {
  const canvas = drawWithScale(image, baseWidth, baseHeight, scale);
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

          // 1) Initial attempt: full size
          let best = await generatePng(img, baseWidth, baseHeight, 1);
          if (best.blob.size <= TARGET_MAX) {
            resolve(best);
            return;
          }

          // 2) Handle oversize: binary search on scale to get under TARGET_MAX
          let low = Math.max(MIN_DIMENSION / BASE_MAX_DIMENSION, 0.35);
          let high = 1;
          let candidate = best;

          for (let i = 0; i < 10; i++) {
            const mid = (low + high) / 2;
            const attempt = await generatePng(img, baseWidth, baseHeight, mid);

            if (attempt.blob.size > TARGET_MAX) {
              high = mid;
            } else {
              candidate = attempt;
              low = mid;
            }
          }

          best = candidate;

          if (best.blob.size > TARGET_MAX) {
            reject(new Error('Unable to reduce PNG under 350KB. Try a simpler image.'));
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
