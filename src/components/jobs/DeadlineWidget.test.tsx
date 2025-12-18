import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import '@testing-library/jest-dom';
import { DeadlineWidget } from './DeadlineWidget';

// Note: render from @/test/utils already wraps with BrowserRouter

describe('DeadlineWidget', () => {
  const mockDeadlines = [
    {
      id: '1',
      company_name: 'Tech Corp',
      position: 'Developer',
      application_deadline: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      id: '2',
      company_name: 'StartupXYZ',
      position: 'Engineer',
      application_deadline: new Date(Date.now() + 172800000).toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upcoming deadlines', async () => {
    render(<DeadlineWidget jobs={mockDeadlines} onViewJob={vi.fn()} />);

    expect(screen.getByText(/upcoming deadlines/i)).toBeInTheDocument();
  });

  it('displays deadline jobs', async () => {
    render(<DeadlineWidget jobs={mockDeadlines} onViewJob={vi.fn()} />);

    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('StartupXYZ')).toBeInTheDocument();
  });

  it('handles no deadlines', async () => {
    render(<DeadlineWidget jobs={[]} onViewJob={vi.fn()} />);

    expect(screen.getByText(/no upcoming deadlines/i)).toBeInTheDocument();
  });
});
