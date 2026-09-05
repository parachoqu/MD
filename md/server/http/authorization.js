import { forbiddenError } from "./errors.js";

export const ADMIN_ROLES = Object.freeze(["admin", "editor", "organizer"]);

export const PERMISSIONS = Object.freeze({
  CONTENT_MANAGE: "content:manage",
  REGISTRATIONS_READ: "registrations:read",
  REGISTRATIONS_WRITE: "registrations:write",
});

const NO_PERMISSION = Object.freeze([]);

// admin e editor mantem exatamente o alcance que ja tinham antes do RBAC;
// organizer nasce restrito as inscricoes.
// Map em vez de objeto para que nomes herdados do prototype nunca virem papel valido.
const ROLE_PERMISSIONS = new Map([
  ["admin", Object.freeze([PERMISSIONS.CONTENT_MANAGE, PERMISSIONS.REGISTRATIONS_READ, PERMISSIONS.REGISTRATIONS_WRITE])],
  ["editor", Object.freeze([PERMISSIONS.CONTENT_MANAGE, PERMISSIONS.REGISTRATIONS_READ, PERMISSIONS.REGISTRATIONS_WRITE])],
  ["organizer", Object.freeze([PERMISSIONS.REGISTRATIONS_READ, PERMISSIONS.REGISTRATIONS_WRITE])],
]);

export function permissionsForRole(role) {
  // Papel desconhecido nao recebe nada: falha fechada.
  return ROLE_PERMISSIONS.get(String(role || "")) || NO_PERMISSION;
}

export function can(session, permission) {
  return permissionsForRole(session?.role).includes(permission);
}

export function assertPermission(session, permission) {
  if (!can(session, permission)) throw forbiddenError();
}
