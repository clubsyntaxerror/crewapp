/**
 * Shared color palette for the app
 * Centralized color definitions for consistent theming
 */

export const colors = {
  // Primary brand colors
  primary: "#ff9f0a", // Orange accent
  secondary: "#4a4a4c", // Grey accent for future events
  retroBlue: "#00d4ff", // Bright retro cyan-blue

  // Button colors
  callToAction: "#6b21a8",
  facebookBlue: "#1877F2",

  // Discord brand
  discord: "#5865F2",
  discordPressed: "#4752C4",

  // Backgrounds
  background: "#000",
  cardBackground: "#1c1c1e",
  modalBackground: "#2c2c2e",
  borderColor: "#38383a",

  // Text colors
  textPrimary: "#fff",
  textSecondary: "#e5e5ea",
  textTertiary: "#8e8e93",
  textDisabled: "#666",

  // Status colors
  success: "#30d158",
  error: "#ff453a",
  warning: "#ff9f0a",
  info: "#0a84ff",

  // Rainbow colors for task lists
  rainbow: [
    "#ff453a", // Red
    "#ff9f0a", // Orange
    "#ffd60a", // Yellow
    "#32d74b", // Green
    "#64d2ff", // Cyan
    "#0a84ff", // Blue
    "#bf5af2", // Purple
    "#ff375f", // Pink/Magenta
  ],
} as const;
