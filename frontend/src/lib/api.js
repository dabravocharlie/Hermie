import { useAuth } from "@clerk/clerk-react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// useApi() returns get/post/put/del helpers that automatically attach the
// signed-in user's Clerk token. Every request is therefore tied to one user,
// and the backend scopes all data by that user id.
export function useApi() {
  const { getToken } = useAuth();

  async function request(path, options = {}) {
    const token = await getToken();
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }
    return res.status === 204 ? null : res.json();
  }

  return {
    get: (p) => request(p),
    post: (p, body) => request(p, { method: "POST", body: JSON.stringify(body) }),
    put: (p, body) => request(p, { method: "PUT", body: JSON.stringify(body) }),
    del: (p) => request(p, { method: "DELETE" }),
  };
}
