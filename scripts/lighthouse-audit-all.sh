#!/bin/bash

# Source - https://stackoverflow.com/a
# Posted by Kayce Basques
# Retrieved 2025-12-14, License - CC BY-SA 3.0

# Comprehensive Lighthouse Audit Script for Job Search Application
# This script runs Lighthouse audits on all major pages of the application

# Base URL for the application
BASE_URL="http://localhost:8083"

# Array of all application pages to test
urls=(
    "$BASE_URL/"
    "$BASE_URL/dashboard"
    "$BASE_URL/jobs"
    "$BASE_URL/cover-letters"
    "$BASE_URL/resumes"
    "$BASE_URL/doc-management"
    "$BASE_URL/profile-settings"
    "$BASE_URL/profile-enhanced"
    "$BASE_URL/analytics-hub"
    "$BASE_URL/stats"
    "$BASE_URL/salary-analytics"
    "$BASE_URL/predictive-analytics"
    "$BASE_URL/offer-comparison"
    "$BASE_URL/job-map"
    "$BASE_URL/monitoring-dashboard"
    "$BASE_URL/preparation-hub"
    "$BASE_URL/performance-improvement"
    "$BASE_URL/skill-development"
    "$BASE_URL/career-goals"
    "$BASE_URL/progress-sharing"
    "$BASE_URL/productivity-analysis"
    "$BASE_URL/technical-prep"
    "$BASE_URL/interview-questions"
    "$BASE_URL/networking"
    "$BASE_URL/referrals"
    "$BASE_URL/references"
    "$BASE_URL/teams"
    "$BASE_URL/mentors"
    "$BASE_URL/events"
    "$BASE_URL/networking-campaigns"
    "$BASE_URL/family-support"
    "$BASE_URL/enterprise"
    "$BASE_URL/external-advisors"
    "$BASE_URL/ab-testing"
    "$BASE_URL/documentation"
    "$BASE_URL/getting-started"
    "$BASE_URL/faq"
)

# Create reports directory
REPORTS_DIR="lighthouse-reports-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$REPORTS_DIR"

echo "🚀 Starting Lighthouse audit for $(echo ${#urls[@]}) pages..."
echo "📁 Reports will be saved to: $REPORTS_DIR"
echo ""

# Counter for progress tracking
count=0
total=${#urls[@]}
failed_urls=()
successful_urls=()

for url in "${urls[@]}"; do
    count=$((count + 1))
    page_name=$(basename "$url")
    
    # Use homepage if basename is empty
    if [ "$page_name" == "3000" ] || [ -z "$page_name" ]; then
        page_name="homepage"
    fi
    
    echo "[$count/$total] Testing: $url"
    echo "           Page: $page_name"
    
    # Run Lighthouse with comprehensive options
    lighthouse "$url" \
        --output=html,json \
        --output-path="$REPORTS_DIR/$page_name" \
        --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
        --quiet \
        --no-enable-error-reporting \
        --form-factor=desktop \
        --screenEmulation.disabled \
        --throttling-method=devtools
    
    # Check if lighthouse command was successful
    if [ $? -eq 0 ]; then
        successful_urls+=("$url")
        echo "           ✅ Success"
    else
        failed_urls+=("$url")
        echo "           ❌ Failed"
    fi
    
    echo ""
done

# Generate summary report
echo "📊 Lighthouse Audit Summary"
echo "============================"
echo "Total pages tested: $total"
echo "Successful audits: ${#successful_urls[@]}"
echo "Failed audits: ${#failed_urls[@]}"
echo ""

if [ ${#failed_urls[@]} -gt 0 ]; then
    echo "❌ Failed URLs:"
    for failed_url in "${failed_urls[@]}"; do
        echo "   - $failed_url"
    done
    echo ""
fi

echo "✅ Successful audits saved to: $REPORTS_DIR/"
echo ""

# Create an index HTML file to easily view all reports
cat > "$REPORTS_DIR/index.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse Audit Results - $(date)</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.6; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 2rem; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .summary-card { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; text-align: center; }
        .summary-card h3 { margin: 0 0 0.5rem 0; font-size: 2rem; }
        .links { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .link-card { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
        .link-card h3 { margin: 0 0 0.5rem 0; }
        .link-card a { color: #2563eb; text-decoration: none; }
        .link-card a:hover { text-decoration: underline; }
        .failed { background-color: #fef2f2; border-color: #fecaca; }
        .success { background-color: #f0fdf4; border-color: #bbf7d0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Lighthouse Audit Results</h1>
        <p>Generated on: $(date)</p>
        <p>Base URL: $BASE_URL</p>
    </div>
    
    <div class="summary">
        <div class="summary-card">
            <h3>$total</h3>
            <p>Total Pages</p>
        </div>
        <div class="summary-card success">
            <h3>${#successful_urls[@]}</h3>
            <p>Successful</p>
        </div>
        <div class="summary-card failed">
            <h3>${#failed_urls[@]}</h3>
            <p>Failed</p>
        </div>
    </div>
    
    <h2>Audit Reports</h2>
    <div class="links">
EOF

# Add links for each successful report
for url in "${successful_urls[@]}"; do
    page_name=$(basename "$url")
    if [ "$page_name" == "3000" ] || [ -z "$page_name" ]; then
        page_name="homepage"
    fi
    
    cat >> "$REPORTS_DIR/index.html" << EOF
        <div class="link-card success">
            <h3>$page_name</h3>
            <p><strong>URL:</strong> $url</p>
            <p>
                <a href="./$page_name.report.html" target="_blank">📊 HTML Report</a> | 
                <a href="./$page_name.report.json" target="_blank">📋 JSON Data</a>
            </p>
        </div>
EOF
done

# Add failed URLs if any
for url in "${failed_urls[@]}"; do
    page_name=$(basename "$url")
    if [ "$page_name" == "3000" ] || [ -z "$page_name" ]; then
        page_name="homepage"
    fi
    
    cat >> "$REPORTS_DIR/index.html" << EOF
        <div class="link-card failed">
            <h3>$page_name</h3>
            <p><strong>URL:</strong> $url</p>
            <p>❌ Audit failed</p>
        </div>
EOF
done

cat >> "$REPORTS_DIR/index.html" << EOF
    </div>
    
    <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
        <h3>How to Use These Reports</h3>
        <ul>
            <li>Click on "HTML Report" links to view detailed Lighthouse analysis</li>
            <li>Use JSON files for programmatic analysis or CI/CD integration</li>
            <li>Focus on Performance, Accessibility, Best Practices, and SEO scores</li>
            <li>Address any issues with scores below 90</li>
        </ul>
        
        <h3>Quick Analysis</h3>
        <p>Look for:</p>
        <ul>
            <li><strong>Accessibility:</strong> Should be 90+ (ideally 100)</li>
            <li><strong>Best Practices:</strong> Should be 90+ (ideally 100)</li>
            <li><strong>SEO:</strong> Should be 90+ (ideally 100)</li>
            <li><strong>Performance:</strong> 50+ acceptable, 90+ excellent</li>
        </ul>
    </div>
</body>
</html>
EOF

echo "📋 Index file created: $REPORTS_DIR/index.html"
echo "🌐 Open this file in your browser to navigate all reports"
echo ""
echo "🎯 Next steps:"
echo "   1. Open $REPORTS_DIR/index.html in your browser"
echo "   2. Review any failed audits and fix underlying issues"
echo "   3. Focus on pages with accessibility scores < 90"
echo "   4. Address performance issues on critical pages"
echo ""
echo "✨ Audit complete!"