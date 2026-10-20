# Windows icon visibility

## Launch

Double-click `Start-Natively.vbs` in the project root. It starts the built Electron executable directly with `NODE_ENV=production`; it does not run cmd.exe, npm, or a development server. Rebuild with `npm run build` followed by `npm run build:electron` after source changes. A separately installed Natively executable is not updated by these builds.

Windows starts with Undetectable On and icons hidden. Ctrl+Alt+B (or its configured replacement) changes only tray/taskbar icons. The launcher and meeting UI show the configured shortcut and `Icons hidden: On/Off`. The ordinary visibility shortcut remains separate. The process remains visible in Task Manager. Existing pinned launch shortcuts are not removed.

## Validation — 2026-10-18

- Reviewed the supplied corrected ZIP and matched all 11 file guards before applying it. Pre-application copies of those files were saved outside the project in the task's `icon-fix-review/before` output folder.
- Renderer TypeScript check and production build: passed.
- Electron transpilation build: passed (existing CommonJS/import.meta warning in a golden test).
- BackgroundVisibility lifecycle suite: 3 tests passed.
- Real Electron integration checks: startup is Undetectable On, launcher visible, tray absent; both icon states preserve window visibility; launcher and meeting reminders update; a temporary configured shortcut updates both reminders and the original binding is restored; another shortcut moves the visible window while icons are hidden.
- Native Windows keypress checks: Ctrl+Alt+B from Chrome changes icon state; meeting UI stays visible; Ctrl+Shift+Right moves the meeting window while icons are hidden. Ctrl+Alt+B also works with the directly launched Natively window focused.
- Direct VBS launch: successful, no Natively cmd.exe launch chain. Final launcher is visible with `Icons hidden: On`.
- Task Manager: Electron process remains listed.
- Taskbar limitation: setSkipTaskbar is exercised in the real app, but an independent shell-level visual confirmation of the taskbar button was not available. A read-only extended-style probe did not distinguish the two states; it is not evidence of taskbar visibility.
- Meeting checks opened the meeting UI without starting a recording or testing transcription.
- Full Electron type checking still fails with six pre-existing errors: GeminiLiveRouter.ts:127 (`length` on `never`), ipcHandlers.ts:3439/3442 (`canceled`/`filePaths` on `string[]`), KnowledgeOrchestrator.ts:349/351 (`CompanyDossier` assigned to `null`). No claim of a clean full-project type check.
- Unrelated source and golden-test changes were preserved. Running the app rotated its existing debug logs.

## Repeat the real-app checks

Close Natively first, then run:

```powershell
node scripts/verify-windows-icons.cjs <output-directory>
```

Add `--native` to keep the app open for up to ten minutes for native-keypress checks. During that phase, an output-directory `control.json` containing `{"command":"overlay"}`, `{"command":"launcher"}`, or `{"command":"finish"}` selects a view or ends the test. Reports and renderer screenshots are written to the output directory. The test closes the app on completion and restores the original icon shortcut after its temporary rebind check.
