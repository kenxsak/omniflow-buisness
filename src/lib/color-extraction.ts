/**
 * Utility functions for extracting dominant colors from images
 */

/**
 * Extract dominant colors from an image URL using ColorThief
 * This works by creating a temporary image element and using ColorThief to extract colors
 * 
 * @param imageUrl - The URL of the image to extract colors from
 * @returns Promise<{ primary: string; secondary: string }> - The extracted colors in hex format
 */
export async function extractColorsFromImage(imageUrl: string): Promise<{ primary: string; secondary: string }> {
  return new Promise((resolve, reject) => {
    // Dynamically import ColorThief only on the client side
    if (typeof window === 'undefined') {
      reject(new Error('Color extraction only works in the browser'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Enable CORS for external images
    
    img.onload = async () => {
      try {
        // Dynamically import ColorThief
        const ColorThief = (await import('colorthief')).default;
        const colorThief = new ColorThief();
        
        // Get the dominant color (most prominent color in the image)
        const dominantColor = colorThief.getColor(img);
        
        // Get a color palette (multiple colors from the image)
        const palette = colorThief.getPalette(img, 5); // Get 5 colors
        
        // Convert RGB arrays to hex
        const rgbToHex = (rgb: number[]) => {
          return '#' + rgb.map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          }).join('');
        };
        
        // Primary color is the dominant color
        const primaryColor = rgbToHex(dominantColor);
        
        // Secondary color is the second color from the palette
        // If palette only has one color, we'll generate a complementary color
        let secondaryColor: string;
        if (palette.length > 1) {
          secondaryColor = rgbToHex(palette[1]);
        } else {
          // Generate a complementary/analogous color
          secondaryColor = generateComplementaryColor(dominantColor);
        }
        
        resolve({
          primary: primaryColor,
          secondary: secondaryColor
        });
      } catch (error) {
        console.error('Error extracting colors:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image. Make sure the image URL is valid and allows CORS.'));
    };
    
    // Add a timestamp to bypass cache if needed
    const urlWithTimestamp = imageUrl.includes('?') 
      ? `${imageUrl}&t=${Date.now()}` 
      : `${imageUrl}?t=${Date.now()}`;
    
    img.src = urlWithTimestamp;
  });
}

/**
 * Generate a complementary color from an RGB color
 * This creates a color that works well with the input color
 */
function generateComplementaryColor(rgb: number[]): string {
  // Convert RGB to HSL
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  // Shift hue by 30 degrees (analogous) or 180 degrees (complementary)
  // Using 30 degrees for a more harmonious look
  h = (h + 0.083) % 1; // 30 degrees = 0.083 in 0-1 range
  
  // Convert HSL back to RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  let newR: number, newG: number, newB: number;
  
  if (s === 0) {
    newR = newG = newB = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    newR = hue2rgb(p, q, h + 1/3);
    newG = hue2rgb(p, q, h);
    newB = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return '#' + toHex(newR) + toHex(newG) + toHex(newB);
}

/**
 * Check if a URL is a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    new URL(url);
    // Check if it ends with common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext));
  } catch {
    return false;
  }
}
