# Tasklet — disposable acceptance fixture

A deliberately tiny web application used **only** to exercise the execution plane's
coding-agent flow. It is throwaway: nothing here is production code, and the app
holds no data (the task list lives in memory and resets on restart).

## Why it looks like this

- **No dependencies.** `npm install` is a no-op, so clone → install → test is fast
  inside a sandbox.
- **Real test suite.** `npm test` runs Node's built-in test runner over unit tests
  (`src/tasks.js`) and HTTP tests (`server.js`).
- **Visible homepage.** `npm start` serves a task list at `/`, so a preview URL
  shows something a human can eyeball.

## Commands

```bash
npm install   # no dependencies
npm test      # node --test
npm start     # http://localhost:3000  (PORT env var respected)
```

## Layout

```
server.js          HTTP server: static files + /api/tasks JSON API
src/tasks.js       pure task logic (good target for agent edits)
src/store.js       in-memory store
public/            homepage, styles, browser script
test/              unit + HTTP tests
```

## Suggested acceptance instructions

- "Add a `clearCompleted` function to src/tasks.js, cover it with tests, and expose
  a DELETE /api/tasks/completed endpoint."
- "Show the remaining-task count in the page title."
- "Sort tasks so completed ones appear last."
