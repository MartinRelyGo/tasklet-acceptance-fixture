import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { startServer } from "../server.js";

let server;
let baseUrl;

const AUTH_A = { Authorization: "Bearer token-a" };
const AUTH_B = { Authorization: "Bearer token-b" };

before(async () => {
  server = await startServer(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => server.close());

async function createTaskAs(auth, title) {
  const res = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ title }),
  });
  const body = await res.json();
  return body.tasks.at(-1);
}

test("requests with no auth token are rejected with 401", async () => {
  const res = await fetch(`${baseUrl}/api/tasks`);
  assert.equal(res.status, 401);
});

test("requests with a garbage auth token are rejected with 401", async () => {
  const res = await fetch(`${baseUrl}/api/tasks`, { headers: { Authorization: "Bearer not-a-real-token" } });
  assert.equal(res.status, 401);
});

test("tenant A cannot read tenant B's tasks", async () => {
  const taskB = await createTaskAs(AUTH_B, "B's private task");
  const resA = await fetch(`${baseUrl}/api/tasks`, { headers: AUTH_A });
  const bodyA = await resA.json();
  assert.ok(!bodyA.tasks.some((task) => task.id === taskB.id && task.title === taskB.title));
});

test("tenant A cannot toggle (update) tenant B's task", async () => {
  const taskB = await createTaskAs(AUTH_B, "toggle-target");
  const res = await fetch(`${baseUrl}/api/tasks/${taskB.id}/toggle`, { method: "POST", headers: AUTH_A });
  assert.equal(res.status, 404);

  // Confirm it was not actually toggled for tenant B either.
  const resB = await fetch(`${baseUrl}/api/tasks`, { headers: AUTH_B });
  const bodyB = await resB.json();
  const stillThere = bodyB.tasks.find((task) => task.id === taskB.id);
  assert.equal(stillThere.done, false);
});

test("tenant A cannot delete tenant B's task", async () => {
  const taskB = await createTaskAs(AUTH_B, "delete-target");
  const res = await fetch(`${baseUrl}/api/tasks/${taskB.id}`, { method: "DELETE", headers: AUTH_A });
  assert.equal(res.status, 404);

  const resB = await fetch(`${baseUrl}/api/tasks`, { headers: AUTH_B });
  const bodyB = await resB.json();
  assert.ok(bodyB.tasks.some((task) => task.id === taskB.id));
});

test("a forged tenantId in the JSON body is ignored", async () => {
  const res = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH_A },
    body: JSON.stringify({ title: "forged", tenantId: "b" }),
  });
  const body = await res.json();
  const created = body.tasks.at(-1);
  assert.equal(created.tenantId, "a");

  // Tenant B must not see it.
  const resB = await fetch(`${baseUrl}/api/tasks`, { headers: AUTH_B });
  const bodyB = await resB.json();
  assert.ok(!bodyB.tasks.some((task) => task.title === "forged"));
});

test("a forged tenantId in the query string is ignored", async () => {
  const res = await fetch(`${baseUrl}/api/tasks?tenantId=b`, { headers: AUTH_A });
  const body = await res.json();
  assert.ok(body.tasks.every((task) => task.tenantId === "a"));
});
