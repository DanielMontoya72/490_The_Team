import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders skeleton element', () => {
    const { container } = render(<Skeleton />);

    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="custom-skeleton" />);

    expect(container.firstChild).toHaveClass('custom-skeleton');
  });

  it('renders with default styles', () => {
    const { container } = render(<Skeleton />);

    expect(container.firstChild).toHaveClass('rounded-md');
    expect(container.firstChild).toHaveClass('bg-muted');
  });
});
