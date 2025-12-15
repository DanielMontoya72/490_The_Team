import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { EmploymentForm } from './EmploymentForm';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('EmploymentForm', () => {
  const mockInitialData = {
    id: '1',
    jobTitle: 'Software Engineer',
    companyName: 'Tech Corp',
    location: 'New York',
    startDate: new Date('2020-01-01'),
    endDate: new Date('2023-12-31'),
    isCurrent: false,
    description: 'Developed web applications',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    renderWithRouter(<EmploymentForm onSubmit={vi.fn()} onCancel={vi.fn()} isSubmitting={false} />);

    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
  });

  it('displays employment data when editing', () => {
    renderWithRouter(
      <EmploymentForm 
        initialData={mockInitialData} 
        onSubmit={vi.fn()} 
        onCancel={vi.fn()} 
        isSubmitting={false} 
      />
    );

    expect(screen.getByDisplayValue('Tech Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
  });

  it('shows current job checkbox', () => {
    renderWithRouter(<EmploymentForm onSubmit={vi.fn()} onCancel={vi.fn()} isSubmitting={false} />);

    expect(screen.getByLabelText(/currently work here/i)).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithRouter(<EmploymentForm onSubmit={onSubmit} onCancel={vi.fn()} isSubmitting={false} />);

    await user.type(screen.getByLabelText(/company name/i), 'New Company');
    await user.type(screen.getByLabelText(/job title/i), 'Developer');

    const saveButton = screen.getByRole('button', { name: /add position/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithRouter(<EmploymentForm onSubmit={vi.fn()} onCancel={onCancel} isSubmitting={false} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });
});
