import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import feedback from './feedback.js';

const post = (body: unknown) =>
  feedback.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

let fetchMock: ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>;

beforeEach(() => {
  process.env.NTFY_TOPIC = 'test-topic';
  fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response('ok'));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  delete process.env.NTFY_TOPIC;
  vi.unstubAllGlobals();
});

const sentText = () => String(fetchMock.mock.calls[0][1]?.body);

describe('POST /api/feedback', () => {
  it('отправляет в ntfy простой текст с контактом, без HTML-разметки', async () => {
    const res = await post({ message: 'Не грузится обложка', contact: '@user' });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://ntfy.sh/test-topic');
    expect(sentText()).toBe('Не грузится обложка\n\nКонтакт: @user');
    expect(sentText()).not.toMatch(/<\/?[bi]>/);
  });

  it('без контакта — только сообщение', async () => {
    await post({ message: 'Спасибо!' });
    expect(sentText()).toBe('Спасибо!');
  });

  it('без NTFY_TOPIC ничего не отправляет, но отвечает ok', async () => {
    delete process.env.NTFY_TOPIC;
    expect((await post({ message: 'x' })).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('валидация: пустое сообщение и не-JSON → 400', async () => {
    expect((await post({ message: '' })).status).toBe(400);
    const res = await feedback.request('/', { method: 'POST', body: 'not json' });
    expect(res.status).toBe(400);
  });
});
