import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stamp } from '../Stamp';

describe('<Stamp>', () => {
  it('renders an SVG with aria-label by default', () => {
    const { container } = render(<Stamp />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-label', 'bines.ai colophon stamp');
    expect(svg).toHaveAttribute('role', 'img');
  });
  it('drops curved text at favicon scale (32px)', () => {
    const { container } = render(<Stamp size={32} />);
    expect(container.querySelectorAll('textPath')).toHaveLength(0);
  });
  it('includes both textPaths at header scale (96px)', () => {
    const { container } = render(<Stamp size={96} />);
    expect(container.querySelectorAll('textPath')).toHaveLength(2);
  });
  it('accepts a custom aria-label', () => {
    const { container } = render(<Stamp label="custom label" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'custom label');
  });
});
