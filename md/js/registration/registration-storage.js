const DRAFTS_KEY = "md.registration.drafts.v1";
const REGISTRATIONS_KEY = "md.registrations.v1";

export function getDraft(eventSlug) {
  const drafts = getDrafts();
  return drafts[eventSlug] || null;
}

export function saveDraft(eventSlug, draft) {
  const drafts = getDrafts();
  drafts[eventSlug] = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  return write(DRAFTS_KEY, drafts);
}

export function deleteDraft(eventSlug) {
  const drafts = getDrafts();
  delete drafts[eventSlug];
  return write(DRAFTS_KEY, drafts);
}

export function getRegistrations() {
  const registrations = read(REGISTRATIONS_KEY, []);
  return Array.isArray(registrations) ? registrations : [];
}

export function saveRegistration(registration) {
  const registrations = getRegistrations();
  registrations.unshift(registration);
  return write(REGISTRATIONS_KEY, registrations);
}

export function getRegistrationsByEvent(eventSlug) {
  return getRegistrations().filter((registration) => registration.eventSlug === eventSlug);
}

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function getDrafts() {
  const drafts = read(DRAFTS_KEY, {});
  return drafts && typeof drafts === "object" && !Array.isArray(drafts) ? drafts : {};
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}
