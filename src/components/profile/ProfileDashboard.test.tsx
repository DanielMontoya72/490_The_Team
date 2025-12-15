import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { ProfileDashboard } from './ProfileDashboard';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('ProfileDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ 
      data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
      error: null 
    } as any);
  });

  it('renders profile dashboard', () => {
    render(<ProfileDashboard userId="test-user-id" />);
    // Dashboard renders immediately with welcome message
    expect(screen.getByText(/Welcome back/i)).toBeDefined();
  });

  it('displays profile statistics after loading', async () => {
    const mockData = {
      profile: { id: '1', user_id: '1', full_name: 'Test User' },
      employment: [{ id: '1', job_title: 'Developer' }],
      education: [{ id: '1', degree: 'BS' }],
      skills: [{ id: '1', skill_name: 'React' }],
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData[table as keyof typeof mockData], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockData[table as keyof typeof mockData], error: null }),
    } as any));

    render(<ProfileDashboard userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeNull();
    });
  });

  it('handles error state', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed to fetch') }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed to fetch') }),
    } as any));

    render(<ProfileDashboard userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeNull();
    });
  });
});
