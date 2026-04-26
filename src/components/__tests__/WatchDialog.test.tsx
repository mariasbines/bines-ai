import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock VideoLoop to avoid JSdom video complexity.
vi.mock('../VideoLoop', () => ({
  VideoLoop: ({ alt }: { alt: string }) => <div data-testid="video-loop">{alt}</div>,
}));

// Mock jsdom HTMLDialogElement showModal / close which aren't implemented.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

import { WatchDialog } from '../WatchDialog';

describe('<WatchDialog>', () => {
  const props = {
    open: false,
    onClose: vi.fn(),
    src: 'https://example/v.mp4',
    poster: 'https://example/p.jpg',
    title: 'Watch: Foo',
  };

  it('renders a dialog with aria-label = title', () => {
    const { container } = render(<WatchDialog {...props} />);
    const dialog = container.querySelector('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Watch: Foo');
  });

  it('does not render VideoLoop while closed', () => {
    render(<WatchDialog {...props} />);
    expect(screen.queryByTestId('video-loop')).not.toBeInTheDocument();
  });

  it('renders VideoLoop when open=true', () => {
    render(<WatchDialog {...props} open />);
    expect(screen.getByTestId('video-loop')).toHaveTextContent('Watch: Foo');
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<WatchDialog {...props} open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
