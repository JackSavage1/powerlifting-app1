# Powerlifting App — Technical Design

## Stack

- **Database**: DataStax Astra DB (NoSQL Document API — Stargate JSON collections over Cassandra)
- **Backend**: REST API (see `openapi.yaml`)
- **Auth**: JWT (access token) + refresh token, stored server-side reference in `sessions` collection

---

## Astra DB Collections

Astra DB's Document API stores schemaless JSON documents. Each collection is analogous to a MongoDB collection. Primary access is by document ID (UUID) or secondary index via the Data API's `find` filter.

---

### Collection: `users`

Stores credentials and role. Profile data is embedded per role.

```json
{
  "_id": "uuid-v4",
  "email": "string (unique, indexed)",
  "passwordHash": "string (bcrypt)",
  "role": "athlete | coach",
  "createdAt": "ISO 8601",
  "profile": {
    // role = athlete
    "displayName": "string",
    "weightClass": "string | null",
    "dateOfBirth": "YYYY-MM-DD | null",

    // role = coach (same wrapper, different fields)
    "displayName": "string",
    "bio": "string | null"
  }
}
```

**Indexes**: `email` (unique)

---

### Collection: `relationships`

Manages coach-athlete invitations and active links.

```json
{
  "_id": "uuid-v4",
  "coachId": "users._id",
  "athleteId": "users._id",
  "status": "pending | active | declined | removed",
  "invitedAt": "ISO 8601",
  "resolvedAt": "ISO 8601 | null"
}
```

**Indexes**: `coachId`, `athleteId`, composite `(coachId, athleteId)` (unique active pair)

---

### Collection: `exercises`

Shared exercise library: system defaults (`isDefault: true`) and user-created customs.

```json
{
  "_id": "uuid-v4",
  "name": "string",
  "isDefault": true | false,
  "createdBy": "users._id | null",
  "createdAt": "ISO 8601"
}
```

**Indexes**: `isDefault`, `createdBy`

**Seed data** (isDefault: true):
Squat, Bench Press, Deadlift, Overhead Press, Romanian Deadlift, Barbell Row, Front Squat, Close-Grip Bench Press, Pause Squat, Pause Bench Press

---

### Collection: `programs`

Training programs authored by coaches.

