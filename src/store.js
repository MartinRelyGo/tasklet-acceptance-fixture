/**
 * In-memory task store. Resets on every server start — nothing is persisted.
 *
 * Tasks are partitioned per tenant. Every read/write REQUIRES a
 * server-derived tenantId; the store throws if it is missing, and it never
 * exposes another tenant's tasks. This is the authorization guarantee the
 * fixture exercises — see test/tenancy.test.js.
 */

import { MAX_TASKS_PER_TENANT } from "./config.js";
import { createTask, remainingCount, summarise, toggleTask } from "./tasks.js";

const DEFAULT_SEED = ["Read the brief", "Ship the fixture"];

function requireTenantId(tenantId) {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("A server-derived tenantId is required.");
  }
}

export function createStore(seed = DEFAULT_SEED) {
  const tenants = new Map(); // tenantId -> { tasks: Task[], nextId: number }

  function tenantState(tenantId) {
    requireTenantId(tenantId);
    if (!tenants.has(tenantId)) {
      let nextId = 1;
      const tasks = seed.map((title) => createTask(title, nextId++, tenantId));
      tenants.set(tenantId, { tasks, nextId });
    }
    return tenants.get(tenantId);
  }

  return {
    list(tenantId) {
      return tenantState(tenantId).tasks;
    },
    add(tenantId, title, priority) {
      const state = tenantState(tenantId);
      if (state.tasks.length >= MAX_TASKS_PER_TENANT) {
        throw new Error(`A tenant may have at most ${MAX_TASKS_PER_TENANT} tasks.`);
      }
      const task = createTask(title, state.nextId++, tenantId, priority);
      state.tasks = [...state.tasks, task];
      return task;
    },
    toggle(tenantId, id) {
      const state = tenantState(tenantId);
      const numericId = Number(id);
      if (!state.tasks.some((task) => task.id === numericId)) return null;
      state.tasks = toggleTask(state.tasks, numericId);
      return state.tasks.find((task) => task.id === numericId);
    },
    remove(tenantId, id) {
      const state = tenantState(tenantId);
      const numericId = Number(id);
      const before = state.tasks.length;
      state.tasks = state.tasks.filter((task) => task.id !== numericId);
      return state.tasks.length < before;
    },
    get(tenantId, id) {
      const numericId = Number(id);
      return tenantState(tenantId).tasks.find((task) => task.id === numericId) ?? null;
    },
    summary(tenantId) {
      return summarise(tenantState(tenantId).tasks);
    },
    remaining(tenantId) {
      return remainingCount(tenantState(tenantId).tasks);
    },
  };
}
