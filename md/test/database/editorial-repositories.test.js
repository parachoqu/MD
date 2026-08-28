import assert from "node:assert/strict";
import test from "node:test";
import { events } from "../../data/events.js";
import { migrateDatabase } from "../../server/database/migrations.js";
import { createEventRepository } from "../../server/repositories/event-repository.js";
import { createProjectRepository } from "../../server/repositories/project-repository.js";
import { createTestDatabase } from "../helpers/pglite-database.js";

async function fixture(context) {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  return database;
}

const project = (title, category = "empresas") => ({
  category,
  title,
  status: "A validar",
  date: "A validar",
  description: `Descricao de ${title}`,
  note: "",
  image: "assets/img/generated/projeto-empresas-ficticio.webp",
  imageAlt: `Imagem demonstrativa de ${title}`,
  mediaId: null,
});

test("publicacao preserva snapshot enquanto o rascunho continua editavel", async (context) => {
  const database = await fixture(context);
  const repository = createEventRepository(database);
  const created = await repository.create(events[0], null, { id: events[0].id, slug: events[0].slug });

  assert.equal((await repository.listPublic()).length, 0);
  const published = await repository.publish(created.id, created.revision, null);
  assert.equal(published.editorialStatus, "published");
  assert.equal((await repository.getPublicBySlug(created.slug)).title, events[0].title);

  const changed = await repository.update(
    created.id,
    { ...published, title: "Titulo ainda em rascunho" },
    published.revision,
    null
  );
  assert.equal(changed.revision, published.revision + 1);
  assert.equal((await repository.getPublicBySlug(created.slug)).title, events[0].title);

  await repository.publish(created.id, changed.revision, null);
  assert.equal((await repository.getPublicBySlug(created.slug)).title, "Titulo ainda em rascunho");
});

test("revisao otimista recusa gravacao obsoleta", async (context) => {
  const database = await fixture(context);
  const repository = createEventRepository(database);
  const created = await repository.create(events[0], null, { id: events[0].id, slug: events[0].slug });
  const updated = await repository.update(created.id, { ...created, summary: "Resumo atualizado" }, created.revision, null);

  await assert.rejects(
    repository.update(created.id, { ...updated, summary: "Edicao concorrente" }, created.revision, null),
    (error) => error.code === "REVISION_CONFLICT" && error.status === 409
  );
});

test("duplicacao remove metadados internos e resolve slug", async (context) => {
  const database = await fixture(context);
  const repository = createEventRepository(database);
  const created = await repository.create(events[0], null, { id: events[0].id, slug: events[0].slug });
  const first = await repository.duplicate(created.id, null);
  const second = await repository.duplicate(created.id, null);

  assert.equal(first.slug, `${created.slug}-copia`);
  assert.equal(second.slug, `${created.slug}-copia-2`);
  assert.equal(first.editorialStatus, "draft");
  assert.equal(first.revision, 1);
  assert.equal(first.title.endsWith("(copia)"), true);
});

test("ordem publicada de projetos so muda depois de nova publicacao", async (context) => {
  const database = await fixture(context);
  const repository = createProjectRepository(database);
  const first = await repository.create(project("Primeiro"), null, { id: "project-first" });
  const second = await repository.create(project("Segundo", "escolas"), null, { id: "project-second" });
  await repository.publish(first.id, first.revision, null);
  await repository.publish(second.id, second.revision, null);

  const moved = await repository.reorder(second.id, "up", second.revision, null);
  assert.deepEqual((await repository.listPublic()).map((item) => item.id), [first.id, second.id]);

  await repository.publish(second.id, moved.revision, null);
  assert.deepEqual((await repository.listPublic()).map((item) => item.id), [second.id, first.id]);
});