```json
{
  "_id": "uuid-v4",
  "coachId": "users._id",
  "name": "string",
  "description": "string | null",
  "durationWeeks": "integer (≥ 1)",
  "daysPerWeek": "integer (1–7)",
  "status": "draft | published",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

**Indexes**: `coachId`, `status`

---

### Collection: `program_days`

One document per training day in a program. Each document embeds the ordered exercise slots for that day.

```json
{
  "_id": "uuid-v4",
  "programId": "programs._id",
  "weekNumber": "integer (1–N)",
  "dayNumber": "integer (1–7)",
  "slots": [
    {
      "slotId": "uuid-v4",
      "exerciseId": "exercises._id",
      "order": "integer",
      "targetSets": "integer",
      "targetReps": "integer",
      "targetWeightLbs": "float | null",
      "targetPercent1RM": "float | null",
      "targetRPE": "float (1–10) | null"
    }
  ],
  "updatedAt": "ISO 8601"
}
```

**Indexes**: `programId`, composite `(programId, weekNumber, dayNumber)` (unique)

---

### Collection: `assignments`

Records a program being assigned to an athlete with a start date.

```json
{
  "_id": "uuid-v4",
  "programId": "programs._id",
  "athleteId": "users._id",
  "coachId": "users._id",
  "startDate": "YYYY-MM-DD",
  "assignedAt": "ISO 8601",
  "status": "active | completed | cancelled"
}
```

**Indexes**: `athleteId`, `coachId`, `programId`, `status`

---

### Collection: `sessions`

One document per workout session per athlete.

```json
{
  "_id": "uuid-v4",
  "athleteId": "users._id",
  "date": "YYYY-MM-DD (indexed, unique per athleteId)",
  "status": "open | closed",
  "bodyweightLbs": "float | null",
  "assignmentId": "assignments._id | null",
  "programDayId": "program_days._id | null",
  "notes": "string | null",
  "createdAt": "ISO 8601",
  "closedAt": "ISO 8601 | null"
}
```

**Indexes**: `athleteId`, `date`, composite `(athleteId, date)` (unique), `assignmentId`

---

### Collection: `sets`

Individual sets logged within a session. Separate collection (not embedded in session) to support targeted updates and PR flagging.

```json
{
  "_id": "uuid-v4",
  "sessionId": "sessions._id",
  "athleteId": "users._id",
  "exerciseId": "exercises._id",
  "weightLbs": "float",
  "reps": "integer",
  "rpe": "float (1–10) | null",
  "rir": "integer (0–5) | null",
  "videoUrl": "string | null",
  "notes": "string | null",
  "order": "integer",
  "isPR": false,
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

**Indexes**: `sessionId`, `athleteId`, `exerciseId`, `isPR`

---

### Collection: `personal_records`

Current active PR per athlete per exercise. One document per `(athleteId, exerciseId)` pair. Updated (not inserted) when a new PR is marked.

```json
{
  "_id": "uuid-v4",
  "athleteId": "users._id",
  "exerciseId": "exercises._id",
  "setId": "sets._id",
  "sessionId": "sessions._id",
  "weightLbs": "float",
  "reps": "integer",
  "achievedAt": "YYYY-MM-DD"
}
```

**Indexes**: `athleteId`, `exerciseId`, composite `(athleteId, exerciseId)` (unique)

---

## Requirements → Collections Traceability

| REQ-ID  | Collections Touched |
|---------|---------------------|
| REQ-001 | `users` |
| REQ-002 | `users` |
| REQ-003 | `users` |
| REQ-004 | `users` |
| REQ-005 | `relationships` |
| REQ-006 | `exercises` |
| REQ-007 | `exercises` |
| REQ-008 | `programs` |
| REQ-009 | `programs`, `program_days` |
| REQ-010 | `assignments` |
| REQ-011 | `assignments`, `programs`, `program_days` |
| REQ-012 | `sessions` |
| REQ-013 | `sessions` |
| REQ-014 | `sets`, `sessions` |
| REQ-015 | `sets` |
| REQ-016 | `sessions` |
| REQ-017 | `sessions`, `sets` |
| REQ-018 | `sets`, `personal_records` |
| REQ-019 | `personal_records`, `exercises` |
| REQ-020 | `personal_records`, `relationships` |
| REQ-021 | `sessions`, `sets`, `relationships` |
| REQ-022 | `assignments`, `program_days`, `sessions` |

---

## Technical Requirements

### Backend

| Concern | Decision |
|---------|----------|
| Runtime | Node.js 20 LTS (TypeScript) or Python 3.12 (FastAPI) |
| Auth | JWT access token (15 min TTL) + refresh token (7 days), stored hash in `users` |
| Astra DB client | `@datastax/astra-db-ts` (Node) or `astrapy` (Python) |
| Password hashing | bcrypt, cost factor ≥ 12 |
| Validation | Zod (Node) or Pydantic v2 (Python) — validate all request bodies before DB write |
| Role enforcement | Middleware reads `role` from JWT claims; endpoints declare required role |
| Relationship guard | Middleware helper `assertCoachAthleteLink(coachId, athleteId)` — checks `relationships` collection for `status: "active"` before any cross-user read |
| Unique constraint emulation | Astra DB has no native unique constraint — enforce uniqueness at application layer with a `findOne` before insert, wrapped in try/catch |
| Pagination | Cursor-based (`pageState` token from Astra) on list endpoints, `limit` max 100 |
| Error format | RFC 7807 Problem Details (`application/problem+json`) |
| Logging | Structured JSON logs, include `requestId` on every log line |
| CORS | Whitelist frontend origin(s) only |
| Rate limiting | 60 req/min per IP on auth endpoints; 300 req/min per authenticated user |

### Frontend

| Concern | Decision |
|---------|----------|
| Framework | React 18 + TypeScript, or React Native if mobile-first |
| State management | TanStack Query for server state; Zustand or Context for auth/session state |
| Auth storage | Access token in memory only; refresh token in `httpOnly` cookie |
| Offline / optimistic UI | Optimistic set logging (add set to local state immediately, reconcile on response) |
| Forms | React Hook Form + Zod for client-side validation mirroring API schemas |
| Role-based routing | `ProtectedRoute` wrapper reads role from token claims and redirects unauthorized access |
| Program compliance view | Computed client-side by joining assignment start date + program day count with session `programDayId` list |
| PR detection | Backend sets `isPR` on flagged sets; frontend can additionally highlight any set that exceeds the current PR weight for that exercise (advisory only) |
| Video URLs | Validated as URL format client-side; rendered as a link or embedded preview (YouTube/Vimeo iframe) |
| Accessibility | WCAG 2.1 AA minimum; all form inputs labeled, keyboard navigable |

### Security

- All endpoints require `Authorization: Bearer <token>` except `POST /auth/register` and `POST /auth/login`
- Athletes can only read/write their own sessions and sets
- Coaches can only read (never write) athlete session/set/PR data
- Coaches can only manage athletes on their own roster (`relationships.coachId === coach._id`)
- Program edit/delete blocked if any active `assignments` reference the program
- Set edit/delete blocked if parent session `status === "closed"`
