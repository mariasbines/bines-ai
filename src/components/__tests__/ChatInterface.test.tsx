import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from '@testing-library/react';

type Messages = Array<{ role: 'user' | 'assistant'; content: string }>;
type PostChatOptions = {
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  conversation_id?: string;
  from_slug?: string | null;
};

// Mock window.matchMedia (jsdom doesn't implement it)
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Hoist mocks so the vi.mock factories can reference them.
const { mockPostChat, mockNewConversationId, mockSearchParams } = vi.hoisted(() => ({
  mockPostChat: vi.fn<
    (messages: Messages, options: PostChatOptions) => Promise<{ ok: boolean }>
  >(),
  mockNewConversationId: vi.fn<() => string>(),
  mockSearchParams: vi.fn<() => URLSearchParams>(),
}));

// Mock the chat client
vi.mock('@/lib/chat/client', () => ({
  postChat: (messages: Messages, options: PostChatOptions) =>
    mockPostChat(messages, options),
}));

// Mock the conversation id minter — Phase A.
vi.mock('@/lib/conversation/id', () => ({
  newConversationId: () => mockNewConversationId(),
}));

// Mock useSearchParams — Phase B story 003.002. Default: no params.
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams(),
}));

import { ChatInterface } from '../ChatInterface';

beforeEach(() => {
  mockPostChat.mockReset();
  mockPostChat.mockImplementation(() => Promise.resolve({ ok: true }));
  mockNewConversationId.mockReset();
  // Deterministic counter so reuse vs new is observable.
  let n = 0;
  mockNewConversationId.mockImplementation(() => `mock-uuid-${++n}`);
  // Default: empty URLSearchParams (no `?from=`).
  mockSearchParams.mockReset();
  mockSearchParams.mockReturnValue(new URLSearchParams(''));
});

describe('<ChatInterface>', () => {
  it('renders with empty log and disclaimer', () => {
    render(<ChatInterface />);
    // aria-live log present
    expect(screen.getByRole('log')).toBeInTheDocument();
    // disclaimer block present
    expect(screen.getByText(/not Maria/i)).toBeInTheDocument();
    expect(screen.getByText(/push back when it does/i)).toBeInTheDocument();
  });

  it('renders the privacy note reflecting the 90-day retention window', () => {
    render(<ChatInterface />);
    expect(screen.getByText(/sent to anthropic/i)).toBeInTheDocument();
    expect(screen.getByText(/kept on this site for 90 days/i)).toBeInTheDocument();
    expect(screen.getByText(/no ip, no account/i)).toBeInTheDocument();
  });

  it('renders the chat input with submit button', () => {
    render(<ChatInterface />);
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /push back/i })).toBeInTheDocument();
  });
});

/**
 * Submit-flow helper. Fills the textarea and clicks the submit button.
 * Awaits a microtask flush so the async `handleSubmit` resolves before the
 * caller's assertions run. Avoids `userEvent` (not installed in this project).
 */
async function submit(text: string): Promise<void> {
  const input = screen.getByLabelText('Your message') as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /push back/i }));
  // Flush microtasks so postChat resolves (mock returns synchronously).
  await act(async () => {
    await Promise.resolve();
  });
}

describe('<ChatInterface> — conversation_id threading (story 003.001)', () => {
  it('does NOT mint a conversation_id on mount (only on first submit)', () => {
    render(<ChatInterface />);
    expect(mockNewConversationId).not.toHaveBeenCalled();
    expect(mockPostChat).not.toHaveBeenCalled();
  });

  it('mints a conversation_id on first submit and threads it into postChat', async () => {
    render(<ChatInterface />);
    await submit('first message');

    expect(mockNewConversationId).toHaveBeenCalledTimes(1);
    expect(mockPostChat).toHaveBeenCalledTimes(1);
    const opts = mockPostChat.mock.calls[0][1];
    expect(opts.conversation_id).toBe('mock-uuid-1');
  });

  it('passes from_slug: null when there is no ?from= param (story 003.001 baseline)', async () => {
    render(<ChatInterface />);
    await submit('hi');

    const opts = mockPostChat.mock.calls[0][1];
    expect('from_slug' in opts).toBe(true);
    expect(opts.from_slug).toBeNull();
  });

  it('reuses the same conversation_id across subsequent submits', async () => {
    render(<ChatInterface />);
    await submit('one');
    await submit('two');

    expect(mockNewConversationId).toHaveBeenCalledTimes(1); // minted once
    expect(mockPostChat).toHaveBeenCalledTimes(2);
    const id1 = mockPostChat.mock.calls[0][1].conversation_id;
    const id2 = mockPostChat.mock.calls[1][1].conversation_id;
    expect(id1).toBe('mock-uuid-1');
    expect(id2).toBe('mock-uuid-1');
  });
});

describe('<ChatInterface> — ?from=<slug> capture (story 003.002)', () => {
  it('threads from_slug into postChat when ?from=<slug> is present in the URL', async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('from=fw-04-singularity-different-clothes'));
    render(<ChatInterface />);
    await submit('hi');

    const opts = mockPostChat.mock.calls[0][1];
    expect(opts.from_slug).toBe('fw-04-singularity-different-clothes');
  });

  it('passes from_slug: null when no ?from= param is present', async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams(''));
    render(<ChatInterface />);
    await submit('hi');

    const opts = mockPostChat.mock.calls[0][1];
    expect(opts.from_slug).toBeNull();
  });

  it('treats an empty ?from= value as null (no slug captured)', async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('from='));
    render(<ChatInterface />);
    await submit('hi');

    const opts = mockPostChat.mock.calls[0][1];
    expect(opts.from_slug).toBeNull();
  });

  it('captures from_slug stickily — re-renders with a different ?from= do NOT re-tag', async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('from=fw-original'));
    const { rerender } = render(<ChatInterface />);
    await submit('one');

    // Simulate a route change (different ?from=) without unmounting the component.
    mockSearchParams.mockReturnValue(new URLSearchParams('from=fw-pivoted'));
    rerender(<ChatInterface />);
    await submit('two');

    // Both submits used the value captured on first render.
    expect(mockPostChat).toHaveBeenCalledTimes(2);
    expect(mockPostChat.mock.calls[0][1].from_slug).toBe('fw-original');
    expect(mockPostChat.mock.calls[1][1].from_slug).toBe('fw-original');
  });
});

