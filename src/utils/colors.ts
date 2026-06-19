import { RGB } from '../types';

export const COLOR_WHITE: RGB = { r: 255, g: 255, b: 255 };
export const COLOR_RED: RGB = { r: 255, g: 0, b: 0 };
export const COLOR_GREEN: RGB = { r: 0, g: 255, b: 0 };
export const COLOR_BLUE: RGB = { r: 0, g: 0, b: 255 };
export const COLOR_YELLOW: RGB = { r: 255, g: 255, b: 0 };
export const COLOR_CYAN: RGB = { r: 0, g: 255, b: 255 };
export const COLOR_MAGENTA: RGB = { r: 255, g: 0, b: 255 };
export const COLOR_NONE: RGB = { r: 0, g: 0, b: 0 };

export function rgbToCss(color: RGB, alpha: number = 1): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

export function mixColors(a: RGB, b: RGB): RGB {
  return {
    r: Math.min(255, a.r + b.r),
    g: Math.min(255, a.g + b.g),
    b: Math.min(255, a.b + b.b),
  };
}

export function applyFilter(light: RGB, filter: RGB): RGB {
  return {
    r: (light.r * filter.r) / 255,
    g: (light.g * filter.g) / 255,
    b: (light.b * filter.b) / 255,
  };
}

export function isColorMatch(a: RGB, b: RGB, tolerance: number = 30): boolean {
  return (
    Math.abs(a.r - b.r) <= tolerance &&
    Math.abs(a.g - b.g) <= tolerance &&
    Math.abs(a.b - b.b) <= tolerance
  );
}

export function colorsEqual(a: RGB, b: RGB): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

export function isWhite(c: RGB): boolean {
  return c.r > 200 && c.g > 200 && c.b > 200;
}

export function hasRed(c: RGB): boolean {
  return c.r > 50;
}

export function hasGreen(c: RGB): boolean {
  return c.g > 50;
}

export function hasBlue(c: RGB): boolean {
  return c.b > 50;
}
