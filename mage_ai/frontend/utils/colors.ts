export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Ensure hex is formatted properly
  const sanitizedHex = hex.replace('#', '');
  // Check hex length (should be 3 or 6)
  if (sanitizedHex.length === 3) {
    const [r, g, b] = sanitizedHex.split('').map(x => parseInt(x + x, 16));
    return { r, g, b };
  } else if (sanitizedHex.length === 6) {
    const r = parseInt(sanitizedHex.substring(0, 2), 16);
    const g = parseInt(sanitizedHex.substring(2, 4), 16);
    const b = parseInt(sanitizedHex.substring(4, 6), 16);
    return { r, g, b };
  }
  return null; // Invalid hex format
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateColorShades(baseColor: string): string[] {
  const shades: string[] = [];
  const baseRGB = hexToRgb(baseColor);
  if (!baseRGB) {
    throw new Error('Invalid base color');
  }

  const { r, g, b } = baseRGB;
  const contrastFactor = 0.05; // Adjust this to change the contrast between shades
  const maxShadeSteps = 20;

  for (let i = 0; i < maxShadeSteps; i++) {
    const adjustment = contrastFactor * i * 255;
    // Calculate new shades by adjusting brightness
    const newR = Math.min(Math.max(r - adjustment, 0), 255);
    const newG = Math.min(Math.max(g - adjustment, 0), 255);
    const newB = Math.min(Math.max(b - adjustment, 0), 255);

    shades.push(rgbToHex(Math.round(newR), Math.round(newG), Math.round(newB)));
  }

  return shades;
}

export const luminance = (hex: string) => {
  if (!hex) return 0;

  const a = hex.match(/\w\w/g)!.map((x) => parseInt(x, 16) / 255).map((x) =>
    x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};

export const contrastRatio = (hex1: string, hex2: string) => {
  const lum1 = luminance(hex1);
  const lum2 = luminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};
