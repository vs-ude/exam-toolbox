# Admin UI — Implementation Plan

Goal: add an `/admin` page (admins-only) with tabs for Users & Groups, Exams, Config, Health, and Storage. Built incrementally, one step per small agent/session.

Each step below is intended to be handed to a small agent as a self-contained task. Steps are ordered by dependency. Steps within the same number can be parallelized (disjoint files).

---

## Conventions to follow throughout

- Backend: extend `backend/src/api/admin.ts` (route defs) + a new `backend/src/examManager` or `backend/src/services` module for logic where appropriate. All handlers return `HandlerResult`, throw `HttpError` for expected failures. All new routes use `checkAdmin` middleware and `security: [{ Bearer: [] }]`.
- Shared types: any new DTOs shared between FE/BE go in `backend/src/types/shared/`, then run `tools/copy_shared_types.sh`. Admin-only DTOs that never reach generic exam/task logic may live directly in `backend/src/api/schemas.ts` (zod) if that's more consistent with existing admin routes (see `UserSchema` there).
- Frontend: new page component under `frontend/src/app/components/admin/` (e.g. `admin.component.ts`) using Angular Material Tabs. One child presentational component per tab under `frontend/src/app/components/admin/` (e.g. `admin-users-tab`, `admin-exams-tab`, `admin-config-tab`, `admin-health-tab`, `admin-storage-tab`), OR inline sections if small enough — decide per tab, but keep `admin.component.ts` itself thin (just the tab shell).
- All new admin API calls go through `ApiService` (`frontend/src/app/services/api.service.ts`) following its existing method patterns.
- New route `/admin` added to `app.routes.ts`, guarded by `authGuard` (already applied to the parent group) **and** a new `adminGuard` (frontend-only UX gate; backend already enforces via `checkAdmin`).
- No prettier-driven formatting worries — the user runs `prettier` separately. Don't hand-wrap lines for style.

---

## Step 0 — Clarified decisions (no implementation, read first)

- Disk size is reported **per path individually**: `paths.jobsDir`, `paths.cacheDir`, and the file-upload directory (`./uploads`, see `uploadFile` in `examManager.ts` — note this is currently a relative, unconfigured path; confirm/fix during Step 2 if needed, see note there).
- DB size: use MongoDB `dbStats()` total size only (no per-collection breakdown).
- Exam delete from the admin UI bypasses per-user `accessFilter` — admins can delete any exam unconditionally.
- Test-exam insertion **regenerates** a fresh exam every time (new `_id`, tasks re-created via `createExam`), and must also re-upload the referenced images from `testdata/img/` through the real upload pipeline so `fileTracker` entries and on-disk files exist and the exam's image URLs point at the newly-created files (not the stale hashes baked into `testdata/test-exam.json`).
- Admin can edit any exam's `access.users` / `access.groups` from the Exams tab.

---

## Step 1 — Backend: admin exam listing + delete + access editing

**Files:** `backend/src/services/db/exam.ts`, `backend/src/api/admin.ts`, `backend/src/api/schemas.ts` (if a new schema is needed), `backend/src/types/shared/stubs.ts` (if the stub needs a `taskCount` field).

1. Add `getAllExamsAdmin(this: ExamToolboxDatabase, sort?)` — returns **all** exams (no `accessFilter`), projected to a lightweight admin stub containing at least: `_id`, `courseName`, `semester`, `date`, `updatedAt`, `lastEditedBy`, `access`, and a computed task count (`tasks.reduce((n, g) => n + g.tasks.length, 0)`). Support sorting by date/owner/task count via a query param handled in the route (simplest: fetch all, sort in JS, since exam counts are small — confirm this is acceptable; don't prematurely build Mongo-side sort for a field that doesn't exist on documents, like task count).
2. Add `deleteExamAdmin(this: ExamToolboxDatabase, id: string)` — deletes by `_id` only, no access filter.
3. Add `setExamAccess(this: ExamToolboxDatabase, id: string, access: { users: string[]; groups?: string[] })` — updates just the `access` field of an exam, no ownership check.
4. New admin routes in `admin.ts`:
   - `GET /admin/exams` → `getAllExamsAdmin`.
   - `DELETE /admin/exams/:examId` → `deleteExamAdmin`.
   - `PUT /admin/exams/:examId/access` → body `{ users: string[], groups?: string[] }`, calls `setExamAccess`.
     All three behind `checkAdmin`.
5. Add/adjust `ExamStub`-like shared type if needed for the extra fields (task count). Prefer adding an `AdminExamStub` type in `backend/src/types/shared/stubs.ts`, then sync with `tools/copy_shared_types.sh`.

