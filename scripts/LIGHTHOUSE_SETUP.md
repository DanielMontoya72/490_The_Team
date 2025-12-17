# Lighthouse CLI Setup Instructions

## Prerequisites

### Install Lighthouse CLI globally:
```bash
npm install -g lighthouse
```

### Verify installation:
```bash
lighthouse --version
```

## Usage

### Option 1: Unix/Linux/macOS (recommended)
```bash
npm run lighthouse:all
```

### Option 2: Windows Batch Script
```cmd
npm run lighthouse:all-windows
```

### Option 3: Manual execution
```bash
# Unix/Linux/macOS
bash scripts/lighthouse-audit-all.sh

# Windows
scripts\lighthouse-audit-all.bat
```

## What the Script Tests

The script audits **38 pages** of your application:

### Core Pages (7)
- Homepage (`/`)
- Dashboard (`/dashboard`)
- Jobs (`/jobs`)
- Cover Letters (`/cover-letters`)
- Resumes (`/resumes`)
- Document Management (`/doc-management`)
- Profile Settings (`/profile-settings`, `/profile-enhanced`)

### Analytics Pages (7)
- Analytics Hub (`/analytics-hub`)
- Statistics (`/stats`)
- Salary Analytics (`/salary-analytics`)
- Predictive Analytics (`/predictive-analytics`)
- Offer Comparison (`/offer-comparison`)
- Job Map (`/job-map`)
- Monitoring Dashboard (`/monitoring-dashboard`)

### Preparation Pages (8)
- Preparation Hub (`/preparation-hub`)
- Performance Improvement (`/performance-improvement`)
- Skill Development (`/skill-development`)
- Career Goals (`/career-goals`)
- Progress Sharing (`/progress-sharing`)
- Productivity Analysis (`/productivity-analysis`)
- Technical Prep (`/technical-prep`)
- Interview Questions (`/interview-questions`)

### Networking Pages (9)
- Networking (`/networking`)
- Referrals (`/referrals`)
- References (`/references`)
- Teams (`/teams`)
- Mentors (`/mentors`)
- Events (`/events`)
- Networking Campaigns (`/networking-campaigns`)
- Family Support (`/family-support`)
- Enterprise (`/enterprise`)
- External Advisors (`/external-advisors`)

### Documentation Pages (4)
- A/B Testing (`/ab-testing`)
- Documentation (`/documentation`)
- Getting Started (`/getting-started`)
- FAQ (`/faq`)

## Output

### Reports Directory
```
lighthouse-reports-YYYYMMDD_HHMMSS/
├── index.html                 # Navigation dashboard
├── homepage.report.html       # Homepage audit
├── homepage.report.json       # Homepage data
├── dashboard.report.html      # Dashboard audit
├── dashboard.report.json      # Dashboard data
├── jobs.report.html          # Jobs page audit
├── jobs.report.json          # Jobs page data
└── ... (all other pages)
```

### Key Features
- **HTML Reports**: Visual Lighthouse results for each page
- **JSON Data**: Machine-readable audit data
- **Index Dashboard**: Single page to navigate all reports
- **Summary Statistics**: Success/failure counts
- **Failed URL Tracking**: Lists any pages that couldn't be audited

## Lighthouse Scoring

Each page receives scores for:
- **Performance** (0-100): Load speed and runtime performance
- **Accessibility** (0-100): WCAG compliance and usability
- **Best Practices** (0-100): Web development best practices
- **SEO** (0-100): Search engine optimization

### Target Scores
- **Accessibility**: 90+ (ideally 100)
- **Best Practices**: 90+ (ideally 100) 
- **SEO**: 90+ (ideally 100)
- **Performance**: 50+ acceptable, 90+ excellent

## Before Running

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Verify server is running**:
   - Open http://localhost:3000 in browser
   - Ensure all pages load without errors

3. **Install Lighthouse CLI** (if not installed):
   ```bash
   npm install -g lighthouse
   ```

## Example Usage

```bash
# Start development server (in one terminal)
npm run dev

# Run comprehensive audit (in another terminal)  
npm run lighthouse:all

# Results will be in lighthouse-reports-YYYYMMDD_HHMMSS/
# Open index.html to navigate all reports
```

## Troubleshooting

### Common Issues
1. **"lighthouse command not found"**: Install Lighthouse CLI globally
2. **Server not running**: Ensure `npm run dev` is active
3. **Permission denied**: Make script executable with `chmod +x scripts/lighthouse-audit-all.sh`
4. **Chrome/Chromium missing**: Lighthouse requires Chrome/Chromium browser

### Failed Audits
- Check if the page URL exists and loads properly
- Verify authentication isn't required for the page
- Ensure no JavaScript errors prevent page rendering

## Integration with CI/CD

The JSON reports can be used for automated testing:
```bash
# Example: Fail build if accessibility score < 90
lighthouse $URL --output=json | jq '.categories.accessibility.score * 100 < 90'
```