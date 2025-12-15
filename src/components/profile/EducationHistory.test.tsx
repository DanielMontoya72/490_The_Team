import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { EducationHistory } from './EducationHistory';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('EducationHistory', () => {
  const mockEducation = [
    {
      id: '1',
      institution: 'University of Example',
      degree: 'Bachelor of Science',
      field_of_study: 'Computer Science',
      start_date: '2016-09-01',
      end_date: '2020-06-01',
      grade: '3.8',
    },
    {
      id: '2',
      institution: 'Tech Institute',
      degree: 'Master of Science',
      field_of_study: 'Software Engineering',
      start_date: '2020-09-01',
      end_date: '2022-06-01',
      grade: '4.0',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: mockEducation, error: null })),
    }));
  });

  it('renders education list', async () => {
    renderWithRouter(<EducationHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('University of Example')).toBeInTheDocument();
      expect(screen.getByText('Tech Institute')).toBeInTheDocument();
    });
  });

  it('displays degrees', async () => {
    renderWithRouter(<EducationHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/Bachelor of Science/i)).toBeInTheDocument();
      expect(screen.getByText(/Master of Science/i)).toBeInTheDocument();
    });
  });

  it('shows fields of study', async () => {
    renderWithRouter(<EducationHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/Computer Science/i)).toBeInTheDocument();
      expect(screen.getByText(/Software Engineering/i)).toBeInTheDocument();
    });
  });

  it('displays GPA', async () => {
    renderWithRouter(<EducationHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/3.8/)).toBeInTheDocument();
      expect(screen.getByText(/4.0/)).toBeInTheDocument();
    });
  });

  it('shows add education button', () => {
    renderWithRouter(<EducationHistory userId="123" />);

    expect(screen.getByRole('button', { name: /add education/i })).toBeInTheDocument();
  });

  it('handles empty education list', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: [], error: null })),
    }));

    renderWithRouter(<EducationHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/no education/i)).toBeInTheDocument();
    });
  });

  it('allows deleting education', async () => {
    const user = userEvent.setup();
    renderWithRouter(<EducationHistory userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('University of Example')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('education');
    });
  });
});
