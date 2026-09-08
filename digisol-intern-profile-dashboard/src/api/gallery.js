// src/api/gallery.js
import { apiClient } from './client';

export const getPublicFeed = () => apiClient('/photos/public');
export const getDepartmentWorkspace = () => apiClient('/photos/department');
export const publishPhoto = (photoId) => apiClient(`/photos/${photoId}/publish`, { method: 'PUT' });
export const getUploadPresignedUrl = (payload) => apiClient('/photos/department', {
  method: 'POST',
  body: JSON.stringify(payload),
});