export interface FanOutResult<T, R> {
  item: T;
  result: R | null;
  error?: string;
}

const DEFAULT_MAX_CONCURRENCY = 5;

export async function fanOut<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  maxConcurrency = DEFAULT_MAX_CONCURRENCY,
): Promise<FanOutResult<T, R>[]> {
  if (items.length === 0) return [];

  const results: FanOutResult<T, R>[] = new Array(items.length);
  let nextIndex = 0;

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
    }
  }

  const workerCount = Math.min(maxConcurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}
