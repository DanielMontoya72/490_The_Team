# Load Tests

This directory contains k6 load testing scripts for performance testing.

## Quick Start

```bash
# Install k6 (macOS)
brew install k6

# Run basic test
npm run loadtest

# Or directly
k6 run load-tests/basic.js
```

## Test Files

- `basic.js` - Homepage and static asset tests
- `results/` - Test result outputs (gitignored)

## Configuration

Override defaults with environment variables:

```bash
k6 run -e BASE_URL=https://theats.it.com load-tests/basic.js
```

## Documentation

See `docs/LOAD_TESTING_GUIDE.md` for detailed instructions.
