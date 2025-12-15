import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import LinkedInIntegration from './LinkedInIntegration';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('LinkedInIntegration', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockProfileNotConnected = {
    id: 'profile-123',
    user_id: 'user-123',
    linkedin_access_token: null,
    linkedin_profile_id: null,
    linkedin_profile_url: null,
    linkedin_headline: null,
    linkedin_picture_url: null,
    linkedin_name: null,
  };

  const mockProfileConnected = {
    id: 'profile-123',
    user_id: 'user-123',
    linkedin_access_token: 'mock-access-token',
    linkedin_profile_id: 'linkedin-123',
    linkedin_profile_url: 'https://linkedin.com/in/testuser',
    linkedin_headline: 'Software Engineer at Tech Corp',
    linkedin_picture_url: 'https://example.com/avatar.jpg',
    linkedin_name: 'John Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'mock-token' } as any },
      error: null,
    });
  });

  it('renders LinkedIn integration card', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfileNotConnected, error: null }),
    } as any));

    render(<LinkedInIntegration />);

    await waitFor(() => {
      expect(screen.getByText('LinkedIn Integration')).toBeInTheDocument();
    });
  });

  it('shows connect button when not connected', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfileNotConnected, error: null }),
    } as any));

    render(<LinkedInIntegration />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect linkedin account/i })).toBeInTheDocument();
    });
  });

  it('shows connected status with user info when connected', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfileConnected, error: null }),
    } as any));

    render(<LinkedInIntegration />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Software Engineer at Tech Corp')).toBeInTheDocument();
    });
  });

  it('shows disconnect button when connected', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfileConnected, error: null }),
      update: vi.fn().mockReturnThis(),
    } as any));

    render(<LinkedInIntegration />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });
  });

  it('renders optimization tab', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfileNotConnected, error: null }),
    } as any));

    render(<LinkedInIntegration />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /profile optimization/i })).toBeInTheDocument();
    });
  });

  it('renders message templates tab', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfileNotConnected, error: null }),
    } as any));

    render(<LinkedInIntegration />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /message templates/i })).toBeInTheDocument();
    });
  });

  it('renders networking strategies tab', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfileNotConnected, error: null }),
    } as any));

    render(<LinkedInIntegration />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /networking strategies/i })).toBeInTheDocument();
    });
  });

  it('renders campaign templates tab', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfileNotConnected, error: null }),
    } as any));

    render(<LinkedInIntegration />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /campaign templates/i })).toBeInTheDocument();
    });
  });

  it('shows generate optimization button', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfileNotConnected, error: null }),
    } as any));

    render(<LinkedInIntegration />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate optimization suggestions/i })).toBeInTheDocument();
    });
  });
});
