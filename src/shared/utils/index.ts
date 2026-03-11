let counter = 0;

export function generateId(): string {
  return `${Date.now()}-${++counter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * ユーザー操作起点のリトライ（最大2回、指数バックオフ）
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}
