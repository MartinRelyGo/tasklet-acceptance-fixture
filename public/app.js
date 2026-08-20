// Demo auth: the fixture ships one hardcoded tenant token for the browser
// UI. Real callers derive tenancy from a real auth flow — see src/auth.js.
const AUTH_HEADER = { Authorization: "Bearer token-a" };

const list = document.getElementById("task-list");
const summary = document.getElementById("summary");
const form = document.getElementById("add-form");
const input = document.getElementById("new-task");

let bundle = {};

function applyI18n() {
  document.title = bundle.appTitle ?? document.title;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = bundle[key];
    if (value === undefined) return;
    const attr = el.getAttribute("data-i18n-attr");
    if (attr) {
      el.setAttribute(attr, value);
    } else {
      el.textContent = value;
    }
  });
}

async function loadLocale() {
  const params = new URLSearchParams(location.search);
  const lang = params.get("lang") ?? (navigator.language || "en").slice(0, 2);
  const res = await fetch(`/api/i18n/${lang}`);
  bundle = res.ok ? await res.json() : await (await fetch("/api/i18n/en")).json();
  applyI18n();
}

function render(data) {
  summary.textContent = data.summary;
  list.innerHTML = "";
  if (data.tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = bundle.emptyState ?? "No tasks yet.";
    list.append(empty);
    return;
  }
  for (const task of data.tasks) {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = task.done;
    box.addEventListener("change", () => toggle(task.id));
    const label = document.createElement("span");
    label.textContent = task.title;
    li.append(box, label);
    list.append(li);
  }
}

async function load() {
  render(await (await fetch("/api/tasks", { headers: AUTH_HEADER })).json());
}

async function toggle(id) {
  render(await (await fetch(`/api/tasks/${id}/toggle`, { method: "POST", headers: AUTH_HEADER })).json());
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH_HEADER },
    body: JSON.stringify({ title }),
  });
  if (res.ok) {
    input.value = "";
    render(await res.json());
  }
});

loadLocale().then(load);
