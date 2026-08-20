const list = document.getElementById("task-list");
const summary = document.getElementById("summary");
const form = document.getElementById("add-form");
const input = document.getElementById("new-task");

function render(data) {
  summary.textContent = data.summary;
  list.innerHTML = "";
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
  render(await (await fetch("/api/tasks")).json());
}

async function toggle(id) {
  render(await (await fetch(`/api/tasks/${id}/toggle`, { method: "POST" })).json());
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (res.ok) {
    input.value = "";
    render(await res.json());
  }
});

load();
