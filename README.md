# TaskForge

[![CI](https://github.com/mdaashir/TaskForge/actions/workflows/ci.yml/badge.svg?branch=base)](https://github.com/mdaashir/TaskForge/actions/workflows/ci.yml)

Task and project management for small teams: projects and tasks, threaded comments, attachments,
notifications, dashboards, Excel reports, an audit trail and nested workflows.

## Features

- **Projects** — owner and members, status, priority, progress, dates, tags.
- **Tasks** — per-project tasks with checklists, assignment, status and due dates.
- **Archive & restore** — soft-delete projects and tasks; archived projects' tasks are hidden by
  association and return when the project is restored.
- **User deactivation** — admins can archive an account; login, refresh and already-issued access
  tokens stop working until it is restored, while its data and references stay intact.
- **Session invalidation** — every token carries the user's `tokenVersion`; a password change or
  "sign out everywhere" revokes every previously issued access and refresh token.
- **Workflows** — nested containers that link projects; progress rolls up from them.
- **Comments** — one level of replies per task, with author/admin edit rules.
- **Attachments** — files on tasks, projects and comments, streamed through the API (never public
  URLs); deleting a comment removes its files.
- **Notifications** — one document per recipient, with an unread count and a bell in the layout.
- **Dashboards** — admin and member scopes, status breakdowns and overdue counts.
- **Reports** — server-generated `.xlsx` exports that reuse the list filters.
- **Audit log** — every create/update/delete for users, projects, tasks, comments, files and
  workflows, with changed-field diffs; admins can filter and page through them.

## Tech stack

| Layer    | Choices                                                                                  |
| -------- | ---------------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, axios, recharts               |
| Backend  | Node 26 (native TypeScript), Express 5, Mongoose 8, Zod, JWT, Multer, exceljs             |
| Storage  | MongoDB 7, any S3-compatible object store (MinIO in development)                          |
| Testing  | Vitest, supertest, Testing Library, jsdom                                                 |
| CI       | GitHub Actions — typecheck, lint, build and tests for both apps, with a Mongo 7 service   |

## Architecture

```
TaskForge/
├── Backend/
│   ├── src/
│   │   ├── app.ts            Express app (importable without listening)
│   │   ├── server.ts         Connects to Mongo and starts listening
│   │   ├── config/           Mongo and S3 clients
│   │   ├── controllers/      HTTP status mapping only
│   │   ├── middlewares/      Auth guard, Zod validation, Multer upload
│   │   ├── models/           Mongoose schemas
│   │   ├── routes/           One router per module
│   │   ├── schemas/          Zod request bodies
│   │   ├── services/         Business logic and access rules
│   │   └── utils/            Access helpers, JWT, profile images
│   └── tests/                Unit + integration tests against a real MongoDB
├── Frontend/
│   └── src/
│       ├── components/       Layout, notification bell, attachments, comments
│       ├── context/          Auth provider and hook
│       ├── pages/            Admin, user, project, task and workflow screens
│       ├── routes/           Role-aware private route
│       └── utils/            API client, paths, formatting helpers
└── docker-compose.yml        MongoDB + MinIO (+ bucket creation)
```

**Auth model.** A 15-minute access JWT is returned in the login/refresh response body and kept in
memory by the SPA (never `localStorage`). A 7-day refresh JWT lives in an `httpOnly`,
`SameSite=strict` cookie scoped to the refresh path and is rotated on every refresh. The axios
client retries a `401` once after refreshing. Both tokens carry the user's `tokenVersion`; bumping
it (password change or sign out everywhere) invalidates every session immediately.

**Layering.** Routes validate and delegate; controllers only map results to status codes; services
own the business rules and call the access helpers. Derived arrays (`Project.tasks`,
`Task.attachments`, `Task.comments`, `Workflow.children`) are maintained explicitly by the services.

## Roles and permissions

Three member types exist: `ADMIN`, `USER` and `VIEWER`.

| Area          | View                              | Create / edit                                        | Delete                                     |
| ------------- | --------------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| Users         | admin                             | admin                                                | admin                                      |
| Projects      | owner, members, admin             | owner, members, admin (only admin changes `owner`)    | owner, admin                               |
| Tasks         | project members, admin            | members create; creator or admin updates             | creator, admin                             |
| Comments      | project members, admin            | members post; author or admin edits                  | author, admin                              |
| Attachments   | project members, admin            | project members                                      | uploader, admin                            |
| Workflows     | owner, members, admin             | owner, members, admin (only admin changes `owner`)    | owner, admin — blocked while children exist |
| Notifications | own only                          | own (mark seen)                                      | —                                          |
| Audit log     | admin                             | —                                                    | —                                          |

Workflow membership does **not** grant project access; a linked project's own rules still apply.

Archive and restore use the same permission as delete in each area: projects by the owner or an
admin, tasks by the creator or an admin, users by an admin (an admin cannot archive their own
account). Archived records are hidden by default; list endpoints accept `archived=archived` or
`archived=all`.

## Getting started

### Prerequisites

- **Node 26** — the backend runs `.ts` files directly, with no build step.
- **Docker** — for MongoDB and MinIO.
- npm 10+.

### 1. Install dependencies

```bash
(cd Backend && npm install)
(cd Frontend && npm install)
```

### 2. Configure the backend

```bash
cd Backend
cp .env.example .env
```

Then replace the two JWT secrets with random values:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

The frontend works without a `.env`; it defaults to `http://localhost:8000/api`. Copy
`Frontend/.env.example` to `Frontend/.env` only if your API runs elsewhere.

### 3. Start MongoDB and MinIO

```bash
docker compose up -d
```

This starts MongoDB on `27017`, MinIO on `9000` (console on `9001`) and creates the
`taskforge-attachments` bucket. MinIO credentials are `minioadmin` / `minioadmin`.

### 4. Run the API

```bash
cd Backend
npm run dev
```

The API listens on `http://localhost:8000/api` (override with `PORT`).

### 5. Run the web app

```bash
cd Frontend
npm run dev
```

Vite serves the app on `http://localhost:5173`, which is the backend's default CORS origin.

Register an account in the UI, then promote it to admin in MongoDB to reach the admin screens:

```bash
docker compose exec mongo mongosh taskforge --eval \
  'db.users.updateOne({ email: "you@example.com" }, { $set: { memberType: "ADMIN" } })'
```

## Environment variables

### Backend (`Backend/.env`)

| Variable               | Default                                   | Purpose                                          |
| ---------------------- | ----------------------------------------- | ------------------------------------------------ |
| `PORT`                 | `8000`                                    | HTTP port                                        |
| `PREFIX`               | `/api`                                    | Base path for every route                        |
| `NODE_ENV`             | `development`                             | `production` makes the refresh cookie `secure`   |
| `CLIENT_URL`           | `http://localhost:5173`                   | Allowed CORS origin (credentials enabled)        |
| `MONGO_URI`            | —                                         | MongoDB connection string                        |
| `JWT_SECRET`           | —                                         | Signs 15-minute access tokens                    |
| `REFRESH_TOKEN_SECRET` | —                                         | Signs 7-day refresh tokens                       |
| `S3_ENDPOINT`          | `http://127.0.0.1:9000`                   | S3-compatible endpoint                           |
| `S3_REGION`            | `us-east-1`                               | S3 region                                        |
| `S3_BUCKET`            | `taskforge-attachments`                   | Attachment bucket                                |
| `S3_ACCESS_KEY`        | —                                         | Storage access key (attachments fail without it) |
| `S3_SECRET_KEY`        | —                                         | Storage secret key                               |
| `MONGO_URI_TEST`       | `mongodb://127.0.0.1:27017/taskforge_test`| Test database; must end in `_test`               |

### Frontend (`Frontend/.env`)

| Variable       | Default                     | Purpose          |
| -------------- | --------------------------- | ---------------- |
| `VITE_API_URL` | `http://localhost:8000/api` | Backend API base |

## Scripts

### Backend

| Command              | What it does                                 |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Nodemon + Node 26 on `src/server.ts`         |
| `npm start`          | Node 26 on `src/server.ts`                   |
| `npm run build`      | Typecheck (`tsc --noEmit`)                   |
| `npm run lint`       | ESLint over `src`                            |
| `npm test`           | Vitest (81 tests, needs MongoDB + MinIO)     |
| `npm run test:watch` | Vitest in watch mode                         |

### Frontend

| Command              | What it does                                 |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Vite dev server on `5173`                    |
| `npm run build`      | Typecheck and production build into `dist/`  |
| `npm run lint`       | ESLint over the project                      |
| `npm test`           | Vitest + Testing Library (16 tests)          |
| `npm run test:watch` | Vitest in watch mode                         |

## API overview

All routes are mounted under `PREFIX` (`/api` by default).

| Method | Path                                 | Access                   | Purpose                                   |
| ------ | ------------------------------------ | ------------------------ | ----------------------------------------- |
| POST   | `/auth/register`                     | public                   | Create an account, return an access token |
| POST   | `/auth/login`                        | public                   | Sign in, return an access token           |
| POST   | `/auth/refresh`                      | refresh cookie           | Rotate the cookie, return a new token     |
| POST   | `/auth/logout`                       | public                   | Clear the refresh cookie                 |
| POST   | `/auth/logout-all`                   | authenticated            | Revoke every session for the user        |
| GET    | `/auth/profile`                      | authenticated            | Current user                              |
| PUT    | `/auth/profile`                      | authenticated            | Update own profile                        |
| GET    | `/auth/profile/image/:value`         | public                   | Generated SVG avatar                      |
| GET    | `/dashboard`                         | authenticated            | Totals, status buckets, recent tasks      |
| GET    | `/users/options`                     | authenticated            | Lightweight user list for pickers         |
| GET    | `/users`, `/users/:id`               | admin                    | List and read users                       |
| POST   | `/users`                             | admin                    | Create a user                             |
| PUT    | `/users/:id`                         | admin                    | Update a user                             |
| PUT    | `/users/:id/archive`                 | admin                    | Deactivate a user                         |
| PUT    | `/users/:id/restore`                 | admin                    | Reactivate a user                         |
| DELETE | `/users/:id`                         | admin                    | Delete a user                             |
| GET    | `/projects`, `/projects/:id`         | authenticated (filtered) | Visible projects                          |
| POST   | `/projects`                          | authenticated            | Create a project                          |
| PUT    | `/projects/:id`                      | owner, member, admin     | Update a project                          |
| PUT    | `/projects/:id/archive`              | owner, admin             | Archive a project                         |
| PUT    | `/projects/:id/restore`              | owner, admin             | Restore an archived project               |
| DELETE | `/projects/:id`                      | owner, admin             | Delete a project                          |
| GET    | `/tasks`, `/tasks/mine`, `/tasks/:id`| authenticated (filtered) | Visible / assigned tasks                  |
| POST   | `/tasks`                             | project members          | Create a task                             |
| PUT    | `/tasks/:id`                         | creator, admin           | Update a task                             |
| PUT    | `/tasks/:id/archive`                 | creator, admin           | Archive a task                            |
| PUT    | `/tasks/:id/restore`                 | creator, admin           | Restore an archived task                  |
| DELETE | `/tasks/:id`                         | creator, admin           | Delete a task                             |
| GET    | `/workflows`, `/workflows/:id`       | authenticated (filtered) | Visible workflows                         |
| POST   | `/workflows`                         | authenticated            | Create a workflow                         |
| PUT    | `/workflows/:id`                     | owner, member, admin     | Update a workflow                         |
| DELETE | `/workflows/:id`                     | owner, admin             | Delete (blocked with children)            |
| GET    | `/comments/tasks/:taskId`            | project members          | Threaded comments for a task              |
| POST   | `/comments/tasks/:taskId`            | project members          | Add a comment or reply                    |
| PUT    | `/comments/:id`                      | author, admin            | Edit a comment                            |
| DELETE | `/comments/:id`                      | author, admin            | Delete a comment and its replies          |
| POST   | `/files/tasks/:taskId`               | project members          | Upload a task attachment                  |
| GET    | `/files/tasks/:taskId`               | project members          | List task attachments                     |
| POST   | `/files/projects/:projectId`         | project members          | Upload a project attachment               |
| GET    | `/files/projects/:projectId`         | project members          | List project attachments                 |
| POST   | `/files/comments/:commentId`         | project members          | Upload a comment attachment              |
| GET    | `/files/comments/:commentId`         | project members          | List comment attachments                 |
| GET    | `/files/:id`                         | project members          | Download an attachment                   |
| DELETE | `/files/:id`                         | uploader, admin          | Delete an attachment                      |
| GET    | `/notifications`                     | authenticated            | Own notifications (`limit`, `unread`)     |
| GET    | `/notifications/unread-count`        | authenticated            | Unread count                              |
| PUT    | `/notifications/seen-all`            | authenticated            | Mark all as seen                          |
| PUT    | `/notifications/:id/seen`            | authenticated            | Mark one as seen                          |
| GET    | `/reports/tasks`                     | authenticated            | `.xlsx` task export                       |
| GET    | `/reports/projects`                  | authenticated            | `.xlsx` project export                    |
| GET    | `/audit`                             | admin                    | Audit entries (`entity`, `action`, `page`)|

## Tests

The backend suite runs against a real MongoDB **and MinIO**, never mocks:

```bash
docker compose up -d          # MongoDB + MinIO (+ the attachments bucket)
cd Backend && npm test
```

The attachment tests use the `S3_*` variables; `Backend/.env.example` already contains working
values for the compose stack. It uses `MONGO_URI_TEST` (default
`mongodb://127.0.0.1:27017/taskforge_test`) and refuses to clear any database whose name does not
end in `_test`. The API app is imported directly (`src/app.ts`), so no port is opened during tests.

```bash
cd Frontend && npm test
```

CI (`.github/workflows/ci.yml`) runs on every push to `base` and every PR into `base`: the backend
job starts MongoDB and MinIO, then runs typecheck (including tests), lint and the suite; the
frontend job runs lint, build and its suite.

### Dependency audit

Both apps are checked for known production advisories, locally and in CI:

```bash
npm audit --omit=dev --audit-level=critical
```

One moderate advisory remains in the backend (`uuid` through `exceljs` 4.x); the only automated
fix downgrades `exceljs` to 3.4.0, so it is deliberately left in place. All high and critical
production advisories are cleared in both apps.

## Notes

- Attachments are proxied through the API, so project access is always checked and no bucket CORS
  is needed.
- Comment attachments are stored with `commentId` and `projectId` (no `taskId`), so they never
  appear in task or project attachment lists. Deleting a comment removes its files; storage cleanup
  is best-effort and never blocks the delete.
- Reports reuse the same filter builders as the list endpoints, so screen and export cannot drift.
- Archiving is a soft delete: the record and its data stay in MongoDB, and the list endpoints hide
  it unless `archived=archived` or `archived=all` is passed. Archiving a project does not write
  anything to its tasks — they are hidden because their project is archived.
- An archived user cannot log in or refresh, and an access token issued before the archive is
  rejected on its next request: the auth middleware reloads the user from MongoDB every time.
- Changing a password (self or through an admin) bumps the token version, so every existing access
  and refresh token stops working — including the session that made the change. A single `logout`
  only clears the current device's cookie; use `logout-all` to revoke other devices.
- There are no coverage thresholds and no app Dockerfiles yet; the compose file is for local
  dependencies only.
- `File.commentId` exists in the schema, but comment attachments are not wired up in the API or UI.
