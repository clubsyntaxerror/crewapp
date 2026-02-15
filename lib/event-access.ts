import { ROLE_CONFIG } from "@/contexts/AuthContext";

const DEFAULT_TASK_LIST = "H62";

/** All recognized roles from ROLE_CONFIG */
const ALL_ROLES = Object.keys(ROLE_CONFIG);

/**
 * Per-task-list role access configuration.
 * If a task list name is not listed here, only the roles in DEFAULT_ALLOWED_ROLES can manage it.
 * To open a new task list to all roles, add it here with ALL_ROLES.
 */
const TASK_LIST_ALLOWED_ROLES: Record<string, string[]> = {
  [DEFAULT_TASK_LIST]: ALL_ROLES, // H62: crew + volunteer
};

/** Fallback for task lists not explicitly configured */
const DEFAULT_ALLOWED_ROLES = ["crew"];

/**
 * Determines if a user can manage (see tasks/stats) for a given event,
 * based on the event's task list and the user's Discord roles.
 */
export function canManageEvent(
  taskListName: string | undefined,
  userRoles: string[],
): boolean {
  const listName = taskListName || DEFAULT_TASK_LIST;
  const allowedRoles =
    TASK_LIST_ALLOWED_ROLES[listName] ?? DEFAULT_ALLOWED_ROLES;

  const normalizedUserRoles = userRoles.map((r) => r.toLowerCase());
  return allowedRoles.some((role) =>
    normalizedUserRoles.includes(role.toLowerCase()),
  );
}
