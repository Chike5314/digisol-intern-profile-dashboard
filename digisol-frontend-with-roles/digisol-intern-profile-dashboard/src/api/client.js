import { fetchAuthSession } from "aws-amplify/auth";

export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error("VITE_API_URL is not set — copy .env.example to .env and fill it in.");
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getAuthToken() {
  const session = await fetchAuthSession({ forceRefresh: true });
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new ApiError("Your session has expired. Please sign in again.", 401);
  return token;
}

/**
 * Core request helper. The backend expects the raw idToken in the
 * Authorization header (no "Bearer " prefix) — matches handler.py's
 * requestContext.authorizer.claims extraction via the Cognito API Gateway authorizer.
 */
export async function apiRequest(path, { method = "GET", body, onSessionExpired } = {}) {
  const token = await getAuthToken();
  const headers = { Authorization: token };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    onSessionExpired?.();
    throw new ApiError("Your session expired. Please sign in again.", 401);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return null;
  return res.json();
}

export { ApiError };
