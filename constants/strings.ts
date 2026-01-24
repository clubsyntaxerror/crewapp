/**
 * Centralized UI text strings
 * All user-facing text should be defined here for consistency and easy i18n later
 */

export const STRINGS = {
  // App branding
  APP_NAME: "Syntax Error Events",
  APP_TITLE: "Syntax Error Events",
  APP_SHORT: "Syntax Events",

  // Home page
  HOME: {
    NEXT_EVENT: "Next event",
    FUTURE_EVENTS: "Future events",
    NO_EVENTS: "No events scheduled",
  },

  // Filter modal
  FILTER: {
    TITLE: "Filter Events",
    UPCOMING: "Upcoming Events",
    PAST: "Past Events",
    ALL: "All Events",
    CANCEL: "Cancel",
  },

  // User modal
  USER: {
    LOGOUT: "Logout",
    FALLBACK_USERNAME: "Discord User",
  },

  // Login page
  LOGIN: {
    TITLE: "CREW APP",
    SUBTITLE: "Club Syntax Error",
    BUTTON: "Sign in with Discord",
    INFO_TEXT:
      "This app is for crew & volunteers to manage event responsibilities.",
    FOOTER_TEXT: "New to the crew? Join our Discord server to get started!",
  },

  // Event details page
  EVENT: {
    HEADER_TITLE: "Crew & volunteer signup",
    NOT_FOUND: "Event not found",
    TASKS_MISSING: "You're missing:",
    TASKS_TITLE_ACTIVE: "Commit to responsibilities:",
    TASKS_TITLE_ENDED: "Responsibilities (Event ended):",
    DETAILS_SHOW: "Show Event Details",
    DETAILS_HIDE: "Hide Event Details",
    VENUE_TITLE: "Venue",
    MAP_BUTTON: "Open in Maps",
    DESCRIPTION_TITLE: "Description",
    INFO_TITLE: "Event Info",
    TICKETS_BUTTON: "Get Tickets",
    UNAUTHORIZED_MESSAGE:
      "Want to help out with our events? Reach out to us on Discord to learn about volunteering!",
  },

  // Status messages
  STATUS: {
    SAVING: "Saving...",
    SAVED: "Saved",
    ERROR_SAVING: "Error saving",
  },

  // Error messages
  ERRORS: {
    LOGOUT_FAILED_TITLE: "Logout Failed",
    LOGOUT_FAILED_MESSAGE: "Failed to sign out. Please try again.",
    LOGIN_FAILED_TITLE: "Login Failed",
    SAVE_FAILED: "Failed to save. Please try again.",
  },

  // Loading screen messages
  LOADING: {
    AUTHENTICATING: "Authenticating...",
    FETCHING_ROLES: "Checking permissions...",
    LOADING_EVENTS: "Loading events...",
    LOADING_TASKS: "Loading tasks...",
    LOADING_EVENT_DETAILS: "Loading event details...",
    ALMOST_READY: "Almost ready...",
  },
} as const;
