import { apiRequest } from "./client";

export const getPublicFeed = (opts) => apiRequest("/public-feed", opts);

export const getWorkspace = (opts) => apiRequest("/department/workspace", opts);

// handler.py only reads name/field/school/avatarUrl/visibility from the body —
// avatarUrl is optional, set after a successful avatar upload (see gallery.js).
export const addIntern = ({ name, field, school, visibility, avatarUrl }, opts) =>
  apiRequest("/department/interns", {
    method: "POST",
    body: { name, field, school, visibility, avatarUrl },
    ...opts,
  });

export const deleteIntern = (id, opts) =>
  apiRequest(`/department/interns/${id}`, { method: "DELETE", ...opts });

// Partial update — only send fields that actually changed; backend ignores anything
// not in {name, field, school, avatarUrl}.
export const updateIntern = (id, updates, opts) =>
  apiRequest(`/department/interns/${id}`, { method: "PUT", body: updates, ...opts });

// Backend ignores everything but {id, visibility} — no "type" field needed,
// since the table stores PROFILE and PHOTO items with the same 'id' key.
export const setVisibility = ({ id, visibility }, opts) =>
  apiRequest("/department/visibility", { method: "PUT", body: { id, visibility }, ...opts });
