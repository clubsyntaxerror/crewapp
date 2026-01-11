/**
 * Shared typography styles for the microknight font
 * Defines consistent font sizes with appropriate line heights
 */

export const microknightText = {
  // Extra small text (11px)
  xs: {
    fontFamily: 'microknight' as const,
    fontSize: 11,
    lineHeight: 18,
  },
  // Small text (12px)
  sm: {
    fontFamily: 'microknight' as const,
    fontSize: 12,
    lineHeight: 18,
  },
  // Base text (14px)
  base: {
    fontFamily: 'microknight' as const,
    fontSize: 14,
    lineHeight: 20,
  },
  // Medium text (16px)
  md: {
    fontFamily: 'microknight' as const,
    fontSize: 16,
    lineHeight: 24,
  },
  // Large text (18px)
  lg: {
    fontFamily: 'microknight' as const,
    fontSize: 18,
    lineHeight: 26,
  },
  // Extra large text (20px)
  xl: {
    fontFamily: 'microknight' as const,
    fontSize: 20,
    lineHeight: 28,
  },
  // 2XL text (28px)
  '2xl': {
    fontFamily: 'microknight' as const,
    fontSize: 28,
    lineHeight: 36,
  },
  // 3XL text (32px)
  '3xl': {
    fontFamily: 'microknight' as const,
    fontSize: 32,
    lineHeight: 40,
  },
} as const;
