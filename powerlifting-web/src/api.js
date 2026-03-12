const BASE = '/api/v1';

function token() {
  return sessionStorage.getItem('access_token');
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token()) headers['Authorization'] = `Bearer ${token()}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.detail ?? data.title ?? 'Request failed'), { status: res.status, data });
  return data;
}

export const api = {
  // Auth
  register: (email, password, role) => req('POST', '/auth/register', { email, password, role }),
  login:    (email, password)       => req('POST', '/auth/login',    { email, password }),
  logout:   ()                      => req('POST', '/auth/logout'),

  // Users
  getUser:    (id)        => req('GET',   `/users/${id}`),
  updateUser: (id, patch) => req('PATCH', `/users/${id}`, patch),

  // Relationships
  getAthletes:     (coachId)               => req('GET',    `/coaches/${coachId}/athletes`),
  inviteAthlete:   (coachId, athleteEmail) => req('POST',   `/coaches/${coachId}/athletes`, { athleteEmail }),
  removeAthlete:   (coachId, athleteId)    => req('DELETE', `/coaches/${coachId}/athletes/${athleteId}`),
  getInvitations:  (userId)                => req('GET',    `/users/${userId}/invitations`),
  respondInvite:   (invId, action)         => req('PATCH',  `/invitations/${invId}`, { action }),
  getCoaches:      (userId)                => req('GET',    `/users/${userId}/coaches`),

  // Exercises
  getExercises: (isDefault) =>
    req('GET', `/exercises${isDefault !== undefined ? `?isDefault=${isDefault}` : ''}`),
  createExercise: (name) => req('POST', '/exercises', { name }),

  // Programs
  getPrograms:    ()          => req('GET',    '/programs'),
  createProgram:  (data)      => req('POST',   '/programs', data),
  getProgram:     (id)        => req('GET',    `/programs/${id}`),
  updateProgram:  (id, patch) => req('PATCH',  `/programs/${id}`, patch),
  deleteProgram:  (id)        => req('DELETE', `/programs/${id}`),
  getProgramDays: (id)        => req('GET',    `/programs/${id}/days`),
  createDay:      (id, data)  => req('POST',   `/programs/${id}/days`, data),
  updateDay:      (progId, dayId, data) => req('PATCH', `/programs/${progId}/days/${dayId}`, data),
  assignProgram:  (progId, data) => req('POST', `/programs/${progId}/assignments`, data),

  // Assignments
  getAssignments:      (userId)        => req('GET', `/users/${userId}/assignments`),
  getActiveAssignment: (userId)        => req('GET', `/users/${userId}/assignments/active`),

  // Sessions
  createSession: (data)          => req('POST',   '/sessions', data),
  getSessions:   (userId, limit) => req('GET',    `/users/${userId}/sessions?limit=${limit ?? 20}`),
  getSession:    (id)            => req('GET',    `/sessions/${id}`),
  updateSession: (id, patch)     => req('PATCH',  `/sessions/${id}`, patch),
  deleteSession: (id)            => req('DELETE', `/sessions/${id}`),

  // Sets
  createSet: (sessionId, data) => req('POST',   `/sessions/${sessionId}/sets`, data),
  updateSet: (sessionId, setId, data) => req('PATCH', `/sessions/${sessionId}/sets/${setId}`, data),
  deleteSet: (sessionId, setId) => req('DELETE', `/sessions/${sessionId}/sets/${setId}`),

  // PRs
  markPR:    (userId, setId)              => req('POST',   `/users/${userId}/prs`, { setId }),
  getPRs:    (userId)                     => req('GET',    `/users/${userId}/prs`),
  deletePR:  (userId, exerciseId)         => req('DELETE', `/users/${userId}/prs/${exerciseId}`),

  // Coach dashboard
  getAthleteSessions: (coachId, athleteId) =>
    req('GET', `/coaches/${coachId}/athletes/${athleteId}/sessions`),
  getCompliance: (coachId, athleteId, assignmentId) =>
    req('GET', `/coaches/${coachId}/athletes/${athleteId}/compliance?assignmentId=${assignmentId}`),
};
