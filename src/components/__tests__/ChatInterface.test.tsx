import { describe, it, expect, vi, beforeEach } from 'vitest';
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
const { mockPostChat, mockNewConversationId } = vi.hoisted(() => ({
  mockPostChat: vi.fn<
    (messages: Messages, options: PostChatOptions) => Promise<{ ok: boolean }>
  >(),
  mockNewConversationId: vi.fn<() => string>(),
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

import { ChatInterface } from '../ChatInterface';

beforeEach(() => {
  mockPostChat.mockReset();
  mockPostChat.mockImplementation(() => Promise.resolve({ ok: true }));
  mockNewConversationId.mockReset();
  // Deterministic counter so reuse vs new is observable.
  let n = 0;
  mockNewConversationId.mockImplementation(() => `mock-uuid-${++n}`);
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

  it('passes from_slug: null on every submit (Phase A placeholder)', async () => {
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
