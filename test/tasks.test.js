import assert from "node:assert/strict";
import { test } from "node:test";

import { createTask, remainingCount, summarise, toggleTask } from "../src/tasks.js";

const TENANT = "a";

test("createTask trims the title and starts undone", () => {
  const task = createTask("  Write docs  ", 1, TENANT);
  assert.equal(task.title, "Write docs");
  assert.equal(task.done, false);
  assert.equal(task.id, 1);
  assert.equal(task.tenantId, TENANT);
});

test("createTask rejects an empty title", () => {
  assert.throws(() => createTask("   ", 1, TENANT), /needs a title/);
});

test("createTask requires a tenantId", () => {
  assert.throws(() => createTask("Write docs", 1), /tenantId/);
});

test("createTask rejects an unknown priority", () => {
  assert.throws(() => createTask("Write docs", 1, TENANT, "urgent"), /Priority must be one of/);
});

test("toggleTask flips only the matching task", () => {
  const tasks = [createTask("a", 1, TENANT), createTask("b", 2, TENANT)];
  const next = toggleTask(tasks, 2);
  assert.equal(next[0].done, false);
  assert.equal(next[1].done, true);
});

test("remainingCount counts undone tasks", () => {
  const tasks = toggleTask([createTask("a", 1, TENANT), createTask("b", 2, TENANT)], 1);
  assert.equal(remainingCount(tasks), 1);
});

test("summarise describes the list state", () => {
  assert.equal(summarise([]), "No tasks yet.");
  assert.equal(summarise([createTask("a", 1, TENANT)]), "1 of 1 tasks remaining.");
  assert.equal(summarise(toggleTask([createTask("a", 1, TENANT)], 1)), "All tasks complete.");
});
