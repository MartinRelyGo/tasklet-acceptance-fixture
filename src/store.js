/** In-memory task store. Resets on every server start — nothing is persisted. */

import { createTask, remainingCount, summarise, toggleTask } from "./tasks.js";

export function createStore(seed = ["Read the brief", "Ship the fixture"]) {
  let nextId = 1;
  let tasks = seed.map((title) => createTask(title, nextId++));

  return {
    list: () => tasks,
    add(title) {
      const task = createTask(title, nextId++);
      tasks = [...tasks, task];
      return task;
    },
    toggle(id) {
      tasks = toggleTask(tasks, Number(id));
      return tasks;
    },
    summary: () => summarise(tasks),
    remaining: () => remainingCount(tasks),
  };
}