**Validation:** Deno unit test for `deleteExamAdmin`/`setExamAccess` next to `exam.ts` (follow existing test naming, e.g. look for `exam_test.ts` pattern elsewhere) if such tests exist for this module already; otherwise a minimal integration-style test matching existing conventions is enough. Run `deno test` for the touched files.

---

## Step 2 — Backend: test-exam seeding endpoint

**Files:** new `backend/src/services/testExamSeed.ts` (or similar), `backend/src/api/admin.ts`.

1. Load `testdata/test-exam.json` at request time (read + `JSON.parse`), deep-clone into an `Exam`-shaped object.
2. Strip the baked-in `_id`.
3. For each task with image fields (`questionPicture.url.A/B`, `solutionPicture.url.A/B` — confirm exact field shape by re-reading the full `test-exam.json` and the `Task`/image type in `backend/src/types/shared/tasks.ts`), re-upload the corresponding **source** file from `testdata/img/` (map old hash-named files to the real source filenames — note that the JSON currently references hashes that correspond to `testdata/img/{aufgabe,loesung,question,solution}.png`; confirm the correct mapping by comparing file content hashes before hardcoding it) through the **same logic `uploadFile` uses** (hash filename, write to upload dir, create a `fileTracker` entry), and rewrite the task's URL field to the newly generated path.
   - Important: don't shell out to the HTTP upload route internally; factor the core "store bytes + hash + fileTracker entry" logic out of `uploadFile` in `examManager.ts` into a reusable exported function (e.g. `storeUploadedFile(bytes, originalName, deps)`), and have both the HTTP handler and the seed script call it. This avoids duplicating hashing/storage logic.
   - **Note/fix opportunity:** `uploadFile` currently writes to a hardcoded relative `./uploads` dir rather than a configured path. Flag this to the user rather than silently changing it — the seed feature will reuse whatever path `uploadFile` resolves to, so if it's broken/relative-to-cwd, both are equally broken. Consider adding a `paths.uploadsDir` config entry as part of this step if it's cleanly scoped; otherwise leave a TODO and proceed with `./uploads`.
4. Call `db.createExam(exam, adminUser)` to insert with correct ownership/metadata (sets `lastEditedBy`, `updatedAt`, adds admin to `access.users`).
5. New route `POST /admin/seed/test-exam` → runs the above, returns the inserted exam id. Behind `checkAdmin`.

**Validation:** manual run via `deno task` / integration test if the project has a pattern for seeding tests; otherwise a straightforward unit test for `storeUploadedFile` and an integration test that seeds then fetches the exam and checks image URLs resolve to existing files on disk.

---

## Step 3 — Backend: storage size + DB size endpoint

**Files:** `backend/src/api/admin.ts`, possibly `backend/src/services/db/db.ts` (for a `dbStats()` wrapper), `backend/src/config/paths.ts` (expose `JOBS_DIR`, and uploads dir if addressed in Step 2).

1. Add a small helper (e.g. `backend/src/services/diskUsage.ts`) with `getDirSize(path: string): Promise<number>` that recursively sums file sizes (Deno `Deno.stat`/`Deno.readDir`, walk recursively — check if `@std/fs` `walk` is already a dependency, reuse it if so).
2. Add `ExamToolboxDatabase.getDbStats()` wrapping MongoDB's `db.stats()` (total `dataSize`/`storageSize`).
3. New route `GET /admin/storage` → returns `{ disk: { jobsDir: bytes, cacheDir: bytes, uploadsDir: bytes }, db: { dataSize, storageSize } }`. Behind `checkAdmin`.

**Validation:** unit test for `getDirSize` against a temp dir with known file sizes.

---

## Step 4 — Frontend: ApiService methods + shared types sync

**Files:** `frontend/src/app/services/api.service.ts`, run `tools/copy_shared_types.sh`.

1. Run the sync script first so new shared types (from Steps 1–3) land in `frontend/src/app/types/shared/`.
2. Add `ApiService` methods mirroring the new endpoints:
   - `getAdminExams()`, `deleteAdminExam(id)`, `setExamAccess(id, access)`
   - `seedTestExam()`
   - `getStorageInfo()`
   - (config/health already likely have methods — confirm `getConfig()`/`healthCheck()`/`syncUsers()` exist in `ApiService` already; if not, add them here too.)
3. Confirm existing `ApiService` methods for `GET /admin/config`, `GET /auth/...` user/group listing, `POST /admin/syncUsers`, `GET /health` — add any missing ones needed by the Users/Groups and Health tabs.

**Validation:** `ng build` or `tsc --noEmit` on the frontend to confirm types line up.

---

## Step 5 — Frontend: Admin page shell + routing + nav entry

**Files:** `frontend/src/app/components/admin/admin.component.{ts,html,scss}`, `app.routes.ts`, `frontend/src/app/guards/admin.guard.ts`, main nav component (find via the Shell section in `frontend/AGENTS.md` — likely `main-view` component).

