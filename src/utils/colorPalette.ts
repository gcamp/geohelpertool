import { ColorPalette } from '../types/layer';

/**
 * Color palette mapping from emoji to hex/CSS values
 */
export const COLOR_PALETTE_MAP = {
  [ColorPalette.BLUE]: {
    emoji: '🔵',
    hex: '#3B82F6',
    css: 'rgb(59, 130, 246)',
    name: 'Blue'
  },
  [ColorPalette.GREEN]: {
    emoji: '🟢',
    hex: '#10B981',
    css: 'rgb(16, 185, 129)',
    name: 'Green'
  },
  [ColorPalette.RED]: {
    emoji: '🔴',
    hex: '#EF4444',
    css: 'rgb(239, 68, 68)',
    name: 'Red'
  },
  [ColorPalette.YELLOW]: {
    emoji: '🟡',
    hex: '#F59E0B',
    css: 'rgb(245, 158, 11)',
    name: 'Yellow'
  },
  [ColorPalette.PURPLE]: {
    emoji: '🟣',
    hex: '#8B5CF6',
    css: 'rgb(139, 92, 246)',
    name: 'Purple'
  },
  [ColorPalette.ORANGE]: {
    emoji: '🟠',
    hex: '#F97316',
    css: 'rgb(249, 115, 22)',
    name: 'Orange'
  }
} as const;

/**
 * Get color information from emoji
 */
export const getColorFromEmoji = (emoji: ColorPalette) => {
  return COLOR_PALETTE_MAP[emoji];
};

/**
 * Get hex color value from emoji
 */
export const getHexFromEmoji = (emoji: ColorPalette): string => {
  return COLOR_PALETTE_MAP[emoji].hex;
};

/**
 * Get CSS color value from emoji
 */
export const getCssFromEmoji = (emoji: ColorPalette): string => {
  return COLOR_PALETTE_MAP[emoji].css;
};

/**
 * Get color name from emoji
 */
export const getNameFromEmoji = (emoji: ColorPalette): string => {
  return COLOR_PALETTE_MAP[emoji].name;
};

/**
 * Validate if a color is valid
 */
export const validateColor = (color: string): boolean => {
  return Object.values(ColorPalette).includes(color as ColorPalette);
};

/**
 * Get all available colors
 */
export const getAllColors = (): ColorPalette[] => {
  return Object.values(ColorPalette);
};

/**
 * Get next available color from unused colors
 */
export const getNextAvailableColor = (usedColors: ColorPalette[]): ColorPalette => {
  const allColors = getAllColors();
  
  // Find first unused color
  for (const color of allColors) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  
  // If all colors are used, cycle through them
  return allColors[usedColors.length % allColors.length];
};

/**
 * Get color for map layer styling
 */
export const getMapLayerColor = (emoji: ColorPalette, opacity: number = 1): string => {
  const color = getColorFromEmoji(emoji);
  // Convert hex to rgba for opacity support
  const r = parseInt(color.hex.slice(1, 3), 16);
  const g = parseInt(color.hex.slice(3, 5), 16);
  const b = parseInt(color.hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Get contrasting text color for given background color
 */
export const getContrastingTextColor = (backgroundColor: ColorPalette): string => {
  const color = getColorFromEmoji(backgroundColor);
  const hex = color.hex;
  
  // Calculate luminance
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * Get color palette for UI display
 */
export const getColorPaletteForUI = () => {
  return Object.values(ColorPalette).map(emoji => {
    const colorInfo = getColorFromEmoji(emoji);
    return {
      emoji,
      hex: colorInfo.hex,
      css: colorInfo.css,
      name: colorInfo.name,
      contrastText: getContrastingTextColor(emoji)
    };
  });
};

/**
 * Color accessibility utilities
 */
export const colorAccessibility = {
  /**
   * Check if color meets WCAG AA contrast ratio
   */
  meetsContrastRatio: (color1: ColorPalette, color2: ColorPalette): boolean => {
    const color1Info = getColorFromEmoji(color1);
    const color2Info = getColorFromEmoji(color2);
    
    // Simplified contrast ratio calculation
    const luminance1 = getLuminance(color1Info.hex);
    const luminance2 = getLuminance(color2Info.hex);
    
    const ratio = (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05);
    
    return ratio >= 4.5; // WCAG AA standard
  },
  
  /**
   * Get recommended color combinations
   */
  getRecommendedCombinations: (): Array<{ primary: ColorPalette; secondary: ColorPalette }> => {
    return [
      { primary: ColorPalette.BLUE, secondary: ColorPalette.ORANGE },
      { primary: ColorPalette.GREEN, secondary: ColorPalette.RED },
      { primary: ColorPalette.PURPLE, secondary: ColorPalette.YELLOW }
    ];
  }
};

/**
 * Calculate luminance for contrast ratio
 */
function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const rLum = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLum = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLum = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
}