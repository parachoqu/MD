import {
  buildContentSeed,
  buildEventsSeed,
  buildMediaSeed,
  buildProjectsSeed,
  buildSettingsSeed,
} from "../admin/js/data/admin-seed.js";

export function currentSeedData() {
  return {
    events: buildEventsSeed(),
    projects: buildProjectsSeed(),
    content: buildContentSeed(),
    settings: buildSettingsSeed(),
    media: buildMediaSeed(),
  };
}

export function contentSeedPage(pageId) {
  return currentSeedData().content[pageId] || null;
}
