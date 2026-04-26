import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MdxBody } from '../MdxBody';

describe('<MdxBody>', () => {
  it('compiles simple markdown into HTML', async () => {
    const node = await MdxBody({ source: '# Hello\n\nBody.' });
    const { container } = render(node);
    expect(container.querySelector('h1')).toHaveTextContent('Hello');
    expect(container.querySelector('p')).toHaveTextContent('Body.');
  });
  it('renders <PullQuote> JSX-in-MDX correctly', async () => {
    const node = await MdxBody({
      source: '<PullQuote>key quote</PullQuote>',
    });
    const { container } = render(node);
    expect(container.querySelector('blockquote')).toHaveTextContent('key quote');
  });
});
