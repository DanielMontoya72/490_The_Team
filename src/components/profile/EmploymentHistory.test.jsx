import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import EmploymentHistory from './EmploymentHistory';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('EmploymentHistory', () => {
  const mockEmployments = [
    {
      id: '1',
      company_name: 'Tech Corp',
      position: 'Senior Developer',
      start_date: '2020-01-01',
      end_date: '2023-12-31',
      is_current: false,
    },
    {
      id: '2',
      company_name: 'StartupXYZ',
      position: 'Lead Engineer',
      start_date: '2023-01-01',
      is_current: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: mockEmployments, error: null })),
    }));
  });

  it('renders employment list', async () => {
    renderWithRouter(<EmploymentHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
      expect(screen.getByText('StartupXYZ')).toBeInTheDocument();
    });
  });

  it('shows current employment indicator', async () => {
    renderWithRouter(<EmploymentHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/current/i)).toBeInTheDocument();
    });
  });

  it('displays positions', async () => {
    renderWithRouter(<EmploymentHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      expect(screen.getByText('Lead Engineer')).toBeInTheDocument();
    });
  });

  it('shows add employment button', () => {
    renderWithRouter(<EmploymentHistory userId="123" />);

    expect(screen.getByRole('button', { name: /add employment/i })).toBeInTheDocument();
  });

  it('handles empty employment list', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: [], error: null })),
    }));

    renderWithRouter(<EmploymentHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/no employment/i)).toBeInTheDocument();
    });
  });

  it('allows deleting employment', async () => {
    const user = userEvent.setup();
    renderWithRouter(<EmploymentHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('employment_history');
    });
  });
});
