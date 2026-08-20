/**
 * Deliberately trivial token -> tenant mapping for the fixture.
 * `Authorization: Bearer token-a` resolves to tenant "a", `token-b` to
 * tenant "b", and so on. This is the ONLY source of truth for tenancy —
 * server code must never trust a client-supplied tenantId.
 */

const TOKEN_PATTERN = /^Bearer\s+token-([a-zA-Z0-9]+)$/;

export function tenantFromRequest(req) {
  const header = req.headers?.authorization;
  if (!header) return null;
  const match = TOKEN_PATTERN.exec(header.trim());
  return match ? match[1] : null;
}
