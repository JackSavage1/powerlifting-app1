const BASE = 'https://api.example.com/problems';

export function problem(status, title, detail) {
  return {
    type: `${BASE}/${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    status,
    detail: detail ?? title,
  };
}

export const P = {
  badRequest:     (detail) => problem(400, 'Bad Request', detail),
  unauthorized:   (detail) => problem(401, 'Unauthorized', detail ?? 'Missing or invalid token'),
  forbidden:      (detail) => problem(403, 'Forbidden', detail ?? 'Insufficient permissions'),
  notFound:       (detail) => problem(404, 'Not Found', detail),
  conflict:       (detail) => problem(409, 'Conflict', detail),
  unprocessable:  (detail) => problem(422, 'Unprocessable Entity', detail),
  internal:       ()       => problem(500, 'Internal Server Error', 'An unexpected error occurred'),
};
