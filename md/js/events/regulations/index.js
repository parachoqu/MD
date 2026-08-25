import { renderTacaValeHandebolRegulation } from "./taca-vale-handebol-2026.js";

const REGULATION_RENDERERS = new Map([
  ["taca-vale-handebol-2026", renderTacaValeHandebolRegulation],
]);

/**
 * Resolve um documento oficial por identificador sem aplicar fallback
 * silencioso. Eventos sem módulo registrado permanecem em estado pendente.
 */
export function getRegulationRenderer(id) {
  if (!id) return null;
  return REGULATION_RENDERERS.get(id) || null;
}
