import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import '@testing-library/jest-dom';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';

describe('Avatar', () => {
  it('renders avatar with image', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByAltText('User')).toBeInTheDocument();
  });

  it('shows fallback when no image', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <Avatar className="custom-class">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
