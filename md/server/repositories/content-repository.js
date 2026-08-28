import { AppError } from "../http/errors.js";
import { createEditorialRepository } from "./editorial-repository.js";
import { createProjectRepository } from "./project-repository.js";
import { settingsDraftSchema, sitePageDraftSchema, SITE_PAGE_IDS } from "../validation/content.js";

export function createContentRepository(database) {
  const pages = createEditorialRepository(database, "site_pages", sitePageDraftSchema);
  const settings = createEditorialRepository(database, "site_settings", settingsDraftSchema);
  const projects = createProjectRepository(database);

  function assertPage(id) {
    if (!SITE_PAGE_IDS.has(id)) throw new AppError("NOT_FOUND", "Pagina de conteudo nao encontrada.", 404);
  }

  return {
    async getPage(id) {
      assertPage(id);
      return pages.getAdmin(id);
    },
    async updatePage(id, data, revision, actorUserId) {
      assertPage(id);
      return pages.update(id, data, revision, actorUserId);
    },
    async publishPage(id, revision, actorUserId) {
      assertPage(id);
      return pages.publish(id, revision, actorUserId);
    },
    async restorePage(id, data, revision, actorUserId) {
      assertPage(id);
      return pages.update(id, data, revision, actorUserId);
    },
    async getSettings() {
      return settings.getAdmin("global");
    },
    async updateSettings(data, revision, actorUserId) {
      return settings.update("global", data, revision, actorUserId);
    },
    async publishSettings(revision, actorUserId) {
      return settings.publish("global", revision, actorUserId);
    },
    async publicBootstrap() {
      const [pageRows, projectRows, setting] = await Promise.all([
        pages.listPublic(),
        projects.listPublic(),
        settings.getPublicById("global"),
      ]);
      const pageMap = Object.fromEntries(pageRows.map((page) => [page.id, page]));
      return {
        pages: pageMap,
        settings: setting,
        projects: projectRows,
      };
    },
    _pages: pages,
    _settings: settings,
  };
}
