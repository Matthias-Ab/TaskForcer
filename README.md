# TaskForcer

An aggressive productivity desktop app that uses behavioral forcing mechanics to make you actually complete your tasks.

## Features

- **Today View** — prioritized task list (critical / medium / low) with Framer Motion animations
- **Calendar View** — month calendar with task density overlay
- **Upcoming View** — 7-day lookahead
- **Stats View** — area/line charts via Recharts, streak tracking
- **Shame Log** — virtualized log of all your failures (distractions, skipped check-ins, missed tasks)
- **Morning Popup** — forces acknowledgment of today's tasks before dismissal
- **Floating Widget** — glassmorphic always-on-top overlay showing active task + elapsed time
- **Check-in Dialogs** — periodic "still on task?" prompts; shame logged on skip
- **Focus Tracker** — read-only active-window polling to detect distraction apps
- **Idle Detection** — notifies when you've been away with critical tasks pending
- **End-of-Day Lockout** — blocks quitting after 6 PM if daily score is below threshold
- **Recurrence Engine** — daily recurring tasks auto-expanded at midnight
- **System Tray** — live score display, color-coded by performance
- **Command Palette** — `Ctrl+K` / `⌘K` for all navigation and quick-start
- **Settings** — all forcing thresholds configurable; JSON data export

## Requirements

- Node.js 18+
- Windows / macOS / Linux
- Windows: Visual Studio Build Tools (for `better-sqlite3` native build)

## Setup

```bash
git clone <repo>
cd TaskForcer
npm install
npx @electron/rebuild   # rebuilds better-sqlite3 + active-win for your Electron version
```

## Development

```bash
npm run dev
```

Starts Vite on `localhost:5173` and launches Electron once the server is ready. The launch script (`scripts/launch-electron.js`) unsets `ELECTRON_RUN_AS_NODE` before spawning Electron — required when running inside VS Code.

## Build

```bash
npm run build           # compiles Vite + TypeScript electron
npm run dist            # packages for current platform
npm run dist:win        # NSIS installer (x64)
npm run dist:mac        # DMG (x64 + arm64)
npm run dist:linux      # AppImage (x64)
```

Packaged releases land in `release/`.

## File Paths

| Path | Contents |
|------|----------|
| `~/.taskforcer/taskforcer.db` | SQLite database (tasks, sessions, scores, shame log, settings) |
| `~/.taskforcer/state.json` | Morning popup last-shown date |
| `dist-electron/` | Compiled Electron main process (CJS) |
| `dist/` | Compiled Vite frontend |
| `release/` | electron-builder output |

## Architecture

```
src/
  main/           React app (main window)
    views/        TodayView, CalendarView, UpcomingView, StatsView, ShameLogView, SettingsView
    App.tsx
  components/     TaskCard, Sidebar, TitleBar, dialogs, CommandPalette
  hooks/          useTasks, useScore, useSettings
  lib/            ipc.ts (typed window.electron bridge), animations, utils
  morning/        Morning popup entry point
  widget/         Floating widget entry point
electron/
  main.ts         App entry, window creation, auto-launch
  db.ts           SQLite init + migrations, safeStorage helpers
  forcing.ts      Check-in schedule, idle detection, end-of-day lockout
  focus-tracker.ts Active-window polling
  scheduler.ts    node-schedule: midnight recurrence, 15-min notifications
  tray.ts         System tray with live score icon
  widget-window.ts Frameless always-on-top widget
  ipc/            tasks, shame, scores, settings IPC handlers
electron-preload/
  preload.ts      contextBridge — exposes window.electron.invoke/on/off/once
```

## Permissions (macOS)

- **Accessibility**: `active-win` reads the active window title. Grant in System Preferences → Privacy → Accessibility.
- **Notifications**: granted on first notification.
- **Login Items**: auto-launch toggle in Settings writes to Login Items via `auto-launch`.

## Uninstall

1. Quit TaskForcer
2. Delete the application bundle / exe
3. Remove app data:
   - Windows: `%USERPROFILE%\.taskforcer\`
   - macOS / Linux: `~/.taskforcer/`
4. macOS: remove from Login Items if auto-launch was enabled

## Caveats

- **VS Code terminal**: `scripts/launch-electron.js` removes `ELECTRON_RUN_AS_NODE` before spawning Electron because VS Code sets that variable, causing Electron to boot in plain Node.js mode.
- **Native modules**: `better-sqlite3` and `active-win` require `npx @electron/rebuild` after `npm install`. `electron-builder` with `asarUnpack` handles this automatically for packaged builds.
