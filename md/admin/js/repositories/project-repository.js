// Repositorio de projetos institucionais. Estado interno = array persistido em
// md.admin.projects.v1, semeado a partir de uma copia manual de js/projects.js
// (ver admin-seed.js). Cada projeto ganha, so no admin, `editorialStatus` e
// `order` (usado pela reordenacao por botoes "mover para cima/baixo").

import { localStore, withLatency } from "../storage-adapter.js";
import { STORAGE_KEYS } from "../data/admin-seed.js";
import { clone, generateId } from "../utils.js";
import { ok, fail, failValidation } from "../result.js";
import { record } from "./activity-repository.js";

export const PROJECT_CATEGORIES = ["empresas", "escolas", "comunidades"];

function readAll() {
  return localStore.read(STORAGE_KEYS.projects, []);
}

function writeAll(list) {
  const sorted = list.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  localStore.write(STORAGE_KEYS.projects, sorted);
}

function findIndex(list, id) {
  return list.findIndex((project) => project.id === id);
}

export function validateProject(data) {
  const errors = [];
  if (!data.title || !String(data.title).trim()) {
    errors.push({ field: "title", message: "Informe o título do projeto." });
  }
  if (!data.category || !PROJECT_CATEGORIES.includes(data.category)) {
    errors.push({ field: "category", message: "Selecione uma categoria válida." });
  }
  if ((data.mediaId || data.image) && !data.imageAlt) {
    errors.push({ field: "imageAlt", message: "Informe o texto alternativo da imagem." });
  }
  return errors;
}

export const projectRepository = {
  async list(filters) {
    return withLatency(() => {
      const f = filters || {};
      let items = readAll().map(clone).sort((a, b) => (a.order || 0) - (b.order || 0));
      if (f.query) {
        const q = String(f.query).toLowerCase();
        items = items.filter((project) =>
          [project.title, project.description, project.note].filter(Boolean).some((text) => text.toLowerCase().includes(q))
        );
      }
      if (f.category) items = items.filter((project) => project.category === f.category);
      if (f.editorialStatus) items = items.filter((project) => project.editorialStatus === f.editorialStatus);
      return ok(items);
    });
  },

  async getById(id) {
    return withLatency(() => {
      const found = readAll().find((project) => project.id === id);
      return found ? ok(clone(found)) : fail("not_found", "Projeto não encontrado.");
    });
  },

  async create(data) {
    return withLatency(() => {
      const list = readAll();
      const errors = validateProject(data);
      if (errors.length) return failValidation(errors);
      const now = new Date().toISOString();
      const project = Object.assign({}, clone(data), {
        id: generateId("proj"),
        order: list.length,
        editorialStatus: "draft",
        createdAt: now,
        updatedAt: now,
      });
      list.push(project);
      writeAll(list);
      record({ domain: "projects", action: "create", label: "Projeto criado: " + project.title });
      return ok(clone(project));
    });
  },

  async update(id, data) {
    return withLatency(() => {
      const list = readAll();
      const index = findIndex(list, id);
      if (index === -1) return fail("not_found", "Projeto não encontrado.");
      const errors = validateProject(Object.assign({}, list[index], data));
      if (errors.length) return failValidation(errors);
      const updated = Object.assign({}, list[index], clone(data), {
        id: list[index].id,
        editorialStatus: list[index].editorialStatus,
        order: list[index].order,
        createdAt: list[index].createdAt,
        updatedAt: new Date().toISOString(),
      });
      list[index] = updated;
      writeAll(list);
      record({ domain: "projects", action: "update", label: "Projeto atualizado: " + updated.title });
      return ok(clone(updated));
    });
  },

  async duplicate(id) {
    return withLatency(() => {
      const list = readAll();
      const source = list.find((project) => project.id === id);
      if (!source) return fail("not_found", "Projeto não encontrado.");
      const now = new Date().toISOString();
      const duplicated = clone(source);
      duplicated.id = generateId("proj");
      duplicated.title = source.title + " (cópia)";
      duplicated.editorialStatus = "draft";
      duplicated.order = list.length;
      duplicated.createdAt = now;
      duplicated.updatedAt = now;
      list.push(duplicated);
      writeAll(list);
      record({ domain: "projects", action: "duplicate", label: "Projeto duplicado: " + duplicated.title });
      return ok(clone(duplicated));
    });
  },

  async archive(id) {
    return withLatency(() => {
      const list = readAll();
      const index = findIndex(list, id);
      if (index === -1) return fail("not_found", "Projeto não encontrado.");
      list[index] = Object.assign({}, list[index], { editorialStatus: "archived", updatedAt: new Date().toISOString() });
      writeAll(list);
      record({ domain: "projects", action: "archive", label: "Projeto arquivado: " + list[index].title });
      return ok(clone(list[index]));
    });
  },

  async delete(id) {
    return withLatency(() => {
      const list = readAll();
      const index = findIndex(list, id);
      if (index === -1) return fail("not_found", "Projeto não encontrado.");
      const removed = list.splice(index, 1)[0];
      list.forEach((project, position) => {
        project.order = position;
      });
      writeAll(list);
      record({ domain: "projects", action: "delete", label: "Projeto excluído: " + removed.title });
      return ok(true);
    });
  },

  // Extensao ao contrato minimo: troca a posicao do projeto com o vizinho
  // imediato (direction: "up"|"down"), usada pelos botoes "Mover para cima/baixo"
  // -- a tarefa exige reordenacao sem depender de arrastar.
  async reorder(id, direction) {
    return withLatency(() => {
      const list = readAll().sort((a, b) => (a.order || 0) - (b.order || 0));
      const index = findIndex(list, id);
      if (index === -1) return fail("not_found", "Projeto não encontrado.");
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return ok(list.map(clone));
      const currentOrder = list[index].order;
      list[index].order = list[targetIndex].order;
      list[targetIndex].order = currentOrder;
      writeAll(list);
      record({ domain: "projects", action: "reorder", label: "Ordem de projetos alterada" });
      return ok(readAll().sort((a, b) => (a.order || 0) - (b.order || 0)).map(clone));
    });
  },
};
