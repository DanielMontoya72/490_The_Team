import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CertificationsManagement } from './CertificationsManagement';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CertificationsManagement', () => {
  const mockCertifications = [
    {
      id: '1',
      certification_name: 'AWS Certified Developer',
      issuing_organization: 'Amazon Web Services',
      date_earned: '2023-01-15',
    },
    {
      id: '2',
      certification_name: 'Google Cloud Professional',
      issuing_organization: 'Google',
      date_earned: '2023-06-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: mockCertifications, error: null })),
    }));
  });

  it('renders certifications list', async () => {
    renderWithRouter(<CertificationsManagement userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('AWS Certified Developer')).toBeInTheDocument();
      expect(screen.getByText('Google Cloud Professional')).toBeInTheDocument();
    });
  });

  it('displays issuing organizations', async () => {
    renderWithRouter(<CertificationsManagement userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
  });

  it('shows add certification button', () => {
    renderWithRouter(<CertificationsManagement userId="123" />);

    expect(screen.getByRole('button', { name: /add certification/i })).toBeInTheDocument();
  });

  it('handles empty certifications list', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: [], error: null })),
    }));

    renderWithRouter(<CertificationsManagement userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/no certifications/i)).toBeInTheDocument();
    });
  });
});
