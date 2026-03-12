# Powerlifting API — Implementation Todo

## Stack
- **Runtime**: Node.js 22 (ESM)
- **Framework**: Fastify 4
- **DB**: Astra DB (`@datastax/astra-db-ts` v2)
- **Auth**: `@fastify/jwt` + `@fastify/cookie` (httpOnly refresh token)
- **Password**: `bcryptjs`
- **Tests**: `node:test` + `node:assert`

---

## Tasks

### TASK-001 — Project setup ✅
- [x] Install deps: `fastify`, `@fastify/jwt`, `@fastify/cookie`, `bcryptjs`, `dotenv`
- [x] Create folder structure: `src/`, `src/routes/`, `src/plugins/`, `src/helpers/`, `test/`
- [x] `src/db.js` — Astra DB singleton
- [x] `src/helpers/problems.js` — RFC 7807 problem factory
- [x] `src/plugins/auth.js` — JWT plugin + `request.authenticate()` decorator
- [x] `src/app.js` — Fastify app builder
- [x] `src/server.js` — Entry point
- [x] `.env.example`

### TASK-002 — DB init + seed ✅
- [x] `src/init-db.js` — create all 9 collections (idempotent)
- [x] `src/seed.js` — insert 10 default exercises (idempotent)

### TASK-003 — Auth routes (REQ-001, REQ-002) ✅
- [x] `POST /api/v1/auth/register`
- [x] `POST /api/v1/auth/login`
- [x] `POST /api/v1/auth/logout`
- [x] `POST /api/v1/auth/token` (refresh)
- [x] `test/auth.test.js` — all passing

### TASK-004 — Users/Profile routes (REQ-003, REQ-004) ✅
- [x] `GET /api/v1/users/:userId`
- [x] `PATCH /api/v1/users/:userId`
- [x] `test/users.test.js` — all passing

### TASK-005 — Relationships routes (REQ-005) ✅
- [x] `GET /api/v1/coaches/:coachId/athletes`
- [x] `POST /api/v1/coaches/:coachId/athletes` (invite)
- [x] `DELETE /api/v1/coaches/:coachId/athletes/:athleteId`
- [x] `GET /api/v1/users/:userId/invitations`
- [x] `PATCH /api/v1/invitations/:invitationId`
- [x] `GET /api/v1/users/:userId/coaches`
- [x] `test/relationships.test.js` — all passing

### TASK-006 — Exercises routes (REQ-006, REQ-007) ✅
- [x] `GET /api/v1/exercises`
- [x] `POST /api/v1/exercises`
- [x] `GET /api/v1/exercises/:exerciseId`
- [x] `PATCH /api/v1/exercises/:exerciseId`
- [x] `DELETE /api/v1/exercises/:exerciseId`
- [x] `test/exercises.test.js` — all passing

### TASK-007 — Programs routes (REQ-008) ✅
- [x] `GET /api/v1/programs`
- [x] `POST /api/v1/programs`
- [x] `GET /api/v1/programs/:programId`
- [x] `PATCH /api/v1/programs/:programId`
- [x] `DELETE /api/v1/programs/:programId`
- [x] `test/programs.test.js` — all passing

### TASK-008 — Program Days routes (REQ-009) ✅
- [x] `GET /api/v1/programs/:programId/days`
- [x] `POST /api/v1/programs/:programId/days`
- [x] `GET /api/v1/programs/:programId/days/:dayId`
- [x] `PATCH /api/v1/programs/:programId/days/:dayId`
- [x] `test/program-days.test.js` — all passing

### TASK-009 — Assignments routes (REQ-010, REQ-011) ✅
- [x] `POST /api/v1/programs/:programId/assignments`
- [x] `GET /api/v1/users/:userId/assignments`
- [x] `GET /api/v1/users/:userId/assignments/active`
- [x] `test/assignments.test.js` — all passing

### TASK-010 — Sessions routes (REQ-012, REQ-013, REQ-016, REQ-017) ✅
- [x] `POST /api/v1/sessions`
- [x] `GET /api/v1/users/:userId/sessions`
- [x] `GET /api/v1/sessions/:sessionId`
- [x] `PATCH /api/v1/sessions/:sessionId`
- [x] `DELETE /api/v1/sessions/:sessionId`
- [x] `test/sessions.test.js` — all passing

### TASK-011 — Sets routes (REQ-014, REQ-015) ✅
- [x] `POST /api/v1/sessions/:sessionId/sets`
- [x] `PATCH /api/v1/sessions/:sessionId/sets/:setId`
- [x] `DELETE /api/v1/sessions/:sessionId/sets/:setId`
- [x] `test/sets.test.js` — all passing

### TASK-012 — Personal Records routes (REQ-018, REQ-019, REQ-020) ✅
- [x] `POST /api/v1/users/:userId/prs`
- [x] `GET /api/v1/users/:userId/prs`
- [x] `GET /api/v1/users/:userId/prs/:exerciseId`
- [x] `DELETE /api/v1/users/:userId/prs/:exerciseId`
- [x] `test/prs.test.js` — all passing

### TASK-013 — Coach Dashboard (REQ-021, REQ-022) ✅
- [x] `GET /api/v1/coaches/:coachId/athletes/:athleteId/sessions`
- [x] `GET /api/v1/coaches/:coachId/athletes/:athleteId/compliance`
- [x] `test/coach.test.js` — all passing

---

## Final Results

| Suite | Tests | Pass |
|---|---|---|
| auth | 10 | ✅ 10 |
| users | 8 | ✅ 8 |
| relationships | 12 | ✅ 12 |
| exercises | 12 | ✅ 12 |
| programs | 9 | ✅ 9 |
| program-days | 7 | ✅ 7 |
| assignments | 7 | ✅ 7 |
| sessions | 14 | ✅ 14 |
| sets | 8 | ✅ 8 |
| prs | 8 | ✅ 8 |
| coach | 7 | ✅ 7 |
| **TOTAL** | **102** | **✅ 102** |
