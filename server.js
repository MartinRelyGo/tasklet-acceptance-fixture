/**
 * Tiny dependency-free HTTP server: static files from public/ plus a small
 * JSON API backed by an in-memory store.
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { createStore } from "./src/store.js";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

async function serveStatic(res, urlPath) {
  const rel = normalize(urlPath === "/" ? "/index.html" : urlPath).replace(/^(\.\.[/\\])+/, "");
  const file = join(publicDir, rel);
  if (!file.startsWith(publicDir)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const content = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

export function createApp(store = createStore()) {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;

    if (path === "/api/tasks" && req.method === "GET") {
      return json(res, 200, { tasks: store.list(), summary: store.summary() });
    }

    if (path === "/api/tasks" && req.method === "POST") {
      const body = await readBody(req);
      try {
        store.add(body.title);
      } catch (error) {
        return json(res, 400, { error: error.message });
      }
      return json(res, 201, { tasks: store.list(), summary: store.summary() });
    }

    const toggleMatch = path.match(/^\/api\/tasks\/(\d+)\/toggle$/);
    if (toggleMatch && req.method === "POST") {
      store.toggle(toggleMatch[1]);
      return json(res, 200, { tasks: store.list(), summary: store.summary() });
    }

    if (req.method !== "GET") {
      res.writeHead(405).end("Method not allowed");
      return;
    }

    await serveStatic(res, path);
  });
}

export function startServer(port = Number(process.env.PORT ?? 3000)) {
  const server = createApp();
  return new Promise((resolve) => server.listen(port, "0.0.0.0", () => resolve(server)));
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  startServer().then((server) => {
    const { port } = server.address();
    console.log(`Tasklet listening on http://localhost:${port}`);
  });
}
