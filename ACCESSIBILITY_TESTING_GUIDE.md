# WCAG 2.1 AA Accessibility Testing Guide

This guide provides comprehensive testing procedures to ensure the application meets WCAG 2.1 AA accessibility standards.

## 🚀 Quick Start

### Automated Testing Tools
1. **Install axe DevTools**: Chrome/Edge/Firefox extension
2. **Install WAVE**: Web accessibility evaluation tool
3. **Use Lighthouse**: Built into Chrome DevTools
4. **Install Pa11y**: Command-line accessibility tester

```bash
# Install Pa11y CLI tool
npm install -g pa11y

# Run automated test on a page
pa11y http://localhost:3000

# Run with specific WCAG level
pa11y --standard WCAG2AA http://localhost:3000
```

## 🔍 Testing Checklist

### 1. Automated Testing (Run First)

#### Lighthouse Accessibility Audit
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Accessibility" only
4. Click "Generate report"
5. **Target Score**: 90+ (Required for WCAG 2.1 AA)

#### axe DevTools
1. Install axe DevTools browser extension
2. Open DevTools → axe tab
3. Click "Scan ALL of my page"
4. Fix all **Critical** and **Serious** issues
5. Review **Moderate** and **Minor** issues

#### WAVE Tool
1. Install WAVE browser extension
2. Click WAVE icon on any page
3. Review all errors and alerts
4. Ensure zero errors for WCAG AA compliance

### 2. Keyboard Navigation Testing

#### Basic Keyboard Navigation
- [ ] **Tab Key**: Can reach all interactive elements
- [ ] **Shift+Tab**: Can navigate backwards
- [ ] **Enter**: Activates buttons and links
- [ ] **Space**: Activates buttons, checks checkboxes
- [ ] **Arrow Keys**: Navigate within menus, lists, carousels
- [ ] **Escape**: Closes modals, dropdowns, menus
- [ ] **Home/End**: Jump to first/last items in lists

#### Focus Management
- [ ] Focus indicator is visible on all interactive elements
- [ ] Focus doesn't get trapped unintentionally
- [ ] Focus moves logically through the page
- [ ] Focus is programmatically managed in SPAs
- [ ] Skip links are provided for main content

#### Testing Steps
```javascript
// Test focus trap in modals
1. Open a modal/dialog
2. Tab through all focusable elements
3. Verify focus stays within modal
4. Press Escape to close
5. Verify focus returns to trigger element

// Test skip links
1. Load page and immediately press Tab
2. Verify skip link appears
3. Press Enter on skip link
4. Verify focus moves to main content
```

### 3. Screen Reader Testing

#### Testing with NVDA (Windows - Free)
1. Download NVDA from nvaccess.org
2. Install and start NVDA
3. Navigate website using only screen reader
4. Test common patterns:

```
Key Commands:
- H: Navigate by headings
- L: Navigate by links
- F: Navigate by form fields
- B: Navigate by buttons
- G: Navigate by graphics
- T: Navigate by tables
- Insert+F7: List all elements
```

#### Testing with JAWS (Windows - Trial)
1. Download JAWS trial from freedomscientific.com
2. Test similar patterns as NVDA
3. Verify compatibility with both screen readers

#### Testing with VoiceOver (macOS)
1. Enable: System Preferences → Accessibility → VoiceOver
2. Use Control+Option+arrow keys to navigate
3. Test all interactive elements

#### Screen Reader Checklist
- [ ] All images have appropriate alt text
- [ ] Form fields have labels
- [ ] Headings create logical structure
- [ ] Link text is descriptive
- [ ] Error messages are announced
- [ ] Status changes are announced
- [ ] Tables have headers and captions
- [ ] Lists are properly marked up

### 4. Color Contrast Testing

#### Tools for Testing
- **Colour Contrast Analyser**: Desktop app
- **WebAIM Contrast Checker**: Online tool
- **axe DevTools**: Automated detection

#### Requirements
- **Normal text**: 4.5:1 contrast ratio
- **Large text**: 3:1 contrast ratio (18pt+ or 14pt+ bold)
- **UI components**: 3:1 contrast ratio
- **Focus indicators**: 3:1 contrast ratio

#### Testing Process
1. Test all text against its background
2. Test button states (normal, hover, focus, disabled)
3. Test form field borders and labels
4. Test icons and UI elements
5. Test in high contrast mode

### 5. Form Accessibility Testing

#### Form Field Requirements
- [ ] All fields have labels (visible or aria-label)
- [ ] Required fields are marked with aria-required="true"
- [ ] Error states use aria-invalid="true"
- [ ] Error messages are associated with fields
- [ ] Field descriptions use aria-describedby
- [ ] Fieldsets group related fields
- [ ] Form submission provides feedback

