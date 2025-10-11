const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export async function apiRequest(path, { token, headers = {}, ...options } = {}) {
  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: requestHeaders,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    // Ignore JSON parse errors for empty responses
  }

  if (!response.ok) {
    const message = payload?.message || "Request failed";
    const errors = payload?.errors;
    const error = new Error(message);
    error.details = errors;
    error.status = response.status;
    throw error;
  }

  return payload;
}
