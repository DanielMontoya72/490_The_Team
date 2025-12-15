import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';

describe('Accordion', () => {
  it('renders accordion items', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Test Item</AccordionTrigger>
          <AccordionContent>Test Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('expands on click', async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Test Item</AccordionTrigger>
          <AccordionContent>Test Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const trigger = screen.getByText('Test Item');
    await user.click(trigger);

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders multiple items', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});
