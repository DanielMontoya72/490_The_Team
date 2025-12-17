@echo off
REM Windows batch version of the Lighthouse audit script

REM Source - https://stackoverflow.com/a
REM Posted by Kayce Basques
REM Retrieved 2025-12-14, License - CC BY-SA 3.0

echo 🚀 Lighthouse Audit Script for Job Search Application
echo ====================================================

REM Base URL for the application
set BASE_URL=http://localhost:8083

REM Create reports directory with timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "REPORTS_DIR=lighthouse-reports-%YYYY%%MM%%DD%_%HH%%Min%%Sec%"

mkdir "%REPORTS_DIR%"

echo 📁 Reports will be saved to: %REPORTS_DIR%
echo.

REM Initialize counters
set count=0
set total=0
set successful=0
set failed=0

REM Count total URLs first
for %%u in (
    "%BASE_URL%/"
    "%BASE_URL%/dashboard"
    "%BASE_URL%/jobs"
    "%BASE_URL%/cover-letters"
    "%BASE_URL%/resumes"
    "%BASE_URL%/doc-management"
    "%BASE_URL%/profile-settings"
    "%BASE_URL%/profile-enhanced"
    "%BASE_URL%/analytics-hub"
    "%BASE_URL%/stats"
    "%BASE_URL%/salary-analytics"
    "%BASE_URL%/predictive-analytics"
    "%BASE_URL%/offer-comparison"
    "%BASE_URL%/job-map"
    "%BASE_URL%/monitoring-dashboard"
    "%BASE_URL%/preparation-hub"
    "%BASE_URL%/performance-improvement"
    "%BASE_URL%/skill-development"
    "%BASE_URL%/career-goals"
    "%BASE_URL%/progress-sharing"
    "%BASE_URL%/productivity-analysis"
    "%BASE_URL%/technical-prep"
    "%BASE_URL%/interview-questions"
    "%BASE_URL%/networking"
    "%BASE_URL%/referrals"
    "%BASE_URL%/references"
    "%BASE_URL%/teams"
    "%BASE_URL%/mentors"
    "%BASE_URL%/events"
    "%BASE_URL%/networking-campaigns"
    "%BASE_URL%/family-support"
    "%BASE_URL%/enterprise"
    "%BASE_URL%/external-advisors"
    "%BASE_URL%/ab-testing"
    "%BASE_URL%/documentation"
    "%BASE_URL%/getting-started"
    "%BASE_URL%/faq"
) do set /a total+=1

echo Starting audit of %total% pages...
echo.

REM Process each URL
for %%u in (
    "%BASE_URL%/"
    "%BASE_URL%/dashboard"
    "%BASE_URL%/jobs"
    "%BASE_URL%/cover-letters"
    "%BASE_URL%/resumes"
    "%BASE_URL%/doc-management"
    "%BASE_URL%/profile-settings"
    "%BASE_URL%/profile-enhanced"
    "%BASE_URL%/analytics-hub"
    "%BASE_URL%/stats"
    "%BASE_URL%/salary-analytics"
    "%BASE_URL%/predictive-analytics"
    "%BASE_URL%/offer-comparison"
    "%BASE_URL%/job-map"
    "%BASE_URL%/monitoring-dashboard"
    "%BASE_URL%/preparation-hub"
    "%BASE_URL%/performance-improvement"
    "%BASE_URL%/skill-development"
    "%BASE_URL%/career-goals"
    "%BASE_URL%/progress-sharing"
    "%BASE_URL%/productivity-analysis"
    "%BASE_URL%/technical-prep"
    "%BASE_URL%/interview-questions"
    "%BASE_URL%/networking"
    "%BASE_URL%/referrals"
    "%BASE_URL%/references"
    "%BASE_URL%/teams"
    "%BASE_URL%/mentors"
    "%BASE_URL%/events"
    "%BASE_URL%/networking-campaigns"
    "%BASE_URL%/family-support"
    "%BASE_URL%/enterprise"
    "%BASE_URL%/external-advisors"
    "%BASE_URL%/ab-testing"
    "%BASE_URL%/documentation"
    "%BASE_URL%/getting-started"
    "%BASE_URL%/faq"
) do (
    set /a count+=1
    
    REM Extract page name from URL
    set "url=%%~u"
    call :GetPageName "!url!" pagename
    
    echo [!count!/%total%] Testing: !url!
    echo            Page: !pagename!
    
    REM Run Lighthouse
    lighthouse "!url!" --output=html,json --output-path="%REPORTS_DIR%\!pagename!" --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" --quiet --no-enable-error-reporting --form-factor=desktop --screenEmulation.disabled --throttling-method=devtools
    
    if !errorlevel! equ 0 (
        echo            ✅ Success
        set /a successful+=1
    ) else (
        echo            ❌ Failed
        set /a failed+=1
    )
    echo.
)

echo 📊 Lighthouse Audit Summary
echo ============================
echo Total pages tested: %total%
echo Successful audits: %successful%
echo Failed audits: %failed%
echo.
echo ✅ Reports saved to: %REPORTS_DIR%\
echo 📋 Open %REPORTS_DIR%\*.report.html files to view detailed results
echo.
echo 🎯 Next steps:
echo    1. Review any failed audits and fix underlying issues
echo    2. Focus on pages with accessibility scores ^< 90
echo    3. Address performance issues on critical pages
echo.
echo ✨ Audit complete!
pause
goto :eof

:GetPageName
set "input=%~1"
for %%f in ("%input%") do set "result=%%~nxf"
if "%result%"=="3000" set "result=homepage"
if "%result%"=="" set "result=homepage"
if "%result%"=="/" set "result=homepage"
set "%~2=%result%"
goto :eof