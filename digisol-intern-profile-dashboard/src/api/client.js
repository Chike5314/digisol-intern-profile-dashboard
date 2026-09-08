// src/api/client.js
import { fetchAuthSession } from 'aws-amplify/auth';

const RAW_URL = import.meta.env.VITE_API_URL || 'https://56rud9cawg.execute-api.us-east-1.amazonaws.com/prod';
export const BASE_URL = RAW_URL.replace(/\/+$/, '');

export async function apiClient(endpoint, options = {}) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: token } : {}),
    ...options.headers,
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${BASE_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}