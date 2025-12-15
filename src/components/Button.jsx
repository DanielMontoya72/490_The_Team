import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable Button Component
 * 
 * Props:
 * - variant: 'primary' | 'secondary' | 'scroll' - Determines button style
 * - to: string (optional) - If provided, renders as Link (for navigation)
 * - className: string (optional) - Additional CSS classes
 * - children: ReactNode - Button content
 * - ...props: Any other valid button attributes (onClick, type, disabled, etc.)
 * 
 * Examples:
 * 
 * // Primary button with form submit
 * <Button 
 *   variant="primary" 
 *   type="submit"
 *   disabled={isLoading}
 * >
 *   {isLoading ? 'Loading...' : 'Submit'}
 * </Button>
 * 
 * // Navigation button
 * <Button 
 *   variant="secondary" 
 *   to="/dashboard"
 * >
 *   Go to Dashboard
 * </Button>
 * 
 * // Scroll button with custom styling
 * <Button 
 *   variant="scroll"
 *   onClick={() => scrollToElement('section-id')}
 *   style={{ marginTop: 32, padding: '10px 20px' }}
 * >
 *   arrow_downward
 * </Button>
 */
const Button = ({ 
  variant = 'primary', 
  to, 
  className = '', 
  children, 
  ...props 
}) => {
  // Base classes for all buttons
  const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  // Variant-specific classes using brand colors
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10 px-4 py-2',
    scroll: 'bg-accent text-accent-foreground hover:bg-accent/90 rounded-full h-12 w-12 p-0',
  };

  // Combine all classes
  const combinedClasses = `${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${className}`;

  // If 'to' prop is provided, render as Link for navigation
  if (to) {
    return (
      <Link to={to} className={combinedClasses} {...props}>
        {children}
      </Link>
    );
  }

  // Otherwise, render as button
  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;
