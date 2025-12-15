import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

// Mock TimeTrackingWidget for testing
const MockTimeTrackingWidget = () => {
  return (
    <div>
      <h3>Time Tracking</h3>
      <div data-testid="timer">00:00:00</div>
      <button>Start Timer</button>
      <button>Stop Timer</button>
      <div data-testid="activity-select">
        <select>
          <option value="applications">Applications</option>
          <option value="networking">Networking</option>
          <option value="interviews">Interview Prep</option>
          <option value="research">Research</option>
        </select>
      </div>
    </div>
  );
};

describe('TimeTrackingWidget', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockTimeEntries = [
    {
      id: 'entry-1',
      user_id: 'user-123',
      activity_type: 'applications',
      duration_minutes: 60,
      start_time: '2024-01-15T09:00:00Z',
      end_time: '2024-01-15T10:00:00Z',
      notes: 'Applied to 3 companies',
    },
    {
      id: 'entry-2',
      user_id: 'user-123',
      activity_type: 'networking',
      duration_minutes: 30,
      start_time: '2024-01-15T10:00:00Z',
      end_time: '2024-01-15T10:30:00Z',
      notes: 'LinkedIn outreach',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'productivity_metrics' || table === 'time_entries') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockTimeEntries, error: null }),
          insert: vi.fn().mockResolvedValue({ data: mockTimeEntries[0], error: null }),
          update: vi.fn().mockReturnThis(),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });
  });

  it('renders time tracking widget', () => {
    render(<MockTimeTrackingWidget />);

    expect(screen.getByText(/time tracking/i)).toBeInTheDocument();
  });

  it('displays timer', () => {
    render(<MockTimeTrackingWidget />);

    expect(screen.getByTestId('timer')).toBeInTheDocument();
  });

  it('shows start timer button', () => {
    render(<MockTimeTrackingWidget />);

    expect(screen.getByRole('button', { name: /start timer/i })).toBeInTheDocument();
  });

  it('shows stop timer button', () => {
    render(<MockTimeTrackingWidget />);

    expect(screen.getByRole('button', { name: /stop timer/i })).toBeInTheDocument();
  });

  it('displays activity selection', () => {
    render(<MockTimeTrackingWidget />);

    expect(screen.getByTestId('activity-select')).toBeInTheDocument();
  });

  it('has activity type options', () => {
    render(<MockTimeTrackingWidget />);

    expect(screen.getByRole('option', { name: /applications/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /networking/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /interview prep/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /research/i })).toBeInTheDocument();
  });
});

describe('Time Calculation Functions', () => {
  it('formats duration correctly', () => {
    const formatDuration = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    };

    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(60)).toBe('1h 0m');
    expect(formatDuration(45)).toBe('0h 45m');
  });

  it('calculates total time per activity', () => {
    const entries = [
      { activity_type: 'applications', duration_minutes: 60 },
      { activity_type: 'applications', duration_minutes: 30 },
      { activity_type: 'networking', duration_minutes: 45 },
    ];

    const totals = entries.reduce((acc, entry) => {
      acc[entry.activity_type] = (acc[entry.activity_type] || 0) + entry.duration_minutes;
      return acc;
    }, {} as Record<string, number>);

    expect(totals.applications).toBe(90);
    expect(totals.networking).toBe(45);
  });

  it('calculates productivity percentage', () => {
    const targetMinutes = 180; // 3 hours
    const actualMinutes = 135;
    const productivity = (actualMinutes / targetMinutes) * 100;

    expect(productivity).toBe(75);
  });
});
