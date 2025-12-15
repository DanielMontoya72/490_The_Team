import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CertificationForm } from './CertificationForm';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CertificationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    renderWithRouter(<CertificationForm userId="123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/certification name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/issuing organization/i)).toBeInTheDocument();
  });

  it('shows certification number field', () => {
    renderWithRouter(<CertificationForm userId="123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/certification number/i)).toBeInTheDocument();
  });

  it('shows date earned field', () => {
    renderWithRouter(<CertificationForm userId="123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(/date earned/i)).toBeInTheDocument();
  });

  it('shows expiration date field', () => {
    renderWithRouter(<CertificationForm userId="123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(/expiration date/i)).toBeInTheDocument();
  });

  it('shows does not expire checkbox', () => {
    renderWithRouter(<CertificationForm userId="123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/does not expire/i)).toBeInTheDocument();
  });

  it('shows save button', () => {
    renderWithRouter(<CertificationForm userId="123" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: /add certification/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithRouter(<CertificationForm userId="123" onSuccess={vi.fn()} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });
});
