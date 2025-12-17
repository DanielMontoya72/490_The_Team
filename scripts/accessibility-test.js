#!/usr/bin/env node

/**
 * Automated Accessibility Testing Script
 * Runs comprehensive WCAG 2.1 AA compliance checks
 */

import puppeteer from 'puppeteer';
import axeCore from 'axe-core';
import { promises as fs } from 'fs';
import path from 'path';

class AccessibilityTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.outputDir = options.outputDir || './accessibility-reports';
    this.headless = options.headless !== false;
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({ 
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport for consistent testing
    await this.page.setViewport({ width: 1280, height: 720 });
    
    // Inject axe-core into the page
    await this.page.addScriptTag({
      path: new URL('./node_modules/axe-core/axe.min.js', import.meta.url).pathname
    });

    // Create output directory
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async testPage(url, pageName = 'page') {
    console.log(`Testing accessibility for: ${url}`);
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Wait for page to be fully loaded
      await this.page.waitForTimeout(2000);
      
      // Run axe accessibility tests
      const results = await this.page.evaluate(async () => {
        return new Promise((resolve, reject) => {
          axe.run({
            tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
            rules: {
              // Ensure we test all relevant rules
              'color-contrast': { enabled: true },
              'keyboard-navigation': { enabled: true },
              'focus-management': { enabled: true },
              'aria-allowed-attr': { enabled: true },
              'aria-required-attr': { enabled: true },
              'aria-valid-attr-value': { enabled: true },
              'aria-valid-attr': { enabled: true },
              'button-name': { enabled: true },
              'form-field-multiple-labels': { enabled: true },
              'frame-title': { enabled: true },
              'html-has-lang': { enabled: true },
              'html-lang-valid': { enabled: true },
              'image-alt': { enabled: true },
              'input-image-alt': { enabled: true },
              'label': { enabled: true },
              'link-name': { enabled: true },
              'list': { enabled: true },
              'listitem': { enabled: true },
              'page-has-heading-one': { enabled: true },
              'region': { enabled: true },
              'skip-link': { enabled: true },
              'tabindex': { enabled: true }
            }
          }, (err, results) => {
            if (err) reject(err);
            resolve(results);
          });
        });
      });
      
      // Test keyboard navigation
      const keyboardResults = await this.testKeyboardNavigation();
      
      // Test focus management
      const focusResults = await this.testFocusManagement();
      
      // Test color contrast manually (axe sometimes misses issues)
      const contrastResults = await this.testColorContrast();
      
      // Combine all results
      const combinedResults = {
        url,
        timestamp: new Date().toISOString(),
        axeResults: results,
        keyboardNavigation: keyboardResults,
        focusManagement: focusResults,
        colorContrast: contrastResults,
        summary: this.generateSummary(results, keyboardResults, focusResults, contrastResults)
      };
      
      // Save detailed report
      await this.saveReport(combinedResults, pageName);
      
      // Display summary
      this.displaySummary(combinedResults.summary, pageName);
      
      return combinedResults;
      
    } catch (error) {
      console.error(`Error testing ${url}:`, error);
      throw error;
    }
  }

  async testKeyboardNavigation() {
    console.log('  Testing keyboard navigation...');
    
    const results = {
      focusableElements: [],
      tabOrder: [],
      keyboardTraps: [],
      skipLinks: false,
      errors: []
    };

    try {
      // Find all focusable elements
      results.focusableElements = await this.page.evaluate(() => {
        const focusableSelectors = [
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          'a[href]',
          '[tabindex]:not([tabindex="-1"])',
          '[role="button"]:not([disabled])',
          '[role="link"]:not([disabled])'
        ];
        
        const elements = document.querySelectorAll(focusableSelectors.join(', '));
        return Array.from(elements).map(el => ({
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          tabIndex: el.tabIndex,
          hasVisibleFocus: false // Will be tested separately
        }));
      });

      // Test tab order by simulating keyboard navigation
      let currentElement = 0;
      const maxTabs = Math.min(results.focusableElements.length, 50); // Limit to prevent infinite loops

      for (let i = 0; i < maxTabs; i++) {
        await this.page.keyboard.press('Tab');
        await this.page.waitForTimeout(100);
        
        const activeElement = await this.page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el.tagName.toLowerCase(),
            id: el.id,
            className: el.className,
            tabIndex: el.tabIndex
          };
        });
        
        results.tabOrder.push(activeElement);
      }

      // Test for skip links
      await this.page.goto(this.page.url()); // Refresh to test skip links
      await this.page.keyboard.press('Tab');
      
      const firstFocus = await this.page.evaluate(() => {
        const el = document.activeElement;
        return el.textContent?.toLowerCase().includes('skip');
      });
      
      results.skipLinks = firstFocus;

    } catch (error) {
      results.errors.push(`Keyboard navigation test failed: ${error.message}`);
    }

    return results;
  }

  async testFocusManagement() {
    console.log('  Testing focus management...');
    
    const results = {
      visibleFocusIndicators: [],
      focusTraps: [],
      errors: []
    };

    try {
      // Test focus indicators on each focusable element
      const focusableElements = await this.page.$$('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
      
      for (const element of focusableElements.slice(0, 20)) { // Test first 20 elements
        await element.focus();
        await this.page.waitForTimeout(100);
        
        const hasVisibleFocus = await this.page.evaluate((el) => {
          const styles = window.getComputedStyle(el, ':focus');
          const outline = styles.outline;
          const boxShadow = styles.boxShadow;
          const ring = styles.getPropertyValue('--tw-ring-shadow');
          
          return outline !== 'none' || 
                 boxShadow !== 'none' || 
                 ring !== '' ||
                 styles.borderColor !== styles.getPropertyValue('border-color') ||
                 styles.backgroundColor !== styles.getPropertyValue('background-color');
        }, element);
        
        results.visibleFocusIndicators.push({
          element: await element.evaluate(el => ({
            tagName: el.tagName.toLowerCase(),
            id: el.id,
            className: el.className
          })),
          hasVisibleFocus
        });
      }

      // Test modal focus traps (if any modals exist)
      const modals = await this.page.$$('[role="dialog"], .modal, [aria-modal="true"]');
      
      for (const modal of modals) {
        // This would need to be customized based on how modals are triggered
        // For now, just check if they exist
        results.focusTraps.push({
          found: true,
          tested: false,
          reason: 'Modal focus trap testing requires manual trigger'
        });
      }

    } catch (error) {
      results.errors.push(`Focus management test failed: ${error.message}`);
    }

    return results;
  }

  async testColorContrast() {
    console.log('  Testing color contrast...');
    
    const results = {
      contrastIssues: [],
      errors: []
    };

    try {
      // This is a basic contrast check - in production, you'd want a more sophisticated tool
      const contrastIssues = await this.page.evaluate(() => {
        const issues = [];
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, label, button, a');
        
        for (const element of textElements) {
          if (element.children.length === 0 && element.textContent?.trim()) {
            const styles = window.getComputedStyle(element);
            const color = styles.color;
            const backgroundColor = styles.backgroundColor;
            
            // Basic check - in reality you'd calculate actual contrast ratios
            if (color === 'rgb(128, 128, 128)' && backgroundColor === 'rgb(255, 255, 255)') {
              issues.push({
                element: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ''),
                color,
                backgroundColor,
                issue: 'Potentially low contrast'
              });
            }
          }
        }
        
        return issues;
      });
      
      results.contrastIssues = contrastIssues;

    } catch (error) {
      results.errors.push(`Color contrast test failed: ${error.message}`);
    }

    return results;
  }

  generateSummary(axeResults, keyboardResults, focusResults, contrastResults) {
    const critical = axeResults.violations.filter(v => v.impact === 'critical').length;
    const serious = axeResults.violations.filter(v => v.impact === 'serious').length;
    const moderate = axeResults.violations.filter(v => v.impact === 'moderate').length;
    const minor = axeResults.violations.filter(v => v.impact === 'minor').length;
    
    const totalViolations = critical + serious + moderate + minor;
    const score = Math.max(0, 100 - (critical * 25 + serious * 10 + moderate * 5 + minor * 2));
    
    return {
      score,
      wcag2aaCompliant: critical === 0 && serious === 0,
      totalViolations,
      violationsByImpact: { critical, serious, moderate, minor },
      keyboardAccessible: keyboardResults.errors.length === 0,
      hasSkipLinks: keyboardResults.skipLinks,
      focusManagementIssues: focusResults.visibleFocusIndicators.filter(f => !f.hasVisibleFocus).length,
      contrastIssues: contrastResults.contrastIssues.length
    };
  }

  async saveReport(results, pageName) {
    const fileName = `${pageName}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(this.outputDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(results, null, 2));
    
    // Also create a human-readable HTML report
    const htmlReport = this.generateHTMLReport(results);
    const htmlFileName = fileName.replace('.json', '.html');
    await fs.writeFile(path.join(this.outputDir, htmlFileName), htmlReport);
    
    console.log(`  Report saved: ${fileName}`);
  }

  generateHTMLReport(results) {
    const { summary, axeResults } = results;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report - ${results.url}</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.6; }
        .score { font-size: 2rem; font-weight: bold; margin: 1rem 0; }
        .score.good { color: #22c55e; }
        .score.warning { color: #f59e0b; }
        .score.error { color: #ef4444; }
        .violation { border-left: 4px solid #ef4444; padding: 1rem; margin: 1rem 0; background: #fef2f2; }
        .violation.moderate { border-color: #f59e0b; background: #fffbeb; }
        .violation.minor { border-color: #06b6d4; background: #f0f9ff; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
        .summary-card { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
    </style>
</head>
<body>
    <h1>Accessibility Report</h1>
    <p><strong>URL:</strong> ${results.url}</p>
    <p><strong>Tested:</strong> ${new Date(results.timestamp).toLocaleString()}</p>
    
    <div class="score ${summary.score >= 90 ? 'good' : summary.score >= 70 ? 'warning' : 'error'}">
        Accessibility Score: ${summary.score}/100
    </div>
    
    <div class="summary-grid">
        <div class="summary-card">
            <h3>WCAG 2.1 AA Compliance</h3>
            <p>${summary.wcag2aaCompliant ? '✅ Compliant' : '❌ Not Compliant'}</p>
        </div>
        <div class="summary-card">
            <h3>Total Violations</h3>
            <p>${summary.totalViolations}</p>
        </div>
        <div class="summary-card">
            <h3>Keyboard Accessible</h3>
            <p>${summary.keyboardAccessible ? '✅ Yes' : '❌ No'}</p>
        </div>
        <div class="summary-card">
            <h3>Skip Links</h3>
            <p>${summary.hasSkipLinks ? '✅ Present' : '❌ Missing'}</p>
        </div>
    </div>
    
    <h2>Violations by Impact</h2>
    <ul>
        <li>Critical: ${summary.violationsByImpact.critical}</li>
        <li>Serious: ${summary.violationsByImpact.serious}</li>
        <li>Moderate: ${summary.violationsByImpact.moderate}</li>
        <li>Minor: ${summary.violationsByImpact.minor}</li>
    </ul>
    
    <h2>Detailed Violations</h2>
    ${axeResults.violations.map(violation => `
        <div class="violation ${violation.impact}">
            <h3>${violation.help}</h3>
            <p><strong>Impact:</strong> ${violation.impact}</p>
            <p><strong>Description:</strong> ${violation.description}</p>
            <p><strong>Help URL:</strong> <a href="${violation.helpUrl}" target="_blank">${violation.helpUrl}</a></p>
            <p><strong>Elements affected:</strong> ${violation.nodes.length}</p>
        </div>
    `).join('')}
    
    ${axeResults.violations.length === 0 ? '<p>🎉 No accessibility violations found!</p>' : ''}
</body>
</html>`;
  }

  displaySummary(summary, pageName) {
    console.log(`\n📊 Accessibility Summary for ${pageName}:`);
    console.log(`Score: ${summary.score}/100`);
    console.log(`WCAG 2.1 AA Compliant: ${summary.wcag2aaCompliant ? '✅' : '❌'}`);
    console.log(`Total Violations: ${summary.totalViolations}`);
    console.log(`  Critical: ${summary.violationsByImpact.critical}`);
    console.log(`  Serious: ${summary.violationsByImpact.serious}`);
    console.log(`  Moderate: ${summary.violationsByImpact.moderate}`);
    console.log(`  Minor: ${summary.violationsByImpact.minor}`);
    console.log(`Keyboard Accessible: ${summary.keyboardAccessible ? '✅' : '❌'}`);
    console.log(`Skip Links: ${summary.hasSkipLinks ? '✅' : '❌'}`);
    console.log('');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testMultiplePages(pages) {
    const results = [];
    
    for (const [pageName, url] of Object.entries(pages)) {
      try {
        const result = await this.testPage(url, pageName);
        results.push(result);
      } catch (error) {
        console.error(`Failed to test ${pageName}:`, error);
        results.push({
          pageName,
          url,
          error: error.message,
          summary: { score: 0, wcag2aaCompliant: false }
        });
      }
    }
    
    // Generate overall summary
    this.generateOverallSummary(results);
    
    return results;
  }

  generateOverallSummary(results) {
    const validResults = results.filter(r => !r.error);
    const avgScore = validResults.reduce((sum, r) => sum + r.summary.score, 0) / validResults.length;
    const compliantPages = validResults.filter(r => r.summary.wcag2aaCompliant).length;
    
    console.log('\n🎯 Overall Accessibility Summary:');
    console.log(`Average Score: ${avgScore.toFixed(1)}/100`);
    console.log(`WCAG 2.1 AA Compliant Pages: ${compliantPages}/${validResults.length}`);
    console.log(`Pages with Critical Issues: ${validResults.filter(r => r.summary.violationsByImpact.critical > 0).length}`);
    console.log(`Pages with Serious Issues: ${validResults.filter(r => r.summary.violationsByImpact.serious > 0).length}`);
  }
}

// Example usage
async function runAccessibilityTests() {
  const tester = new AccessibilityTester({
    baseUrl: 'http://localhost:3000',
    outputDir: './accessibility-reports'
  });

  try {
    await tester.initialize();
    
    // Test multiple pages
    const pagesToTest = {
      'dashboard': 'http://localhost:3000/dashboard',
      'jobs': 'http://localhost:3000/jobs',
      'cover-letters': 'http://localhost:3000/cover-letters',
      'profile': 'http://localhost:3000/profile-settings',
      'networking': 'http://localhost:3000/networking'
    };
    
    await tester.testMultiplePages(pagesToTest);
    
  } finally {
    await tester.close();
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAccessibilityTests().catch(console.error);
}

export default AccessibilityTester;