/**
 * Shared data/config surface used by both domain logic (src/tasks.js,
 * src/store.js) and the UI (public/app.js), so that changing a task-related
 * feature requires coordinated logic + UI + test + config changes.
 */

export const PRIORITIES = ["low", "medium", "high"];

export const DEFAULT_PRIORITY = "medium";

/** Per-tenant cap on the number of tasks, to keep the fixture bounded. */
export const MAX_TASKS_PER_TENANT = 50;

export default { PRIORITIES, DEFAULT_PRIORITY, MAX_TASKS_PER_TENANT };
