import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { JobStatistics } from './JobStatistics';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('JobStatistics', () => {
  const mockJobs = [
    { id: '1', status: 'Applied', application_date: '2024-01-15' },
    { id: '2', status: 'Interview', application_date: '2024-01-20' },
    { id: '3', status: 'Offer Received', application_date: '2024-02-01' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: mockJobs, error: null })),
    }));
  });

  it('renders statistics cards', async () => {
    renderWithRouter(<JobStatistics jobs={mockJobs} />);

    await waitFor(() => {
      expect(screen.getByText(/total/i)).toBeInTheDocument();
    });
  });

  it('displays job count', async () => {
    renderWithRouter(<JobStatistics jobs={mockJobs} />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('handles empty job list', async () => {
    renderWithRouter(<JobStatistics jobs={[]} />);

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});
