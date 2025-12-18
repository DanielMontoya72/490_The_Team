import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { SimpleJobForm } from './SimpleJobForm';

// Note: render from @/test/utils already wraps with BrowserRouter

describe('SimpleJobForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<SimpleJobForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
  });

  it('allows entering company name', async () => {
    const user = userEvent.setup();
    render(<SimpleJobForm onSuccess={vi.fn()} />);

    const companyInput = screen.getByLabelText(/company name/i);
    await user.type(companyInput, 'Tech Corp');

    expect(screen.getByDisplayValue('Tech Corp')).toBeInTheDocument();
  });

  it('shows save button', () => {
    render(<SimpleJobForm onSuccess={vi.fn()} />);

    expect(screen.getByRole('button', { name: /save job/i })).toBeInTheDocument();
  });

  it('shows cancel button', () => {
    render(<SimpleJobForm onSuccess={vi.fn()} />);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<SimpleJobForm onSuccess={vi.fn()} />);

    const saveButton = screen.getByRole('button', { name: /save job/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/job title/i)).toBeRequired();
    });
  });
});
