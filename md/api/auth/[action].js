import { handleAuthRequest } from "../../server/http/auth-controller.js";
import { apiHandler } from "../../server/http/response.js";
import { getRuntime } from "../../server/http/runtime.js";

const handler = apiHandler((request) => handleAuthRequest(request, getRuntime()));

export default { fetch: handler };
