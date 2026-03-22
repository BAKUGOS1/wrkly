const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
  const headers = new Headers(options?.headers);
  
  // Only set Content-Type for non-FormData bodies (FormData needs browser to set multipart boundary)
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred while fetching data';
    try {
      const errorData = await response.json();
      // Backend sends { error: '...' } or { message: '...' }
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Ignore json parse error, use default message
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
