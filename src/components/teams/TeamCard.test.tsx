import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { TeamCard } from './TeamCard';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('TeamCard', () => {
  const mockTeam = {
    id: '1',
    name: 'Engineering Team',
    description: 'Core engineering team',
    created_at: '2024-01-01',
    team_members: [
      { role: 'admin', user_id: 'user-1' },
      { role: 'member', user_id: 'user-2' },
      { role: 'member', user_id: 'user-3' },
    ],
  };

  const mockTeamWithOwner = {
    id: '2',
    name: 'Product Team',
    description: 'Product development team',
    created_at: '2024-01-15',
    team_members: [
      { role: 'owner', user_id: 'user-1' },
      { role: 'admin', user_id: 'user-2' },
    ],
  };

  it('renders team name', () => {
    renderWithRouter(<TeamCard team={mockTeam} onUpdate={vi.fn()} />);

    expect(screen.getByText('Engineering Team')).toBeInTheDocument();
  });

  it('displays team description', () => {
    renderWithRouter(<TeamCard team={mockTeam} onUpdate={vi.fn()} />);

    expect(screen.getByText('Core engineering team')).toBeInTheDocument();
  });

  it('shows member count', () => {
    renderWithRouter(<TeamCard team={mockTeam} onUpdate={vi.fn()} />);

    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('renders team with owner role', () => {
    renderWithRouter(<TeamCard team={mockTeamWithOwner} onUpdate={vi.fn()} />);

    expect(screen.getByText('Product Team')).toBeInTheDocument();
  });

  it('handles empty team members array', () => {
    const emptyTeam = {
      id: '3',
      name: 'Empty Team',
      description: 'No members yet',
      created_at: '2024-01-01',
      team_members: [],
    };

    renderWithRouter(<TeamCard team={emptyTeam} onUpdate={vi.fn()} />);

    expect(screen.getByText('Empty Team')).toBeInTheDocument();
  });

  it('displays team without description', () => {
    const noDescTeam = {
      id: '4',
      name: 'Simple Team',
      description: '',
      created_at: '2024-01-01',
      team_members: [{ role: 'admin', user_id: 'user-1' }],
    };

    renderWithRouter(<TeamCard team={noDescTeam} onUpdate={vi.fn()} />);

    expect(screen.getByText('Simple Team')).toBeInTheDocument();
  });
});
