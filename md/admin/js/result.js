// Formato de retorno padronizado usado por todos os repositorios, simulando o
// formato que uma API real devolveria (facilita a troca futura por fetch()).

export function ok(data) {
  return { ok: true, data };
}

export function fail(code, message, field) {
  return { ok: false, error: { code, message, field: field || null } };
}

// Usado quando a validacao de um formulario encontra varios campos invalidos
// de uma vez -- a view usa `errors` para marcar cada campo e focar o primeiro.
export function failValidation(errors) {
  return { ok: false, error: { code: "validation_error", message: "Corrija os campos indicados.", errors } };
}
