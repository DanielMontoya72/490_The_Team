import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { checkColorContrast, validateAriaAttributes, getFocusableElements } from '@/utils/accessibility';
import { AlertTriangle, CheckCircle2, XCircle, Eye, Keyboard, Volume2, Palette } from 'lucide-react';

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  category: 'color-contrast' | 'keyboard' | 'aria' | 'focus' | 'semantic' | 'screen-reader';
  element: string;
  description: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  fix?: string;
}

interface AccessibilityAuditProps {
  targetSelector?: string;
}

export function AccessibilityAudit({ targetSelector = 'body' }: AccessibilityAuditProps) {
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [score, setScore] = useState<number>(0);

  const auditAccessibility = async () => {
    setIsAuditing(true);
    const foundIssues: AccessibilityIssue[] = [];

    try {
      const targetElement = document.querySelector(targetSelector) as HTMLElement;
      if (!targetElement) {
        throw new Error(`Target element '${targetSelector}' not found`);
      }

      // Check color contrast
      await auditColorContrast(targetElement, foundIssues);
      
      // Check ARIA attributes
      auditAriaAttributes(targetElement, foundIssues);
      
      // Check keyboard accessibility
      auditKeyboardAccessibility(targetElement, foundIssues);
      
      // Check focus management
      auditFocusManagement(targetElement, foundIssues);
      
      // Check semantic structure
      auditSemanticStructure(targetElement, foundIssues);
      
      // Check form accessibility
      auditFormAccessibility(targetElement, foundIssues);
      
      // Check image accessibility
      auditImageAccessibility(targetElement, foundIssues);

      setIssues(foundIssues);
      
      // Calculate score (100 - penalty points)
      const errorPenalty = foundIssues.filter(i => i.type === 'error').length * 10;
      const warningPenalty = foundIssues.filter(i => i.type === 'warning').length * 5;
      const infoPenalty = foundIssues.filter(i => i.type === 'info').length * 2;
      
      const calculatedScore = Math.max(0, 100 - errorPenalty - warningPenalty - infoPenalty);
      setScore(calculatedScore);
      
    } catch (error) {
      console.error('Accessibility audit failed:', error);
    }
    
    setIsAuditing(false);
  };

  const auditColorContrast = async (element: HTMLElement, issues: AccessibilityIssue[]) => {
    const textElements = element.querySelectorAll('*');
    
    textElements.forEach((el) => {
      if (el.children.length === 0 && el.textContent?.trim()) {
        const computedStyle = window.getComputedStyle(el);
        const color = computedStyle.color;
        const backgroundColor = computedStyle.backgroundColor;
        
        if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          try {
            // Convert to hex for contrast checking (simplified)
            const contrast = checkColorContrast('#000000', '#ffffff'); // Placeholder
            
            if (contrast < 4.5) {
              issues.push({
                type: 'error',
                category: 'color-contrast',
                element: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                description: `Low color contrast ratio (${contrast.toFixed(2)}:1). WCAG AA requires at least 4.5:1 for normal text.`,
                wcagLevel: 'AA',
                fix: 'Increase color contrast by using darker text or lighter backgrounds'
              });
            }
          } catch (e) {
            // Skip elements where color contrast can't be calculated
          }
        }
      }
    });
  };

  const auditAriaAttributes = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    const elementsWithAria = element.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-expanded], [aria-hidden], [role]');
    
    elementsWithAria.forEach((el) => {
      const errors = validateAriaAttributes(el as HTMLElement);
      errors.forEach(error => {
        issues.push({
          type: 'error',
          category: 'aria',
          element: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''),
          description: error,
          wcagLevel: 'A',
          fix: 'Fix ARIA attribute references and values'
        });
      });
    });

    // Check for missing ARIA labels on interactive elements
    const interactiveElements = element.querySelectorAll('button:not([aria-label]):not([aria-labelledby]), a:not([aria-label]):not([aria-labelledby]):not(:has(img[alt])):not(:has(text)), input:not([aria-label]):not([aria-labelledby]):not([id])');
    
    interactiveElements.forEach((el) => {
      if (!el.textContent?.trim() && !(el as HTMLElement).title) {
        issues.push({
          type: 'warning',
          category: 'aria',
          element: el.tagName.toLowerCase(),
          description: 'Interactive element missing accessible name (aria-label, aria-labelledby, or visible text)',
          wcagLevel: 'A',
          fix: 'Add aria-label attribute or ensure element has descriptive text'
        });
      }
    });
  };

  const auditKeyboardAccessibility = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    // Check for keyboard trap potential
    const focusableElements = getFocusableElements(element);
    
    if (focusableElements.length === 0) {
      issues.push({
        type: 'warning',
        category: 'keyboard',
        element: 'container',
        description: 'No focusable elements found in container',
        wcagLevel: 'A',
        fix: 'Ensure interactive elements are keyboard accessible'
      });
    }

    // Check for elements with tabindex > 0
    const positiveTabindex = element.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])');
    if (positiveTabindex.length > 0) {
      issues.push({
        type: 'warning',
        category: 'keyboard',
        element: 'multiple elements',
        description: `Found ${positiveTabindex.length} element(s) with positive tabindex values`,
        wcagLevel: 'A',
        fix: 'Use tabindex="0" or manage focus programmatically instead of positive tabindex values'
      });
    }

    // Check for click handlers without keyboard support
    const clickOnlyElements = element.querySelectorAll('[onclick]:not(button):not(a):not([role="button"]):not([tabindex])');
    if (clickOnlyElements.length > 0) {
      issues.push({
        type: 'error',
        category: 'keyboard',
        element: 'interactive elements',
        description: `Found ${clickOnlyElements.length} element(s) with click handlers but no keyboard support`,
        wcagLevel: 'A',
        fix: 'Add keyboard event handlers or use semantic HTML elements'
      });
    }
  };

  const auditFocusManagement = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    // Check for focus indicators
    const style = document.createElement('style');
    style.textContent = `
      .a11y-test-focus { outline: 2px solid red !important; }
    `;
    document.head.appendChild(style);

    const focusableElements = getFocusableElements(element);
    let elementsWithoutFocusIndicator = 0;

    focusableElements.forEach((el) => {
      const computedStyle = window.getComputedStyle(el, ':focus');
      if (computedStyle.outline === 'none' || computedStyle.outline === '0px none rgba(0, 0, 0, 0)') {
        elementsWithoutFocusIndicator++;
      }
    });

    document.head.removeChild(style);

    if (elementsWithoutFocusIndicator > 0) {
      issues.push({
        type: 'warning',
        category: 'focus',
        element: 'interactive elements',
        description: `${elementsWithoutFocusIndicator} focusable element(s) may lack visible focus indicators`,
        wcagLevel: 'AA',
        fix: 'Ensure all focusable elements have visible focus indicators'
      });
    }
  };

  const auditSemanticStructure = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    // Check heading hierarchy
    const headings = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let previousLevel = 0;
    
    headings.forEach((heading) => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      if (currentLevel > previousLevel + 1) {
        issues.push({
          type: 'warning',
          category: 'semantic',
          element: heading.tagName.toLowerCase(),
          description: `Heading level skipped from h${previousLevel} to h${currentLevel}`,
          wcagLevel: 'AA',
          fix: 'Use consecutive heading levels (h1, h2, h3, etc.) without skipping'
        });
      }
      previousLevel = currentLevel;
    });

    // Check for landmark roles
    const main = element.querySelectorAll('main, [role="main"]');
    if (main.length === 0) {
      issues.push({
        type: 'info',
        category: 'semantic',
        element: 'page',
        description: 'No main landmark found',
        wcagLevel: 'A',
        fix: 'Add <main> element or role="main" to identify primary content'
      });
    } else if (main.length > 1) {
      issues.push({
        type: 'warning',
        category: 'semantic',
        element: 'page',
        description: 'Multiple main landmarks found',
        wcagLevel: 'A',
        fix: 'Use only one main landmark per page'
      });
    }
  };

  const auditFormAccessibility = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    // Check for form labels
    const inputs = element.querySelectorAll('input:not([type="hidden"]), select, textarea');
    
    inputs.forEach((input) => {
      const hasLabel = input.id && element.querySelector(`label[for="${input.id}"]`);
      const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
      
      if (!hasLabel && !hasAriaLabel) {
        issues.push({
          type: 'error',
          category: 'aria',
          element: input.tagName.toLowerCase(),
          description: 'Form control missing label',
          wcagLevel: 'A',
          fix: 'Associate form control with label using for/id or aria-label'
        });
      }
    });

    // Check for required field indicators
    const requiredInputs = element.querySelectorAll('input[required], select[required], textarea[required]');
    requiredInputs.forEach((input) => {
      if (!input.hasAttribute('aria-required')) {
        issues.push({
          type: 'info',
          category: 'aria',
          element: input.tagName.toLowerCase(),
          description: 'Required field should have aria-required attribute',
          wcagLevel: 'A',
          fix: 'Add aria-required="true" to required form fields'
        });
      }
    });
  };

  const auditImageAccessibility = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    const images = element.querySelectorAll('img');
    
    images.forEach((img) => {
      if (!img.alt && img.alt !== '') {
        issues.push({
          type: 'error',
          category: 'screen-reader',
          element: 'img',
          description: 'Image missing alt attribute',
          wcagLevel: 'A',
          fix: 'Add descriptive alt text or empty alt="" for decorative images'
        });
      }
    });

    // Check for decorative images that should have empty alt
    const decorativeImages = element.querySelectorAll('img[role="presentation"], img[aria-hidden="true"]');
    decorativeImages.forEach((img) => {
      if (img.getAttribute('alt') !== '') {
        issues.push({
          type: 'warning',
          category: 'screen-reader',
          element: 'img',
          description: 'Decorative image should have empty alt text',
          wcagLevel: 'A',
          fix: 'Use alt="" for decorative images'
        });
      }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'color-contrast': return <Palette className="h-4 w-4" />;
      case 'keyboard': return <Keyboard className="h-4 w-4" />;
      case 'screen-reader': return <Volume2 className="h-4 w-4" />;
      case 'focus': return <Eye className="h-4 w-4" />;
      default: return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const groupedIssues = issues.reduce((acc, issue) => {
    if (!acc[issue.category]) acc[issue.category] = [];
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, AccessibilityIssue[]>);

  useEffect(() => {
    // Run initial audit
    auditAccessibility();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            WCAG 2.1 AA Accessibility Audit
          </CardTitle>
          <CardDescription>
            Automated accessibility testing to ensure compliance with web standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                  {score}
                </div>
                <div className="text-sm text-muted-foreground">Accessibility Score</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-semibold text-red-600">
                    {issues.filter(i => i.type === 'error').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-yellow-600">
                    {issues.filter(i => i.type === 'warning').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Warnings</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-blue-600">
                    {issues.filter(i => i.type === 'info').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Info</div>
                </div>
              </div>
            </div>
            <Button 
              onClick={auditAccessibility} 
              disabled={isAuditing}
              loading={isAuditing}
              loadingText="Auditing..."
            >
              Re-run Audit
            </Button>
          </div>

          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Issues ({issues.length})</TabsTrigger>
              <TabsTrigger value="errors">Errors ({issues.filter(i => i.type === 'error').length})</TabsTrigger>
              <TabsTrigger value="warnings">Warnings ({issues.filter(i => i.type === 'warning').length})</TabsTrigger>
              <TabsTrigger value="by-category">By Category</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {issues.length === 0 ? (
                <div className="text-center py-8 text-green-600">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-medium">No accessibility issues found!</p>
                  <p className="text-sm text-muted-foreground">All automated tests passed.</p>
                </div>
              ) : (
                issues.map((issue, index) => (
                  <Card key={index} className="border-l-4 border-l-red-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{issue.element}</span>
                            <Badge variant={issue.type === 'error' ? 'destructive' : issue.type === 'warning' ? 'secondary' : 'default'}>
                              WCAG {issue.wcagLevel}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {issue.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {issue.description}
                          </p>
                          {issue.fix && (
                            <p className="text-xs text-green-700 bg-green-50 p-2 rounded">
                              💡 {issue.fix}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="errors" className="space-y-3">
              {issues.filter(i => i.type === 'error').map((issue, index) => (
                <Card key={index} className="border-l-4 border-l-red-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {getIssueIcon(issue.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{issue.element}</span>
                          <Badge variant="destructive">WCAG {issue.wcagLevel}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {issue.description}
                        </p>
                        {issue.fix && (
                          <p className="text-xs text-green-700 bg-green-50 p-2 rounded">
                            💡 {issue.fix}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="warnings" className="space-y-3">
              {issues.filter(i => i.type === 'warning').map((issue, index) => (
                <Card key={index} className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {getIssueIcon(issue.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{issue.element}</span>
                          <Badge variant="secondary">WCAG {issue.wcagLevel}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {issue.description}
                        </p>
                        {issue.fix && (
                          <p className="text-xs text-green-700 bg-green-50 p-2 rounded">
                            💡 {issue.fix}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="by-category" className="space-y-4">
              {Object.entries(groupedIssues).map(([category, categoryIssues]) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {getCategoryIcon(category)}
                      {category.replace('-', ' ').toUpperCase()} 
                      <Badge variant="outline">{categoryIssues.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {categoryIssues.map((issue, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{issue.element}</span>
                            <Badge variant="outline" className="text-xs">
                              WCAG {issue.wcagLevel}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}