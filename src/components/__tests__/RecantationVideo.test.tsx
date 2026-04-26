import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RecantationVideo } from '../RecantationVideo';

describe('<RecantationVideo>', () => {
  it('renders a native <video controls> with poster and source', () => {
    const { container } = render(
      <RecantationVideo src="/media/fw04/recantation.mp4" poster="/media/fw04/recantation-poster.jpg" />,
    );
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('poster', '/media/fw04/recantation-poster.jpg');
    expect(video).toHaveAttribute('playsinline');
    const source = container.querySelector('source');
    expect(source).toHaveAttribute('src', '/media/fw04/recantation.mp4');
    expect(source).toHaveAttribute('type', 'video/mp4');
  });

  it('omits the captions <track> when no captions src is provided', () => {
    const { container } = render(
      <RecantationVideo src="/v.mp4" poster="/p.jpg" />,
    );
    expect(container.querySelector('track')).toBeNull();
  });

  it('renders a default English captions <track> when captions src is provided', () => {
    const { container } = render(
      <RecantationVideo src="/v.mp4" poster="/p.jpg" captions="/c.vtt" />,
    );
    const track = container.querySelector('track');
    expect(track).not.toBeNull();
    expect(track).toHaveAttribute('kind', 'captions');
    expect(track).toHaveAttribute('src', '/c.vtt');
    expect(track).toHaveAttribute('srclang', 'en');
    expect(track).toHaveAttribute('default');
  });

  it('renders the "the recantation" caption beneath the video', () => {
    const { getByText } = render(
      <RecantationVideo src="/v.mp4" poster="/p.jpg" />,
    );
    expect(getByText(/the recantation/i)).toBeInTheDocument();
  });

  it('uses preload="metadata" so the player only fetches the poster up front', () => {
    const { container } = render(
      <RecantationVideo src="/v.mp4" poster="/p.jpg" />,
    );
    expect(container.querySelector('video')).toHaveAttribute('preload', 'metadata');
  });
});
