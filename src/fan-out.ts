export interface FanOutConfig {
  maxConcurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}

export interface FanOutResult<T, R> {
  item: T;
  result: R | null;
  error?: string;
}

const DEFAULT_MAX_CONCURRENCY = 5;

export async function fanOut<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  config?: FanOutConfig,
): Promise<FanOutResult<T, R>[]> {
  if (items.length === 0) return [];

  const maxConcurrency = config?.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
  const results: FanOutResult<T, R>[] = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      const item = items[index]!;
      try {
        const result = await fn(item);
        results[index] = { item, result };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results[index] = { item, result: null, error: message };
      }
      completed++;
      config?.onProgress?.(completed, items.length);
    }
  }

  const workerCount = Math.min(maxConcurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}
