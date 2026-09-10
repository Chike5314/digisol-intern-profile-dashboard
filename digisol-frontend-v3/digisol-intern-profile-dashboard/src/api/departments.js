import { API_URL, apiRequest } from "./client";

// Public route — no auth token, callable from the sign-up screen before the
// user has any session. Deliberately NOT using apiRequest (which always
// attaches a Cognito token) since this must work pre-authentication.
export async function fetchPublicDepartments() {
  const res = await fetch(`${API_URL}/departments`);
  if (!res.ok) throw new Error("Couldn't load the department list");
  return res.json();
}

export const registerDepartment = (opts) => apiRequest("/department/register", { method: "POST", ...opts });

export const requestMembership = (opts) => apiRequest("/department/membership-request", { method: "POST", ...opts });

export const getMyMembershipStatus = (opts) => apiRequest("/department/my-membership-status", opts);

export const getPendingMembers = (opts) => apiRequest("/department/pending-members", opts);

export const reviewPendingMember = (userId, status, opts) =>
  apiRequest(`/department/pending-members/${userId}`, { method: "PUT", body: { status }, ...opts });
