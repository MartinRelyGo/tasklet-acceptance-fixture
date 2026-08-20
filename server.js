/**
 * Tiny dependency-free HTTP server: static files from public/ plus a small
 * JSON API backed by an in-memory, tenant-partitioned store.
 *
 * Tenancy contract: every /api/tasks* request must carry a bearer token that
 * resolves to a tenant (see src/auth.js). A client-supplied `tenantId` in a
 * query string or JSON body is always ignored — the server never trusts it.
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { createStore } from "./src/store.js";
import { tenantFromRequest } from "./src/auth.js";
import { SUPPORTED_LOCALES, getBundle } from "./src/i18n/index.js";

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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Very small server-side templating pass: fills in elements/attributes
 * marked with `data-i18n="key"` (and optionally `data-i18n-attr="attr"`)
 * using the resolved locale bundle. public/app.js performs the same pass in
 * the browser so the UI stays correct even without a fresh server render.
 */
function localizeHtml(html, bundle) {
  // Attribute translations, e.g. <input data-i18n="addPlaceholder" data-i18n-attr="placeholder" placeholder="...">
  let out = html.replace(
    /<([a-z0-9]+)((?:\s+[^<>]*?)?data-i18n="([^"]+)"(?:\s+[^<>]*?)?data-i18n-attr="([^"]+)"(?:\s+[^<>]*?)?)\/?>/gi,
    (whole, tag, attrs, key, attrName) => {
      const value = bundle[key] ?? "";
      const attrRegex = new RegExp(`${attrName}="[^"]*"`);
      let full = whole;
      if (attrRegex.test(full)) {
        full = full.replace(attrRegex, `${attrName}="${escapeHtml(value)}"`);
      } else {
        full = full.replace(/\/?>$/, ` ${attrName}="${escapeHtml(value)}">`);
      }
      return full;
    }
  );

  // Text content translations, e.g. <h1 data-i18n="heading">Old text</h1>
  out = out.replace(
    /<([a-z0-9]+)((?:\s+(?!data-i18n-attr)[^<>]*?)?data-i18n="([^"]+)"(?:\s+(?!data-i18n-attr)[^<>]*?)?)>([^<]*)<\/\1>/gi,
    (whole, tag, attrs, key, oldText) => {
      if (whole.includes("data-i18n-attr")) return whole;
      const value = bundle[key] ?? oldText;
      return `<${tag}${attrs}>${escapeHtml(value)}</${tag}>`;
    }
  );

  return out;
}

function resolveLocale(req, url) {
  const queryLang = url.searchParams.get("lang");
  if (queryLang && SUPPORTED_LOCALES.includes(queryLang)) return queryLang;
  const acceptLanguage = req.headers["accept-language"];
  if (acceptLanguage) {
    for (const part of acceptLanguage.split(",")) {
      const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
      if (SUPPORTED_LOCALES.includes(code)) return code;
    }
  }
  return "en";
}

async function serveStatic(req, res, urlPath, locale) {
  const rel = normalize(urlPath === "/" ? "/index.html" : urlPath).replace(/^(\.\.[/\\])+/, "");
  const file = join(publicDir, rel);
  if (!file.startsWith(publicDir)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    let content = await readFile(file);
    if (extname(file) === ".html") {
      content = localizeHtml(content.toString("utf8"), getBundle(locale));
    }
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

    if (path.startsWith("/api/i18n/")) {
      if (req.method !== "GET") {
        res.writeHead(405).end("Method not allowed");
        return;
      }
      const locale = path.slice("/api/i18n/".length);
      if (!SUPPORTED_LOCALES.includes(locale)) {
        return json(res, 404, { error: "Unsupported locale." });
      }
      return json(res, 200, getBundle(locale));
    }

    if (path.startsWith("/api/tasks")) {
      // Tenancy is derived exclusively from the auth token. Any tenantId a
      // client tries to smuggle in via query string or JSON body is ignored.
      const tenantId = tenantFromRequest(req);
      if (!tenantId) {
        return json(res, 401, { error: "Unauthorized." });
      }

      if (path === "/api/tasks" && req.method === "GET") {
        return json(res, 200, { tasks: store.list(tenantId), summary: store.summary(tenantId) });
      }

      if (path === "/api/tasks" && req.method === "POST") {
        const body = await readBody(req);
        try {
          store.add(tenantId, body.title, body.priority);
        } catch (error) {
          return json(res, 400, { error: error.message });
        }
        return json(res, 201, { tasks: store.list(tenantId), summary: store.summary(tenantId) });
      }

      const toggleMatch = path.match(/^\/api\/tasks\/(\d+)\/toggle$/);
      if (toggleMatch && req.method === "POST") {
        const task = store.toggle(tenantId, toggleMatch[1]);
        if (!task) return json(res, 404, { error: "Task not found." });
        return json(res, 200, { tasks: store.list(tenantId), summary: store.summary(tenantId) });
      }

      const idMatch = path.match(/^\/api\/tasks\/(\d+)$/);
      if (idMatch && req.method === "DELETE") {
        const removed = store.remove(tenantId, idMatch[1]);
        if (!removed) return json(res, 404, { error: "Task not found." });
        return json(res, 200, { tasks: store.list(tenantId), summary: store.summary(tenantId) });
      }

      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Not found." }));
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(405).end("Method not allowed");
      return;
    }

    const locale = resolveLocale(req, url);
    await serveStatic(req, res, path, locale);
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