// Phase B — story 003.005. Chat-end signal: idle timer + pagehide + beforeunload
// → navigator.sendBeacon. Fake timers required for the idle path.

const sendBeaconMock = vi.fn<(url: string, body?: BodyInit | null) => boolean>(() => true);

describe('<ChatInterface> — chat-end signal (story 003.005)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sendBeaconMock.mockClear();
    Object.defineProperty(navigator, 'sendBeacon', {
      writable: true,
      configurable: true,
      value: sendBeaconMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Fake-timer-aware submit helper. Standard `submit` uses
   * `await Promise.resolve()` to flush microtasks; under fake timers that
   * still works because `Promise.resolve()` is microtask-scheduled (not
   * timer-scheduled). The mocked `postChat` resolves synchronously so the
   * status flip back to 'idle' happens within the act() flush.
   */
  async function submitFake(text: string): Promise<void> {
    const input = screen.getByLabelText('Your message') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: /push back/i }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('does NOT fire the beacon when no messages have been sent (conversation_id null)', () => {
    render(<ChatInterface />);
    vi.advanceTimersByTime(5 * 60 * 1000); // 5 min — well past the 2-min idle.
    expect(sendBeaconMock).not.toHaveBeenCalled();
  });

  it('fires the beacon once after 2 minutes of idle following a submit', async () => {
    render(<ChatInterface />);
    await submitFake('hello');

    expect(sendBeaconMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    const [url, body] = sendBeaconMock.mock.calls[0];
    expect(url).toBe('/api/argue-judge/run');
    // Body is a Blob — read its text and parse.
    expect(body).toBeInstanceOf(Blob);
    const blob = body as Blob;
    const text = await blob.text();
    const parsed = JSON.parse(text);
    expect(parsed).toEqual({ conversation_id: 'mock-uuid-1' });
  });

  it('resets the idle timer on a subsequent submit (90s + submit + 90s = no fire yet)', async () => {
    render(<ChatInterface />);
    await submitFake('one');
    await act(async () => {
      vi.advanceTimersByTime(90 * 1000);
    });
    expect(sendBeaconMock).not.toHaveBeenCalled();

    await submitFake('two');
    await act(async () => {
      vi.advanceTimersByTime(90 * 1000); // 90s after second submit; 30s short of 2 min.
    });
    expect(sendBeaconMock).not.toHaveBeenCalled();

    // After another 30s (total 2 min from second submit) the timer fires.
    await act(async () => {
      vi.advanceTimersByTime(30 * 1000);
    });
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
  });

  it('fires the beacon on `pagehide`', async () => {
    render(<ChatInterface />);
    await submitFake('hello');

    fireEvent(window, new Event('pagehide'));

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    const [url] = sendBeaconMock.mock.calls[0];
    expect(url).toBe('/api/argue-judge/run');
  });

  it('fires the beacon on `beforeunload`', async () => {
    render(<ChatInterface />);
    await submitFake('hello');

    fireEvent(window, new Event('beforeunload'));

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
  });

  it('debounce guard: pagehide + beforeunload + idle elapse fire exactly once', async () => {
    render(<ChatInterface />);
    await submitFake('hello');

    fireEvent(window, new Event('pagehide'));
    fireEvent(window, new Event('beforeunload'));
    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire the beacon when conversation_id is null (no submit, just events)', () => {
    render(<ChatInterface />);
    fireEvent(window, new Event('pagehide'));
    fireEvent(window, new Event('beforeunload'));
    expect(sendBeaconMock).not.toHaveBeenCalled();
  });

  it('cleans up listeners + timer on unmount (no leaked fires after)', async () => {
    const { unmount } = render(<ChatInterface />);
    await submitFake('hello');

    unmount();

    fireEvent(window, new Event('pagehide'));
    fireEvent(window, new Event('beforeunload'));
    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(sendBeaconMock).not.toHaveBeenCalled();
  });

  it('does NOT throw when navigator.sendBeacon is undefined (graceful no-op)', async () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      writable: true,
      configurable: true,
      value: undefined,
    });
    render(<ChatInterface />);
    await submitFake('hello');

    // Trigger via pagehide. Should not throw.
    expect(() => fireEvent(window, new Event('pagehide'))).not.toThrow();
  });

  it('does NOT register a visibilitychange listener (AC-005 — only pagehide + beforeunload)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<ChatInterface />);
    const events = addSpy.mock.calls.map((call) => call[0]);
    expect(events).toContain('pagehide');
    expect(events).toContain('beforeunload');
    expect(events).not.toContain('visibilitychange');
    addSpy.mockRestore();
  });

  it('fireChatEnd is fire-and-forget (no await needed by callers)', async () => {
    render(<ChatInterface />);
    await submitFake('hello');

    // pagehide handler invocation is synchronous — sendBeacon is called
    // before fireEvent returns.
    fireEvent(window, new Event('pagehide'));
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    // No awaits between dispatch and assertion.
  });
});
