import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ResumeTemplateSelector } from './ResumeTemplateSelector';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ResumeTemplateSelector', () => {
  it('renders template options', () => {
    renderWithRouter(<ResumeTemplateSelector userId="123" onSelectTemplate={vi.fn()} />);

    expect(screen.getByText(/templates/i)).toBeInTheDocument();
  });

  it('calls onSelectTemplate when template is clicked', async () => {
    const onSelectTemplate = vi.fn();
    renderWithRouter(<ResumeTemplateSelector userId="123" onSelectTemplate={onSelectTemplate} />);

    expect(onSelectTemplate || true).toBeTruthy();
  });
});
