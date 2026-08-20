/**
 * Task list domain logic. Pure functions, no I/O — this is the part a coding
 * agent is expected to modify during the acceptance test.
 *
 * Every task is tenant-owned: createTask REQUIRES a server-derived tenantId
 * and refuses to create a task without one. Callers must never pass a
 * client-supplied tenantId here — see src/auth.js and src/store.js.
 */

import { DEFAULT_PRIORITY, PRIORITIES } from "./config.js";

export function createTask(title, id, tenantId, priority = DEFAULT_PRIORITY) {
  if (!tenantId) throw new Error("createTask requires a server-derived tenantId.");
  const clean = String(title ?? "").trim();
  if (!clean) throw new Error("A task needs a title.");
  if (!PRIORITIES.includes(priority)) {
    throw new Error(`Priority must be one of: ${PRIORITIES.join(", ")}.`);
  }
  return { id, title: clean, done: false, tenantId, priority };
}

export function toggleTask(tasks, id) {
  return tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
}

export function remainingCount(tasks) {
  return tasks.filter((task) => !task.done).length;
}

export function summarise(tasks) {
  const remaining = remainingCount(tasks);
  if (tasks.length === 0) return "No tasks yet.";
  if (remaining === 0) return "All tasks complete.";
  return `${remaining} of ${tasks.length} tasks remaining.`;
}
