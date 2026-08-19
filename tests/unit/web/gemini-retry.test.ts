import { describe, expect, it, vi } from 'vitest';
import { geminiCall, type GeminiCallOptions } from '../../../src/web/formatting';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function geminiPayload(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

describe('geminiCall retry logic', () => {
  it('returns on first successful attempt', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(geminiPayload('{"version":1,"operations":[]}')));
    const result = await geminiCall('prompt', 'key', { fetcher });
    expect(result).toBe('{"version":1,"operations":[]}');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and succeeds on second attempt', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(jsonResponse(geminiPayload('ok')));
    const result = await geminiCall('prompt', 'key', { fetcher });
    expect(result).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 and succeeds on second attempt', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('server error', { status: 500 }))
      .mockResolvedValueOnce(jsonResponse(geminiPayload('ok')));
    const result = await geminiCall('prompt', 'key', { fetcher });
    expect(result).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('throws after all retries exhausted', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('error', { status: 429 }));
    await expect(geminiCall('prompt', 'key', { fetcher })).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 400 (non-retryable status)', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 }));
    await expect(geminiCall('prompt', 'key', { fetcher })).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not retry on network error (TypeError)', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(geminiCall('prompt', 'key', { fetcher })).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('respects Retry-After header', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('rate limited', {
        status: 429,
        headers: { 'Retry-After': '1' },
      }))
      .mockResolvedValueOnce(jsonResponse(geminiPayload('ok')));

    const promise = geminiCall('prompt', 'key', { fetcher });
    await vi.advanceTimersByTimeAsync(1200);
    const result = await promise;
    expect(result).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('geminiCall abort signal', () => {
  it('throws AbortError when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn();
    await expect(geminiCall('prompt', 'key', { fetcher, signal: controller.signal })).rejects.toThrow('Aborted');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('throws AbortError when signal aborts during retry delay', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('error', { status: 500 }));

    const promise = geminiCall('prompt', 'key', { fetcher, signal: controller.signal });
    // Advance past the first failed request, then abort during retry delay
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await vi.advanceTimersByTimeAsync(10000);
    await expect(promise).rejects.toThrow();
    vi.useRealTimers();
  });
});

describe('geminiCall streaming', () => {
  it('calls onStreamToken for each SSE chunk', async () => {
    const chunks = ['data: {"candidates":[{"content":{"parts":[{"text":"hello"}]}}]}\n', 'data: {"candidates":[{"content":{"parts":[{"text":" world"}]}}]}\n'];
    const sseBody = chunks.join('');

    const fetcher = vi.fn().mockResolvedValue(new Response(sseBody, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }));

    const tokenCounts: number[] = [];
    const result = await geminiCall('prompt', 'key', {
      fetcher,
      onStreamToken: (count) => tokenCounts.push(count),
    });

    expect(result).toContain('hello');
    expect(result).toContain('world');
    expect(tokenCounts.length).toBeGreaterThan(0);
  });

  it('falls back to non-streaming when no onStreamToken is provided', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(geminiPayload('non-streaming result')));
    const result = await geminiCall('prompt', 'key', { fetcher });
    expect(result).toBe('non-streaming result');
    expect(fetcher).toHaveBeenCalledTimes(1);
    // The URL should be the non-streaming endpoint
    const calledUrl = fetcher.mock.calls[0][0] as string;
    expect(calledUrl).toContain('generateContent');
    expect(calledUrl).not.toContain('streamGenerateContent');
  });
});
