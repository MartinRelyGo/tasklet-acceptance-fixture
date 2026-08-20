/**
 * Task list domain logic. Pure functions, no I/O — this is the part a coding
 * agent is expected to modify during the acceptance test.
 */

export function createTask(title, id) {
  const clean = String(title ?? "").trim();
  if (!clean) throw new Error("A task needs a title.");
  return { id, title: clean, done: false };
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
