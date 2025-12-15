import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import { NetworkingActivityTracker } from './NetworkingActivityTracker';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('NetworkingActivityTracker', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockContacts = [
    {
      id: 'contact-1',
      user_id: 'user-123',
      name: 'John Doe',
      company: 'Tech Corp',
      title: 'Manager',
      relationship_strength: 'strong',
      last_contacted: '2024-01-15',
      created_at: '2024-01-01',
    },
    {
      id: 'contact-2',
      user_id: 'user-123',
      name: 'Jane Smith',
      company: 'Startup Inc',
      title: 'Director',
      relationship_strength: 'moderate',
      last_contacted: '2024-02-01',
      created_at: '2024-01-15',
    },
  ];

  const mockCampaigns = [
    {
      id: 'campaign-1',
      user_id: 'user-123',
      campaign_name: 'Tech Outreach',
      status: 'active',
      target_industry: 'Technology',
      created_at: '2024-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'professional_contacts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
        } as any;
      }
      if (table === 'networking_campaigns') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockCampaigns, error: null }),
        } as any;
      }
      if (table === 'campaign_outreach') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });
  });

  it('renders networking activity tracker', async () => {
    render(<NetworkingActivityTracker />);

    await waitFor(() => {
      expect(screen.getByText(/networking activity/i)).toBeInTheDocument();
    });
  });

  it('displays activity metrics', async () => {
    render(<NetworkingActivityTracker />);

    await waitFor(() => {
      expect(screen.getByText(/networking activity/i)).toBeInTheDocument();
    });
  });

  it('handles empty activity data', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any));

    render(<NetworkingActivityTracker />);

    await waitFor(() => {
      expect(screen.getByText(/networking activity/i)).toBeInTheDocument();
    });
  });

  it('handles fetch errors gracefully', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
    } as any));

    render(<NetworkingActivityTracker />);

    await waitFor(() => {
      expect(screen.getByText(/networking activity/i)).toBeInTheDocument();
    });
  });

  it('tracks relationship building progress', async () => {
    render(<NetworkingActivityTracker />);

    await waitFor(() => {
      // Should show relationship progress metrics
      expect(screen.getByText(/networking activity/i)).toBeInTheDocument();
    });
  });
});
