import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BasicInfoForm from './BasicInfoForm';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('BasicInfoForm', () => {
  const mockProfile = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-0123',
    location: 'New York',
    linkedin_url: 'https://linkedin.com/in/johndoe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    renderWithRouter(<BasicInfoForm profile={mockProfile} onUpdate={vi.fn()} />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it('displays profile data in form', () => {
    renderWithRouter(<BasicInfoForm profile={mockProfile} onUpdate={vi.fn()} />);

    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
  });

  it('allows editing form fields', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BasicInfoForm profile={mockProfile} onUpdate={vi.fn()} />);

    const firstNameInput = screen.getByDisplayValue('John');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Jane');

    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
  });

  it('shows save button', () => {
    renderWithRouter(<BasicInfoForm profile={mockProfile} onUpdate={vi.fn()} />);

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls onUpdate when form is submitted', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderWithRouter(<BasicInfoForm profile={mockProfile} onUpdate={onUpdate} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BasicInfoForm profile={mockProfile} onUpdate={vi.fn()} />);

    const emailInput = screen.getByDisplayValue('john@example.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'invalid-email');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });
});
