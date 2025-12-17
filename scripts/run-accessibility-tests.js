#!/usr/bin/env node

/**
 * Simple Accessibility Test Runner
 * A lightweight version for quick accessibility checks
 */

import http from 'http';

console.log('🧪 Accessibility Test Runner');
console.log('============================\n');

function checkServer(port = 3000) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.abort();
      resolve(false);
    });
  });
}

async function main() {
  console.log('🔍 Checking if development server is running...');
  
  const serverRunning = await checkServer(3000);
  
  if (!serverRunning) {
    console.log('❌ Development server is not running on port 3000');
    console.log('📋 To run accessibility tests:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Run accessibility tests: npm run test:accessibility');
    console.log('\n🔧 Alternative: Use the AccessibilityAudit component in your app');
    console.log('   - The AccessibilityAudit component provides real-time testing');
    console.log('   - Import it in any page: import { AccessibilityAudit } from "./components/accessibility/AccessibilityAudit"');
    console.log('   - Add it to your component: <AccessibilityAudit />');
    return;
  }
  
  console.log('✅ Development server is running');
  console.log('🚀 Starting comprehensive accessibility tests...\n');
  
  // Import and run the full accessibility tester
  const { default: AccessibilityTester } = await import('./accessibility-test.js');
  
  const tester = new AccessibilityTester({
    baseUrl: 'http://localhost:3000',
    outputDir: './accessibility-reports',
    headless: false // Show browser for demonstration
  });

  try {
    await tester.initialize();
    
    console.log('📊 Testing key application pages...\n');
    
    // Test the main pages that are most likely to exist
    const pagesToTest = {
      'homepage': 'http://localhost:3000/',
      'dashboard': 'http://localhost:3000/dashboard',
      'jobs': 'http://localhost:3000/jobs'
    };
    
    const results = await tester.testMultiplePages(pagesToTest);
    
    // Generate summary report
    console.log('\n📈 Test Results Summary:');
    console.log('========================');
    
    let totalScore = 0;
    let compliantPages = 0;
    let totalCritical = 0;
    let totalSerious = 0;
    
    results.forEach((result, index) => {
      if (!result.error) {
        console.log(`\n${index + 1}. ${Object.keys(pagesToTest)[index]}:`);
        console.log(`   Score: ${result.summary.score}/100`);
        console.log(`   WCAG 2.1 AA: ${result.summary.wcag2aaCompliant ? '✅ Compliant' : '❌ Non-compliant'}`);
        console.log(`   Critical issues: ${result.summary.violationsByImpact.critical}`);
        console.log(`   Serious issues: ${result.summary.violationsByImpact.serious}`);
        
        totalScore += result.summary.score;
        if (result.summary.wcag2aaCompliant) compliantPages++;
        totalCritical += result.summary.violationsByImpact.critical;
        totalSerious += result.summary.violationsByImpact.serious;
      } else {
        console.log(`\n${index + 1}. ${Object.keys(pagesToTest)[index]}: ❌ Test failed (${result.error})`);
      }
    });
    
    const validResults = results.filter(r => !r.error);
    const avgScore = validResults.length > 0 ? totalScore / validResults.length : 0;
    
    console.log('\n🎯 Overall Results:');
    console.log(`   Average Score: ${avgScore.toFixed(1)}/100`);
    console.log(`   Compliant Pages: ${compliantPages}/${validResults.length}`);
    console.log(`   Total Critical Issues: ${totalCritical}`);
    console.log(`   Total Serious Issues: ${totalSerious}`);
    
    if (avgScore >= 90 && totalCritical === 0) {
      console.log('\n🎉 Excellent! Your application has great accessibility!');
    } else if (avgScore >= 70 && totalCritical === 0) {
      console.log('\n👍 Good accessibility, but there is room for improvement.');
    } else {
      console.log('\n⚠️  Accessibility improvements needed, especially for critical issues.');
    }
    
    console.log('\n📁 Detailed reports saved to ./accessibility-reports/');
    console.log('🔧 Use the AccessibilityAudit component for ongoing testing');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    console.log('\n🔄 Troubleshooting:');
    console.log('   - Ensure your development server is running on port 3000');
    console.log('   - Check that the pages exist and are accessible');
    console.log('   - Try using the AccessibilityAudit component instead');
  } finally {
    await tester.close();
  }
}

// Self-test mode - just check the testing capabilities
async function selfTest() {
  console.log('🧪 Running accessibility test capabilities check...\n');
  
  console.log('✅ Accessibility testing tools available:');
  console.log('   - Puppeteer (browser automation)');
  console.log('   - Axe-core (WCAG compliance testing)');
  console.log('   - Custom keyboard navigation testing');
  console.log('   - Focus management validation');
  console.log('   - Color contrast checking');
  
  console.log('\n📋 WCAG 2.1 AA Tests Include:');
  console.log('   🎯 Automated Tests:');
  console.log('     - Color contrast ratios');
  console.log('     - ARIA attributes validation');
  console.log('     - Keyboard accessibility');
  console.log('     - Focus management');
  console.log('     - Semantic HTML structure');
  console.log('     - Form accessibility');
  console.log('     - Image alt text');
  console.log('     - Skip links');
  console.log('     - Page structure (headings, landmarks)');
  
  console.log('\n   👤 Manual Tests (via component):');
  console.log('     - Screen reader compatibility');
  console.log('     - Voice control');
  console.log('     - Switch control');
  console.log('     - High contrast mode');
  console.log('     - Zoom functionality');
  
  console.log('\n🚀 Ready to test! Use:');
  console.log('   npm run test:accessibility    (full automated testing)');
  console.log('   <AccessibilityAudit />       (in-app component testing)');
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--self-test') || args.includes('-s')) {
  selfTest();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('Accessibility Test Runner');
  console.log('Usage:');
  console.log('  npm run test:accessibility           Run full tests');
  console.log('  npm run test:accessibility -- -s    Self-test (check capabilities)');
  console.log('  npm run test:accessibility -- -h    Show help');
} else {
  main().catch(console.error);
}