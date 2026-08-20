import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { startServer } from "../server.js";

let server;
let baseUrl;

const AUTH_A = { Authorization: "Bearer token-a" };

before(async () => {
  server = await startServer(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => server.close());

test("homepage renders the app shell", async () => {
  const res = await fetch(baseUrl);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /Tasklet/);
  assert.match(html, /<ul id="task-list"/);
});

test("tasks API returns the seeded tasks and a summary", async () => {
  const res = await fetch(`${baseUrl}/api/tasks`, { headers: AUTH_A });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(body.tasks));
  assert.ok(body.tasks.length >= 1);
  assert.match(body.summary, /tasks remaining|complete/);
});

test("unknown routes return 404", async () => {
  const res = await fetch(`${baseUrl}/nope`);
  assert.equal(res.status, 404);
});