1. Create `AdminComponent` as a standalone component with Angular Material `mat-tab-group`, 5 tabs (Users & Groups / Exams / Config / Health / Storage), each tab projecting a child component (created in later steps) via `*matTabContent` or eager — prefer `*matTabContent` lazy-loading since Config/Health/Storage fetch data on load.
2. Add `adminGuard` (checks decoded JWT `groups` for the configured admin group, or simpler: call `AuthService` if it already exposes `isAdmin()`/similar — check `AuthService` first; if it doesn't expose this, add a minimal `isAdmin()` getter there based on the same group list the backend checks, or just let the guard call `GET /admin/config` and redirect on 403 — simplest robust approach, avoid duplicating LDAP group config on the frontend).
3. Wire `{ path: 'admin', component: AdminComponent, canActivate: [adminGuard] }` into `app.routes.ts` inside the authenticated children.
4. Add a nav link to Admin in the main shell, visible only if `adminGuard`'s underlying check passes (reuse the same `isAdmin()` helper so logic isn't duplicated).

**Validation:** manual nav check in dev (`docker compose up --watch`), confirm non-admin users get redirected/hidden link.

---

## Step 6 — Frontend: Users & Groups tab

**Files:** `frontend/src/app/components/admin/admin-users-tab/*`.

1. On init, fetch users + groups (check what `AuthService`/`ApiService` already expose for listing all users/groups — e.g. `getAllUserStubs`-style endpoint; if no "list all users" endpoint exists yet for admins, note this as a gap and add a minimal `GET /admin/users/all` → `db.getAllUserStubs()`-equivalent-but-all (not just active) in a small follow-up to Step 1, since `getAllUserStubs` filters `active: true` — admins probably want to see deactivated ones too).
2. Render a table of users (uid, name, email, groups, active, lastLoginAt) and a table/list of groups.
3. "Refresh LDAP sync" button → `POST /admin/syncUsers`, show returned list / success snackbar, then re-fetch users.

**Validation:** manual check against the dev LDAP container.

---

## Step 7 — Frontend: Exams tab

**Files:** `frontend/src/app/components/admin/admin-exams-tab/*`, reuse `frontend/src/app/components/exams-table` if its column/sort patterns fit, otherwise build a small Material table directly.

1. Fetch `GET /admin/exams`, display sortable table (date, owner/`lastEditedBy`, task count), each row with a Delete button (confirmation via existing `delete-confirmation-dialog` component).
2. "Insert test exam" button → `POST /admin/seed/test-exam`, refresh list on success.
3. Access editing: an "Edit access" button per row opening a dialog (new small dialog component, e.g. `admin-exam-access-dialog`) with editable lists of user UIDs and group names, saving via `PUT /admin/exams/:id/access`. Check whether `exam-setup-dialog` or similar already has UI for entering user/group access on exam creation — reuse its form controls/validators if present instead of reinventing.

**Validation:** manual check: seed a test exam, confirm it appears, edit its access, delete it.

---

## Step 8 — Frontend: Config, Health, Storage tabs

**Files:** `frontend/src/app/components/admin/admin-config-tab/*`, `admin-health-tab/*`, `admin-storage-tab/*`.

1. Config tab: fetch `GET /admin/config`, render as a read-only formatted tree/JSON view (already redacted server-side — no extra redaction needed client-side).
2. Health tab: fetch `GET /health`, show DB/LDAP status with simple pass/fail indicators; add a manual refresh button.
3. Storage tab: fetch `GET /admin/storage`, show disk usage per path and DB size, human-readable byte formatting (check if a byte-formatting pipe/util already exists in the frontend; add a tiny one if not).

**Validation:** manual check in dev.

---

## Step 9 — Final pass

1. Run `tools/copy_shared_types.sh` once more to confirm no drift.
2. `deno test` in `backend/` for touched modules.
3. Frontend `ng build` to catch type errors across all new components.
4. Manual end-to-end walkthrough of all 5 tabs as an admin user and as a non-admin user (expect redirect/403).
5. Update `backend/AGENTS.md` admin router table and `frontend/AGENTS.md` components list with the new additions.

---

## Open items to double check while implementing (don't guess silently — flag to the user if confirmed wrong)

- Exact shape of image fields on tasks (`questionPicture`/`solutionPicture`) — confirm against `backend/src/types/shared/tasks.ts` before writing Step 2's seeding logic.
- Whether `uploadFile`'s `./uploads` relative path is intentional or a latent bug; Step 2/3 both touch it.
- Whether an admin-equivalent of `getAllUserStubs` (including inactive users) already exists before adding a new route in Step 6.
- Whether `AuthService` already has an `isAdmin()`/role helper before adding one in Step 5.
