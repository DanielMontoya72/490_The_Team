import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { EducationForm } from './EducationForm';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('EducationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    renderWithRouter(<EducationForm userId="123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/institution name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/degree type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/field of study/i)).toBeInTheDocument();
  });

  it('shows education level dropdown', () => {
    renderWithRouter(<EducationForm userId="123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(/education level/i)).toBeInTheDocument();
  });

  it('shows GPA field', () => {
    renderWithRouter(<EducationForm userId="123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/gpa/i)).toBeInTheDocument();
  });

  it('shows save button', () => {
    renderWithRouter(<EducationForm userId="123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: /add education/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithRouter(<EducationForm userId="123" onSuccess={vi.fn()} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });
});