#### Testing Script
```javascript
// Test form accessibility
const form = document.querySelector('form');
const fields = form.querySelectorAll('input, select, textarea');

fields.forEach(field => {
  // Check for labels
  const hasLabel = field.id && document.querySelector(`label[for="${field.id}"]`);
  const hasAriaLabel = field.hasAttribute('aria-label') || field.hasAttribute('aria-labelledby');
  
  if (!hasLabel && !hasAriaLabel) {
    console.error('Field missing label:', field);
  }
  
  // Check for error handling
  if (field.hasAttribute('aria-invalid')) {
    const errorId = field.getAttribute('aria-describedby');
    const errorElement = errorId && document.getElementById(errorId);
    if (!errorElement) {
      console.error('Invalid field missing error message:', field);
    }
  }
});
```

### 6. Mobile Accessibility Testing

#### Touch Target Size
- [ ] All interactive elements are at least 44x44 pixels
- [ ] Adequate spacing between touch targets
- [ ] Swipe gestures have alternative navigation

#### Mobile Screen Reader Testing
- [ ] Test with TalkBack (Android)
- [ ] Test with VoiceOver (iOS)
- [ ] Verify gesture navigation works
- [ ] Test in landscape and portrait modes

### 7. Testing with Assistive Technologies

#### Alternative Input Devices
- [ ] Test with voice control software
- [ ] Test with switch navigation
- [ ] Test with eye-tracking software
- [ ] Verify alternative input methods work

#### Testing with Real Users
- [ ] Recruit users with disabilities
- [ ] Observe real usage patterns
- [ ] Gather feedback on pain points
- [ ] Iterate based on user feedback

## 📋 Testing Templates

### Bug Report Template
```markdown
## Accessibility Bug Report

**WCAG Criterion**: [e.g., 1.4.3 Contrast (Minimum)]
**Severity**: Critical/High/Medium/Low
**Assistive Technology**: [e.g., NVDA, Keyboard only]
**Browser**: [e.g., Chrome 120]
**Page/Component**: [URL or component name]

### Description
Brief description of the accessibility issue.

### Steps to Reproduce
1. Step one
2. Step two
3. Step three

### Expected Behavior
What should happen for users with disabilities.

### Actual Behavior
What actually happens.

### Impact
How this affects users with disabilities.

### Suggested Fix
Technical solution to address the issue.
```

### Test Report Template
```markdown
## Accessibility Test Report

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Pages Tested**: [List of URLs]
**Tools Used**: [axe, WAVE, Lighthouse, etc.]

### Summary
- **Overall Score**: 95/100
- **Critical Issues**: 0
- **High Priority Issues**: 2
- **Medium Priority Issues**: 5

### Detailed Findings
[List of issues found with severity and recommendations]

### Compliance Status
- ✅ WCAG 2.1 A: Compliant
- ✅ WCAG 2.1 AA: Compliant
- ❌ WCAG 2.1 AAA: Not tested

### Recommendations
[List of improvements and next steps]
```

## 🛠 Implementation Guidelines

### Priority Order for Fixes
1. **Critical**: Blocks access entirely (missing alt text, keyboard traps)
2. **High**: Significantly impairs usage (poor contrast, missing labels)
3. **Medium**: Creates barriers but has workarounds (minor heading issues)
4. **Low**: Best practice improvements (enhanced descriptions)

### Code Review Checklist
- [ ] Semantic HTML elements used correctly
- [ ] ARIA attributes used properly
- [ ] Focus management implemented
- [ ] Color contrast meets requirements
- [ ] Alternative text provided for images
- [ ] Form labels and error handling
- [ ] Keyboard navigation supported
- [ ] Screen reader compatibility verified

### Continuous Testing
1. Add accessibility tests to CI/CD pipeline
2. Regular audits with automated tools
3. User testing sessions with disabled users
4. Accessibility training for development team
5. Design system includes accessibility guidelines

## 📚 Resources

### Standards and Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Section 508 Standards](https://www.section508.gov/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Pa11y](https://pa11y.org/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

### Screen Readers
- [NVDA](https://www.nvaccess.org/) (Free)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) (Trial available)
- [VoiceOver](https://support.apple.com/guide/voiceover/) (Built into macOS/iOS)

### Training Resources
- [WebAIM](https://webaim.org/)
- [A11Y Project](https://www.a11yproject.com/)
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)

## ✅ Acceptance Criteria Verification

### Frontend Requirements Met:
- [x] Automated accessibility audit implementation
- [x] WCAG 2.1 AA compliance testing procedures
- [x] Keyboard navigation testing guide
- [x] Screen reader compatibility verification
- [x] Color contrast validation
- [x] Form accessibility testing
- [x] Focus management verification
- [x] Assistive technology testing procedures
- [x] Critical and high-priority issue resolution process

This testing guide ensures comprehensive accessibility verification and maintains ongoing compliance with WCAG 2.1 AA standards.