# Bug Tracking and Issue Resolution

This document outlines our systematic approach to bug tracking, ensuring efficient resolution of issues found during testing and production.

## Table of Contents

- [Workflow Overview](#workflow-overview)
- [Severity Levels](#severity-levels)
- [Triage Process](#triage-process)
- [Bug Lifecycle](#bug-lifecycle)
- [Labels](#labels)
- [Metrics and Reporting](#metrics-and-reporting)

---

## Workflow Overview

Our bug tracking follows a 6-stage lifecycle:

```
Detection → Triage → Assignment → Development → Verification → Closure
```

### Stage 1: Detection & Reporting

**Sources:**
- User reports via GitHub Issues
- Sentry error alerts
- QA testing
- Beta feedback
- Automated monitoring

All bugs must be reported using the standardized bug report template.

### Stage 2: Triage

| Severity | Triage Timeline |
|----------|-----------------|
| P1/P2 | Within 4 hours |
| P3 | Within 24 hours |
| P4 | Weekly backlog grooming |

### Stage 3: Assignment & Planning

- Assign owner based on component expertise
- Set deadline according to severity SLA
- Add to appropriate milestone/sprint
- Link related issues

### Stage 4: Development & Review

1. Create fix branch from `main`: `fix/issue-123-description`
2. Implement fix with tests
3. Submit PR referencing issue: `Fixes #123`
4. Code review required before merge

### Stage 5: Verification

1. Verify fix in staging environment
2. Run regression tests
3. Deploy to production
4. Verify in production
5. Complete verification checklist

### Stage 6: Closure & Metrics

- Close issue with verification notes
- Update changelog if user-facing
- Include in weekly metrics report

---

## Severity Levels

| Level | Name | Description | Response Time | Resolution Target |
|-------|------|-------------|---------------|-------------------|
| **P1** | Critical | App completely unusable, data loss, security breach | 15 minutes | 1 hour |
| **P2** | High | Major feature broken, affects >50% of users | 1 hour | 4 hours |
| **P3** | Medium | Non-critical feature broken, affects <50% of users | 4 hours | 24 hours |
| **P4** | Low | Minor bugs, cosmetic issues, edge cases | 24 hours | 1 week |

### Severity Examples

**P1 - Critical:**
- Login/authentication completely broken
- Database corruption or data loss
- Security vulnerability (XSS, SQL injection, etc.)
- Application crash affecting all users

**P2 - High:**
- Job saving fails for all users
- Map functionality completely broken
- Bulk operations causing errors
- Major feature unusable

**P3 - Medium:**
- Export to PDF not working
- Specific filter not functioning
- Feature works but with significant issues
- Performance degradation in specific areas

**P4 - Low:**
- Typo in UI text
- Minor alignment issues
- Tooltip missing or incorrect
- Edge case that rarely occurs

---

## Triage Process

### Triage Checklist

When triaging a bug, verify the following:

- [ ] **Reproducible**: Can we reproduce the bug?
- [ ] **Severity Validated**: Is the reported severity accurate?
- [ ] **Duplicate Check**: Is this a duplicate of an existing issue?
- [ ] **Component Identified**: Which component(s) are affected?
- [ ] **Impact Assessment**: How many users are affected?
- [ ] **Root Cause Hypothesis**: Initial theory on the cause?
- [ ] **Owner Assigned**: Who will fix this?
- [ ] **Deadline Set**: When should this be fixed?
- [ ] **Labels Applied**: All relevant labels added?

### Triage Decision Matrix

| Condition | Action |
|-----------|--------|
| Cannot reproduce | Add `needs-info` label, request more details from reporter |
| Duplicate | Close as duplicate, link to original issue |
| Not a bug | Close with explanation, add `not-a-bug` label |
| Enhancement request | Re-label as `enhancement`, move to feature backlog |
| P1/P2 confirmed | Assign immediately, notify team via Slack/Discord |
| P3/P4 confirmed | Add to current/next sprint backlog |

### Escalation Path

```
Developer → Tech Lead → Engineering Manager → CTO
```

**When to escalate:**
- P1 not resolved within 2 hours
- P2 not resolved within 8 hours
- Recurring bug (3+ occurrences)
- Cross-team coordination needed

---

## Bug Lifecycle

### Status Flow

```
Open → In Progress → In Review → Verification → Closed
                  ↓
              Needs Info → (back to Open when info provided)
```

### Branch Naming

```
fix/[issue-number]-[brief-description]
```

Examples:
- `fix/123-login-redirect-loop`
- `fix/456-map-marker-positions`

### Commit Messages

```
fix(component): brief description

Fixes #123

- Detailed change 1
- Detailed change 2
```

### PR Requirements

1. Reference the issue: `Fixes #123` or `Closes #123`
2. Complete PR template checklist
3. Include screenshots for visual bugs
4. Pass all CI checks
5. At least one approval from code owner

---

## Labels

### Priority Labels

| Label | Color | Description |
|-------|-------|-------------|
| `priority:critical` | `#b60205` | P1 - Must fix immediately |
| `priority:high` | `#d93f0b` | P2 - Fix same day |
| `priority:medium` | `#fbca04` | P3 - Fix within 24h |
| `priority:low` | `#0e8a16` | P4 - Fix within week |

### Status Labels

| Label | Color | Description |
|-------|-------|-------------|
| `needs-triage` | `#fbca04` | Awaiting initial assessment |
| `needs-info` | `#cfd3d7` | More information needed |
| `in-progress` | `#1d76db` | Actively being worked on |
| `in-review` | `#5319e7` | PR submitted, awaiting review |
| `verified` | `#0e8a16` | Fix verified in production |

### Type Labels

| Label | Color | Description |
|-------|-------|-------------|
| `bug` | `#d73a4a` | Something isn't working |
| `regression` | `#b60205` | Previously working, now broken |
| `not-a-bug` | `#cfd3d7` | Reported as bug but isn't |
| `duplicate` | `#cfd3d7` | Duplicate of another issue |

### Component Labels

| Label | Color |
|-------|-------|
| `component:auth` | `#1d76db` |
| `component:dashboard` | `#1d76db` |
| `component:jobs` | `#1d76db` |
| `component:contacts` | `#1d76db` |
| `component:profile` | `#1d76db` |
| `component:documents` | `#1d76db` |
| `component:analytics` | `#1d76db` |
| `component:map` | `#1d76db` |
| `component:notifications` | `#1d76db` |
| `component:settings` | `#1d76db` |

---

## Metrics and Reporting

### Weekly Metrics

Generate weekly reports including:

- Total bugs reported vs resolved
- Bugs by severity breakdown
- Average resolution time by severity
- Bugs by component
- SLA compliance rate
- Top bug reporters (for quality feedback)

### Key Performance Indicators (KPIs)

| Metric | Target |
|--------|--------|
| P1 resolution time | < 1 hour |
| P2 resolution time | < 4 hours |
| P3 resolution time | < 24 hours |
| P4 resolution time | < 1 week |
| Bug escape rate | < 5% |
| Regression rate | < 2% |

### Monthly Review

- Analyze bug trends
- Identify problematic components
- Review process effectiveness
- Update this documentation as needed

---

## Templates

- [Bug Report Template](../.github/ISSUE_TEMPLATE/bug_report.yml)
- [Pull Request Template](../.github/PULL_REQUEST_TEMPLATE.md)
- [Metrics Report Template](./templates/BUG_METRICS_REPORT.md)
- [Verification Notes Template](./templates/BUG_VERIFICATION.md)

---

## Quick Reference

### For Reporters

1. Use the bug report template
2. Choose accurate severity level
3. Include reproduction steps
4. Attach screenshots/logs

### For Developers

1. Self-assign or get assigned
2. Create fix branch
3. Reference issue in PR
4. Complete verification checklist

### For Reviewers

1. Verify fix addresses issue
2. Check for regressions
3. Ensure tests are included
4. Approve and merge

---

*Last updated: December 2024*
