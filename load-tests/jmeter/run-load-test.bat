@echo off
REM =============================================================================
REM JMeter Load Test Runner Script for Windows
REM =============================================================================
REM Usage: run-load-test.bat [test-type] [options]
REM
REM Test Types:
REM   smoke     - Quick validation (5 users, 1 minute)
REM   baseline  - Normal load (50 users, 3 minutes)
REM   peak      - Peak load (100 users, 5 minutes)
REM   stress    - Stress test (150 users, 7 minutes)
REM   frontend  - Frontend page tests only
REM   api       - API endpoint tests only
REM   file      - File operation tests only
REM
REM Examples:
REM   run-load-test.bat smoke
REM   run-load-test.bat peak
REM   run-load-test.bat baseline
REM =============================================================================

setlocal enabledelayedexpansion

REM Configuration
set SCRIPT_DIR=%~dp0
set RESULTS_DIR=%SCRIPT_DIR%results
set TIMESTAMP=%date:~-4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

REM Default values
set TEST_TYPE=baseline
set BASE_URL=
set MAX_USERS=
set DURATION=

REM Parse arguments
if "%1"=="" goto :set_defaults
set TEST_TYPE=%1

if "%2"=="--url" set BASE_URL=%3
if "%4"=="--users" set MAX_USERS=%5
if "%6"=="--duration" set DURATION=%7

:set_defaults

REM Check if JMeter is available
where jmeter >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] JMeter is not installed or not in PATH
    echo.
    echo Install JMeter:
    echo   1. Download from https://jmeter.apache.org/download_jmeter.cgi
    echo   2. Extract and add bin directory to PATH
    exit /b 1
)

echo [INFO] JMeter found

REM Set test configuration based on type
if "%TEST_TYPE%"=="smoke" (
    if "%MAX_USERS%"=="" set MAX_USERS=5
    if "%DURATION%"=="" set DURATION=60
    set TEST_PLAN=main-test-plan.jmx
)
if "%TEST_TYPE%"=="baseline" (
    if "%MAX_USERS%"=="" set MAX_USERS=50
    if "%DURATION%"=="" set DURATION=180
    set TEST_PLAN=main-test-plan.jmx
)
if "%TEST_TYPE%"=="peak" (
    if "%MAX_USERS%"=="" set MAX_USERS=100
    if "%DURATION%"=="" set DURATION=300
    set TEST_PLAN=main-test-plan.jmx
)
if "%TEST_TYPE%"=="stress" (
    if "%MAX_USERS%"=="" set MAX_USERS=150
    if "%DURATION%"=="" set DURATION=420
    set TEST_PLAN=main-test-plan.jmx
)
if "%TEST_TYPE%"=="frontend" (
    if "%MAX_USERS%"=="" set MAX_USERS=50
    if "%DURATION%"=="" set DURATION=300
    set TEST_PLAN=frontend-tests.jmx
)
if "%TEST_TYPE%"=="api" (
    if "%MAX_USERS%"=="" set MAX_USERS=50
    if "%DURATION%"=="" set DURATION=300
    set TEST_PLAN=api-tests.jmx
)
if "%TEST_TYPE%"=="file" (
    if "%MAX_USERS%"=="" set MAX_USERS=30
    if "%DURATION%"=="" set DURATION=180
    set TEST_PLAN=file-tests.jmx
)

REM Create results directory
if not exist "%RESULTS_DIR%" mkdir "%RESULTS_DIR%"

REM Calculate ramp-up time (1/3 of duration)
set /a RAMPUP=%DURATION% / 3

echo.
echo ==============================================
echo   JobQuest JMeter Load Test Runner
echo ==============================================
echo.
echo [INFO] Test Configuration:
echo   Type: %TEST_TYPE%
echo   Plan: %TEST_PLAN%
echo   Users: %MAX_USERS%
echo   Duration: %DURATION%s
echo   Ramp-up: %RAMPUP%s
echo.

REM Build JMeter command
set CMD=jmeter -n
set CMD=%CMD% -Jusers.max=%MAX_USERS%
set CMD=%CMD% -Jduration.seconds=%DURATION%
set CMD=%CMD% -Jrampup.seconds=%RAMPUP%

if not "%BASE_URL%"=="" (
    set CMD=%CMD% -Jbase.url=%BASE_URL%
)

set CMD=%CMD% -t "%SCRIPT_DIR%%TEST_PLAN%"
set CMD=%CMD% -l "%RESULTS_DIR%\%TEST_TYPE%_%TIMESTAMP%.jtl"
set CMD=%CMD% -j "%RESULTS_DIR%\%TEST_TYPE%_%TIMESTAMP%.log"

echo [INFO] Executing: %CMD%
echo.

%CMD%

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Test completed successfully!
    echo [INFO] Results saved to: %RESULTS_DIR%\%TEST_TYPE%_%TIMESTAMP%.jtl
) else (
    echo.
    echo [ERROR] Test failed!
    echo [INFO] Check log file: %RESULTS_DIR%\%TEST_TYPE%_%TIMESTAMP%.log
)

endlocal
