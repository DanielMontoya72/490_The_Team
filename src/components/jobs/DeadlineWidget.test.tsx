import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { DeadlineWidget } from './DeadlineWidget';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

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

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: mockDeadlines, error: null })),
    }));
  });

  it('renders upcoming deadlines', async () => {
    renderWithRouter(<DeadlineWidget jobs={mockDeadlines} onViewJob={vi.fn()} />);

    expect(screen.getByText(/upcoming deadlines/i)).toBeInTheDocument();
  });

  it('displays deadline jobs', async () => {
    renderWithRouter(<DeadlineWidget jobs={mockDeadlines} onViewJob={vi.fn()} />);

    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('StartupXYZ')).toBeInTheDocument();
  });

  it('handles no deadlines', async () => {
    renderWithRouter(<DeadlineWidget jobs={[]} onViewJob={vi.fn()} />);

    expect(screen.getByText(/no upcoming deadlines/i)).toBeInTheDocument();
  });
});
