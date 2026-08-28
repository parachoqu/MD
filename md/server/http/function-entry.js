import { handleAdminRequest } from "./admin-controller.js";
import { handlePublicRequest } from "./public-controller.js";
import { apiHandler } from "./response.js";
import { getRuntime } from "./runtime.js";

export const adminFunction = {
  fetch: apiHandler((request) => handleAdminRequest(request, getRuntime())),
};

export const publicFunction = {
  fetch: apiHandler((request) => handlePublicRequest(request, getRuntime())),
};
