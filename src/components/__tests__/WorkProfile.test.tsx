import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { WorkProfile, PROFILE_PDF_HREF } from '../WorkProfile';

const SYNAPSEDX_HEX = ['#0A0F1A', '#00D4AA', '#F26B38', '#0EA5E9'];

describe('<WorkProfile>', () => {
  it('renders the headline as the page h1', () => {
    render(<WorkProfile />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Anyone can start an AI agent. I build the part that says no.',
      }),
    ).toBeInTheDocument();
  });

  it('renders the four role cards, newest first', () => {
    render(<WorkProfile />);
    const cards = screen.getAllByTestId('role-card');
    expect(cards).toHaveLength(4);
    const orgs = cards.map((c) => within(c).getByRole('heading', { level: 3 }).textContent);
    expect(orgs).toEqual(['SynapseDx', "Lloyd's of London", 'Microsoft', 'Avanade']);
    expect(within(cards[0]).getByText('Governing AI agents')).toBeInTheDocument();
  });

  it('links to the profile PDF, which exists in public/', () => {
    render(<WorkProfile />);
    const link = screen.getByRole('link', { name: 'Download the profile (PDF)' });
    expect(link).toHaveAttribute('href', PROFILE_PDF_HREF);
    const onDisk = path.resolve(__dirname, '../../../public', PROFILE_PDF_HREF.replace(/^\//, ''));
    expect(readFileSync(onDisk).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('renders the portrait with descriptive alt text', () => {
    render(<WorkProfile />);
    expect(
      screen.getByAltText('Maria Stone Bines, smiling, in an embroidered white blouse'),
    ).toBeInTheDocument();
  });

  it('contains no SynapseDx brand hex values, rendered or in source', () => {
    const { container } = render(<WorkProfile />);
    const html = container.innerHTML.toLowerCase();
    const source = readFileSync(path.resolve(__dirname, '../WorkProfile.tsx'), 'utf8').toLowerCase();
    for (const hex of SYNAPSEDX_HEX) {
      expect(html).not.toContain(hex.toLowerCase());
      expect(source).not.toContain(hex.toLowerCase());
    }
  });

  it('adds no em dashes to the copy', () => {
    const { container } = render(<WorkProfile />);
    expect(container.textContent).not.toContain('—');
  });
  it('does not name clients (bines.ai rule: no client name-dropping)', () => {
    const { container } = render(<WorkProfile />);
    const text = container.textContent ?? '';
    for (const client of ['QBE', 'Google, with Endava']) {
      expect(text).not.toContain(client);
    }
  });
});
