import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import '@testing-library/jest-dom';
import { ImprovementTimeline } from './ImprovementTimeline';

describe('ImprovementTimeline', () => {
  const mockData = {
    mockSessions: [
      {
        id: '1',
        user_id: 'user-123',
        session_name: 'Practice 1',
        interview_type: 'behavioral',
        overall_score: 70,
        created_at: '2024-01-01',
      },
      {
        id: '2',
        user_id: 'user-123',
        session_name: 'Practice 2',
        interview_type: 'technical',
        overall_score: 80,
        created_at: '2024-02-01',
      },
      {
        id: '3',
        user_id: 'user-123',
        session_name: 'Practice 3',
        interview_type: 'behavioral',
        overall_score: 85,
        created_at: '2024-03-01',
      },
    ],
    predictions: [
      {
        id: 'pred-1',
        user_id: 'user-123',
        overall_probability: 65,
        created_at: '2024-01-15',
      },
      {
        id: 'pred-2',
        user_id: 'user-123',
        overall_probability: 75,
        created_at: '2024-02-15',
      },
    ],
  };

  it('renders improvement timeline component', () => {
    render(<ImprovementTimeline data={mockData} />);

    expect(screen.getByText('Improvement Over Time')).toBeInTheDocument();
  });

  it('displays description', () => {
    render(<ImprovementTimeline data={mockData} />);

    expect(screen.getByText(/Track your interview performance/)).toBeInTheDocument();
  });

  it('handles empty data', () => {
    render(<ImprovementTimeline data={{ mockSessions: [], predictions: [] }} />);

    expect(screen.getByText('Improvement Over Time')).toBeInTheDocument();
    expect(screen.getByText(/Complete practice sessions/)).toBeInTheDocument();
  });

  it('handles null data gracefully', () => {
    render(<ImprovementTimeline data={null} />);

    expect(screen.getByText('Improvement Over Time')).toBeInTheDocument();
  });

  it('shows empty state guidance when no data', () => {
    render(<ImprovementTimeline data={{ mockSessions: [], predictions: [] }} />);

    expect(screen.getByText(/Complete practice sessions and interviews/)).toBeInTheDocument();
  });
});
