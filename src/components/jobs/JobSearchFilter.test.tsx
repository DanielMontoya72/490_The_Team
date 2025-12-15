import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { JobSearchFilter } from './JobSearchFilter';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('JobSearchFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    renderWithRouter(<JobSearchFilter onFilterChange={vi.fn()} onSearchChange={vi.fn()} />);

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('allows typing in search field', async () => {
    const user = userEvent.setup();
    renderWithRouter(<JobSearchFilter onFilterChange={vi.fn()} onSearchChange={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Software Engineer');

    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
  });

  it('shows filter button', () => {
    renderWithRouter(<JobSearchFilter onFilterChange={vi.fn()} onSearchChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    renderWithRouter(<JobSearchFilter onFilterChange={vi.fn()} onSearchChange={onSearchChange} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Test');

    await waitFor(() => {
      expect(onSearchChange).toHaveBeenCalled();
    });
  });

  it('shows clear filters button when filters active', async () => {
    const user = userEvent.setup();
    renderWithRouter(<JobSearchFilter onFilterChange={vi.fn()} onSearchChange={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Test');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });
  });
});
