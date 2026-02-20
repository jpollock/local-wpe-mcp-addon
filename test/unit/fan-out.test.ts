import { describe, it, expect } from 'vitest';
import { fanOut } from '../../src/fan-out.js';

describe('fanOut', () => {
  it('executes function for each item', async () => {
    const results = await fanOut([1, 2, 3], async (n) => n * 2);
    expect(results).toEqual([
      { item: 1, result: 2 },
      { item: 2, result: 4 },
      { item: 3, result: 6 },
    ]);
  });

  it('respects maxConcurrency', async () => {
    let maxConcurrent = 0;
    let current = 0;

    const results = await fanOut(
      Array.from({ length: 20 }, (_, i) => i),
      async (n) => {
        current++;
        if (current > maxConcurrent) maxConcurrent = current;
        await new Promise((r) => setTimeout(r, 10));
        current--;
        return n;
      },
      3,
    );

    expect(maxConcurrent).toBeLessThanOrEqual(3);
    expect(results).toHaveLength(20);
    expect(results.every((r) => r.result !== null)).toBe(true);
  });

  it('handles partial failures', async () => {
    const results = await fanOut([1, 2, 3], async (n) => {
      if (n === 2) throw new Error('fail on 2');
      return n;
    });

    expect(results[0]).toEqual({ item: 1, result: 1 });
    expect(results[1]).toEqual({ item: 2, result: null, error: 'fail on 2' });
    expect(results[2]).toEqual({ item: 3, result: 3 });
  });

  it('handles empty input', async () => {
    const results = await fanOut([], async (n: number) => n);
    expect(results).toEqual([]);
  });

  it('defaults maxConcurrency to 5', async () => {
    let maxConcurrent = 0;
    let current = 0;

    await fanOut(
      Array.from({ length: 15 }, (_, i) => i),
      async (n) => {
        current++;
        if (current > maxConcurrent) maxConcurrent = current;
        await new Promise((r) => setTimeout(r, 10));
        current--;
        return n;
      },
    );

    expect(maxConcurrent).toBeLessThanOrEqual(5);
  });
});
