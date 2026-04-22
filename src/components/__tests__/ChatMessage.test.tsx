import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';

describe('<ChatMessage>', () => {
  it('renders user message right-aligned with mono font', () => {
    const { container } = render(<ChatMessage role="user" content="Hi" />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toMatch(/justify-end/);
    expect(container.querySelector('.font-mono')).toBeInTheDocument();
  });

  it('renders assistant message left-aligned with serif font', () => {
    const { container } = render(<ChatMessage role="assistant" content="Hi back" />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toMatch(/justify-start/);
    expect(container.querySelector('.font-serif')).toBeInTheDocument();
  });

  it('preserves newlines via whitespace-pre-wrap (no markdown parse)', () => {
    const { container } = render(
      <ChatMessage role="assistant" content={'line 1\nline 2\n\nline 4'} />,
    );
    const p = container.querySelector('p');
    expect(p).not.toBeNull();
    expect(p?.className).toMatch(/whitespace-pre-wrap/);
    expect(p?.textContent).toBe('line 1\nline 2\n\nline 4');
  });

  it('does NOT parse markdown (asterisks stay literal)', () => {
    const { container } = render(<ChatMessage role="assistant" content="**bold** _ital_" />);
    expect(container.querySelector('strong')).toBeNull();
    expect(container.querySelector('em')).toBeNull();
    expect(screen.getByText('**bold** _ital_')).toBeInTheDocument();
  });

  it('does NOT interpret HTML tags (they render as text)', () => {
    const content = '<script>alert(1)</script>';
    const { container } = render(<ChatMessage role="assistant" content={content} />);
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(content)).toBeInTheDocument();
  });
});
