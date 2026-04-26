import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BioLine } from '../BioLine';
import { BIO_LINE } from '@/lib/content/site';

describe('<BioLine>', () => {
  it('renders the locked bio copy verbatim', () => {
    render(<BioLine />);
    expect(screen.getByText(BIO_LINE)).toBeInTheDocument();
  });
  it('references the Kentucky-Londoner-Canadian cadence', () => {
    render(<BioLine />);
    expect(screen.getByText(/Kentucky-raised.*London-based.*Canadian-sounding/)).toBeInTheDocument();
  });
});
