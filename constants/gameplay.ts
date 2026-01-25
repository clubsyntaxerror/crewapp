/**
 * Gameplay constants for emoji reactions and commitment logic
 * Defines thresholds and emojis for user engagement feedback
 */

export const EMOJI_THRESHOLDS = {
  // Task list size threshold - below this uses simple progression
  SMALL_TASK_LIST_MAX: 4,

  // Overachiever thresholds (for larger task lists)
  OVERACHIEVER_8_PLUS: 8, // Wizard emoji at 8+ tasks
  OVERACHIEVER_7: 7, // Unicorn at 7 tasks
  OVERACHIEVER_6: 6, // Rockstar at 6 tasks
  OVERACHIEVER_5: 5, // Superstar at 5 tasks
} as const;

/**
 * Timing constants for UX delays and animations
 * All duration values in milliseconds
 */
export const TIMING = {
  // Save status display durations
  SAVE_SUCCESS_DISPLAY: 2000, // How long to show "Saved" message
  SAVE_ERROR_DISPLAY: 5000, // How long to show error messages
} as const;

export const COMMITMENT_EMOJIS = {
  // Negative
  ABSENT: "😢",

  // Small list progression (1-4 tasks)
  SUPERHAPPY: "🤩", // All tasks selected
  VERY_HAPPY: "😄", // 3 tasks
  HAPPY: "😊", // 2 tasks
  APPRECIATED: "🙂", // 1 task

  // Overachiever progression (5+ tasks)
  WIZARD: "💫", // 8+ tasks
  UNICORN: "🧙", // 7 tasks
  ROCKSTAR: "🦄", // 6 tasks
  SUPERSTAR: "😎", // 5 tasks
  SATISFIED: "🤩", // 4 tasks on large list
} as const;

/**
 * Emoji progression lookup tables
 * Declarative configuration for commitment emoji selection
 */
interface EmojiTier {
  min: number;
  max: number;
  emoji: string;
}

export const EMOJI_PROGRESSION = {
  // Small lists (1-4 tasks) - simpler progression
  small: [
    { min: 0, max: 0, emoji: "" },
    { min: 1, max: 1, emoji: COMMITMENT_EMOJIS.APPRECIATED },
    { min: 2, max: 2, emoji: COMMITMENT_EMOJIS.HAPPY },
    { min: 3, max: 3, emoji: COMMITMENT_EMOJIS.VERY_HAPPY },
    { min: 4, max: Infinity, emoji: COMMITMENT_EMOJIS.SUPERHAPPY }, // All tasks = superhappy
  ] as EmojiTier[],

  // Large lists (5+ tasks) - overachiever progression
  large: [
    { min: 0, max: 0, emoji: "" },
    { min: 1, max: 1, emoji: COMMITMENT_EMOJIS.APPRECIATED },
    { min: 2, max: 2, emoji: COMMITMENT_EMOJIS.HAPPY },
    { min: 3, max: 3, emoji: COMMITMENT_EMOJIS.VERY_HAPPY },
    { min: 4, max: 4, emoji: COMMITMENT_EMOJIS.SATISFIED },
    { min: 5, max: 5, emoji: COMMITMENT_EMOJIS.SUPERSTAR },
    { min: 6, max: 6, emoji: COMMITMENT_EMOJIS.ROCKSTAR },
    { min: 7, max: 7, emoji: COMMITMENT_EMOJIS.UNICORN },
    { min: 8, max: Infinity, emoji: COMMITMENT_EMOJIS.WIZARD },
  ] as EmojiTier[],
} as const;
