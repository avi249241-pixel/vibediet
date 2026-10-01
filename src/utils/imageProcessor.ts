/**
 * Pre-processes user uploaded images or camera captures:
 * Scales proportionally (max 800px) maintaining 100% of meal aspect ratio
 * so no side dishes, beverages, or plate portions are cropped out.
 * Generates optimized high-fidelity JPEG (~90-140KB) for rapid vision analysis.
 */
export async function preProcessImage(
  fileOrBlob: File | Blob,
  maxDimension = 800,
  quality = 0.85
): Promise<{ base64: string; dataUrl: string; sizeKb: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image data'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Proportional scale to max dimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
        const sizeKb = Math.round((base64.length * (3 / 4)) / 1024);

        resolve({ base64, dataUrl, sizeKb, width, height });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}
