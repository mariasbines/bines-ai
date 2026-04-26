import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AntipatternsStrip } from '../AntipatternsStrip';
import { ANTIPATTERNS } from '@/lib/content/antipatterns';

describe('<AntipatternsStrip>', () => {
  it('renders exactly the 9 locked items', () => {
    render(<AntipatternsStrip />);
    expect(ANTIPATTERNS).toHaveLength(9);
    for (const item of ANTIPATTERNS) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });
  it('ends with the voice-flex closer', () => {
    expect(ANTIPATTERNS[ANTIPATTERNS.length - 1]).toBe(
      'posts that resolve cleanly at the end',
    );
  });
  it('has an accessible label', () => {
    render(<AntipatternsStrip />);
    expect(screen.getByRole('region', { name: /refuses to be/i })).toBeInTheDocument();
  });
});
