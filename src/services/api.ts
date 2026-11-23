export interface ApiResponse<T> {
  data: T;
}

export async function get<T>(factory: () => T): Promise<ApiResponse<T>> {
  return Promise.resolve({ data: factory() });
}

/** Prefixo das rotas da API. Em desenvolvimento o Vite faz proxy de /api para o backend. */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api/v1';

/** Host exibido na barra de status (ex.: localhost:8080). */
export const API_HOST_LABEL: string = import.meta.env.VITE_API_HOST ?? 'localhost:8080';

const REQUEST_TIMEOUT_MS = 4000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  userId?: string;
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Requisição JSON para a API. A API ainda não usa JWT: o usuário é identificado
 * pelo header X-User-Id (UUID).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', userId, body, signal } = options;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (userId) headers['X-User-Id'] = userId;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(`A API respondeu ${response.status}.`, response.status);
    }

    if (response.status === 204) return undefined as T;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      // O servidor de desenvolvimento devolve index.html quando não há backend.
      throw new ApiError('A resposta da API não é JSON.');
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Não foi possível conectar à API.');
  } finally {
    window.clearTimeout(timeout);
  }
}
