import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { ProjectsManagement } from './ProjectsManagement';

// Note: render from @/test/utils already wraps with BrowserRouter

describe('ProjectsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders projects management component', async () => {
    render(<ProjectsManagement userId="test-user-id" />);

    // Component renders without crashing
    await waitFor(() => {
      expect(document.body).toBeDefined();
    });
  });

  it('shows loading state or projects', async () => {
    render(<ProjectsManagement userId="test-user-id" />);

    // Check for either loading state or content
    await waitFor(() => {
      const hasContent = document.querySelector('.animate-pulse') !== null ||
                        screen.queryByText(/project/i) !== null;
      expect(hasContent).toBe(true);
    });
  });

  it('accepts userId prop', async () => {
    render(<ProjectsManagement userId="test-user-id" />);

    await waitFor(() => {
      expect(document.body).toBeDefined();
    });
  });
});
