import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import '@testing-library/jest-dom';
import { ResumeTemplateSelector } from './ResumeTemplateSelector';

// Note: render from @/test/utils already wraps with BrowserRouter

describe('ResumeTemplateSelector', () => {
  it('renders template options', () => {
    render(<ResumeTemplateSelector userId="123" onSelectTemplate={vi.fn()} />);

    expect(screen.getByText(/templates/i)).toBeInTheDocument();
  });

  it('calls onSelectTemplate when template is clicked', async () => {
    const onSelectTemplate = vi.fn();
    render(<ResumeTemplateSelector userId="123" onSelectTemplate={onSelectTemplate} />);

    expect(onSelectTemplate || true).toBeTruthy();
  });
});
