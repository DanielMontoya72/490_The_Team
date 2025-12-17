#!/bin/bash
# =============================================================================
# JMeter Load Test Runner Script
# =============================================================================
# Usage: ./run-load-test.sh [test-type] [options]
#
# Test Types:
#   smoke     - Quick validation (5 users, 1 minute)
#   baseline  - Normal load (50 users, 3 minutes)
#   peak      - Peak load (100 users, 5 minutes)
#   stress    - Stress test (150 users, 7 minutes)
#   frontend  - Frontend page tests only
#   api       - API endpoint tests only
#   file      - File operation tests only
#   all       - Run all test plans sequentially
#
# Options:
#   --url URL        Override base URL
#   --users N        Override max users
#   --duration N     Override duration (seconds)
#   --gui            Run with GUI (for debugging)
#   --report         Generate HTML report
#
# Examples:
#   ./run-load-test.sh smoke
#   ./run-load-test.sh peak --url https://staging.example.com
#   ./run-load-test.sh baseline --users 75 --duration 300
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.properties"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Default values
TEST_TYPE="baseline"
BASE_URL=""
MAX_USERS=""
DURATION=""
RUN_GUI=false
GENERATE_REPORT=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if JMeter is installed
check_jmeter() {
    if ! command -v jmeter &> /dev/null; then
        print_error "JMeter is not installed or not in PATH"
        echo ""
        echo "Install JMeter:"
        echo "  macOS:   brew install jmeter"
        echo "  Ubuntu:  apt-get install jmeter"
        echo "  Windows: Download from https://jmeter.apache.org/download_jmeter.cgi"
        exit 1
    fi
    print_success "JMeter found: $(jmeter --version 2>&1 | head -1)"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            smoke|baseline|peak|stress|frontend|api|file|all)
                TEST_TYPE="$1"
                shift
                ;;
            --url)
                BASE_URL="$2"
                shift 2
                ;;
            --users)
                MAX_USERS="$2"
                shift 2
                ;;
            --duration)
                DURATION="$2"
                shift 2
                ;;
            --gui)
                RUN_GUI=true
                shift
                ;;
            --report)
                GENERATE_REPORT=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help
show_help() {
    head -40 "$0" | tail -37
}

# Get test configuration based on type
get_test_config() {
    case $TEST_TYPE in
        smoke)
            USERS=${MAX_USERS:-5}
            DUR=${DURATION:-60}
            TEST_PLAN="main-test-plan.jmx"
            ;;
        baseline)
            USERS=${MAX_USERS:-50}
            DUR=${DURATION:-180}
            TEST_PLAN="main-test-plan.jmx"
            ;;
        peak)
            USERS=${MAX_USERS:-100}
            DUR=${DURATION:-300}
            TEST_PLAN="main-test-plan.jmx"
            ;;
        stress)
            USERS=${MAX_USERS:-150}
            DUR=${DURATION:-420}
            TEST_PLAN="main-test-plan.jmx"
            ;;
        frontend)
            USERS=${MAX_USERS:-50}
            DUR=${DURATION:-300}
            TEST_PLAN="frontend-tests.jmx"
            ;;
        api)
            USERS=${MAX_USERS:-50}
            DUR=${DURATION:-300}
            TEST_PLAN="api-tests.jmx"
            ;;
        file)
            USERS=${MAX_USERS:-30}
            DUR=${DURATION:-180}
            TEST_PLAN="file-tests.jmx"
            ;;
        all)
            run_all_tests
            exit 0
            ;;
    esac
}

# Run a single test
run_test() {
    local plan=$1
    local users=$2
    local duration=$3
    local result_prefix=$4

    print_info "Running test: $plan"
    print_info "  Users: $users"
    print_info "  Duration: ${duration}s"

    # Build JMeter command
    local cmd="jmeter"
    
    # Add properties
    cmd="$cmd -Jusers.max=$users"
    cmd="$cmd -Jduration.seconds=$duration"
    cmd="$cmd -Jrampup.seconds=$((duration / 3))"
    
    if [[ -n "$BASE_URL" ]]; then
        cmd="$cmd -Jbase.url=$BASE_URL"
    fi

    # Add test plan
    cmd="$cmd -t $SCRIPT_DIR/$plan"

    # Add result file
    local result_file="$RESULTS_DIR/${result_prefix}_${TIMESTAMP}.jtl"
    cmd="$cmd -l $result_file"

    # Add log file
    local log_file="$RESULTS_DIR/${result_prefix}_${TIMESTAMP}.log"
    cmd="$cmd -j $log_file"

    if [[ "$RUN_GUI" == true ]]; then
        # Run with GUI
        $cmd
    else
        # Run in non-GUI mode
        cmd="$cmd -n"
        
        # Generate HTML report if requested
        if [[ "$GENERATE_REPORT" == true ]]; then
            local report_dir="$RESULTS_DIR/${result_prefix}_report_${TIMESTAMP}"
            cmd="$cmd -e -o $report_dir"
        fi
        
        print_info "Executing: $cmd"
        echo ""
        
        if $cmd; then
            print_success "Test completed successfully!"
            print_info "Results saved to: $result_file"
            if [[ "$GENERATE_REPORT" == true ]]; then
                print_info "HTML report: $report_dir/index.html"
            fi
        else
            print_error "Test failed!"
            print_info "Check log file: $log_file"
            exit 1
        fi
    fi
}

# Run all test plans
run_all_tests() {
    print_info "Running all test plans..."
    echo ""

    # Frontend tests
    print_info "=== Frontend Tests ==="
    run_test "frontend-tests.jmx" 50 300 "frontend"
    echo ""

    # API tests
    print_info "=== API Tests ==="
    run_test "api-tests.jmx" 50 300 "api"
    echo ""

    # File tests
    print_info "=== File Tests ==="
    run_test "file-tests.jmx" 30 180 "file"
    echo ""

    # Main test (peak load)
    print_info "=== Peak Load Test ==="
    run_test "main-test-plan.jmx" 100 300 "peak"

    print_success "All tests completed!"
}

# Main execution
main() {
    echo "=============================================="
    echo "  JobQuest JMeter Load Test Runner"
    echo "=============================================="
    echo ""

    check_jmeter
    parse_args "$@"
    
    # Create results directory if it doesn't exist
    mkdir -p "$RESULTS_DIR"

    get_test_config

    echo ""
    print_info "Test Configuration:"
    print_info "  Type: $TEST_TYPE"
    print_info "  Plan: $TEST_PLAN"
    
    if [[ -n "$BASE_URL" ]]; then
        print_info "  URL: $BASE_URL"
    fi
    
    echo ""

    run_test "$TEST_PLAN" "$USERS" "$DUR" "$TEST_TYPE"
}

main "$@"
