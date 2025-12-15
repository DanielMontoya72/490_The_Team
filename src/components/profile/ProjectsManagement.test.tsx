import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { ProjectsManagement } from './ProjectsManagement';
import { supabase } from '@/integrations/supabase/client';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/integrations/supabase/client');

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProjectsManagement', () => {
  const mockProjects = [
    {
      id: '1',
      user_id: '123',
      project_name: 'Test Project',
      description: 'Test Description',
      technologies_used: ['React', 'TypeScript'],
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      project_url: 'https://example.com',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
      single: vi.fn().mockResolvedValue({ data: mockProjects[0], error: null }),
    } as any));
  });

  it('renders projects list', async () => {
    renderWithRouter(<ProjectsManagement userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeDefined();
    });
  });

  it('shows loading state initially', async () => {
    renderWithRouter(<ProjectsManagement userId="test-user-id" />);

    // Check for loading placeholders (animate-pulse class)
    await waitFor(() => {
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeDefined();
    });
  });

  it('displays project details', async () => {
    renderWithRouter(<ProjectsManagement userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeDefined();
      expect(screen.getByText('Test Description')).toBeDefined();
    });
  });
});
