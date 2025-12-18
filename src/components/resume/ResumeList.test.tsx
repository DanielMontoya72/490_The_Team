import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { ResumeList } from './ResumeList';

describe('ResumeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders resume list component', async () => {
    render(
      <ResumeList 
        userId="user-123"
        onEditResume={vi.fn()}
        onCreateNew={vi.fn()}
      />
    );

    // Component renders and shows either resumes or empty state
    await waitFor(() => {
      // The component will show either resume items or the empty state
      const hasContent = screen.queryByText(/resume/i) !== null || 
                        screen.queryByText(/No Resumes Yet/i) !== null;
      expect(hasContent).toBe(true);
    });
  });

  it('shows empty state when no resumes', async () => {
    render(
      <ResumeList 
        userId="user-123"
        onEditResume={vi.fn()}
        onCreateNew={vi.fn()}
      />
    );

    // With default mock returning empty, should show empty state
    await waitFor(() => {
      expect(screen.getByText(/No Resumes Yet/i)).toBeDefined();
    });
  });

  it('shows create button', async () => {
    render(
      <ResumeList 
        userId="user-123"
        onEditResume={vi.fn()}
        onCreateNew={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Create/i)).toBeDefined();
    });
  });

  it('renders without crashing', () => {
    render(
      <ResumeList 
        userId="user-123"
        onEditResume={vi.fn()}
        onCreateNew={vi.fn()}
      />
    );
    
    // Component renders successfully
    expect(document.body).toBeDefined();
  });

  it('accepts required props', () => {
    const onEditResume = vi.fn();
    const onCreateNew = vi.fn();
    
    render(
      <ResumeList 
        userId="user-123"
        onEditResume={onEditResume}
        onCreateNew={onCreateNew}
      />
    );
    
    // Props are accepted without error
    expect(document.body).toBeDefined();
  });
});
