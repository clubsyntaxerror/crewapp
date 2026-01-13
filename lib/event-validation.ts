import { Event } from './types';

interface ValidationTask {
  label: string;
  completed: boolean;
}

/**
 * Check if a value is numeric
 */
function isNumeric(value: string | undefined): boolean {
  if (!value) return false;
  return /^\d+/.test(value.trim());
}

/**
 * Get list of missing/incomplete fields for an event
 */
export function getMissingEventFields(event: Event): ValidationTask[] {
  const tasks: ValidationTask[] = [];

  if (!event.ticketsUrl) {
    tasks.push({ label: 'Tickets site', completed: false });
  }
  if (!event.facebookUrl) {
    tasks.push({ label: 'Facebook event', completed: false });
  }
  if (!event.coverFee || !isNumeric(event.coverFee)) {
    tasks.push({ label: 'Cover fee', completed: false });
  }
  if (!event.venueName) {
    tasks.push({ label: 'Venue', completed: false });
  }
  if (!event.description) {
    tasks.push({ label: 'Description', completed: false });
  }
  if (!event.streetAddress) {
    tasks.push({ label: 'Address', completed: false });
  }

  return tasks;
}
