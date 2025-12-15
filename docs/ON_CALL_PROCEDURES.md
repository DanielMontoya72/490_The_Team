# On-Call Procedures & Escalation Paths

## On-Call Overview

### Purpose
Ensure rapid response to production incidents and maintain system reliability.

### Responsibilities
- Monitor alerts and respond within SLA
- Triage and resolve or escalate incidents
- Document actions taken
- Hand off to next on-call

## Escalation Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│                      INCIDENT SEVERITY LEVELS                        │
├─────────────────────────────────────────────────────────────────────┤
│  SEV 1 (Critical)  │  SEV 2 (Major)  │  SEV 3 (Minor)  │  SEV 4    │
│  System down       │  Major feature  │  Minor feature  │  Cosmetic │
│  Data at risk      │  broken         │  degraded       │  Low      │
│  Response: 15min   │  Response: 1hr  │  Response: 4hr  │  impact   │
└─────────────────────────────────────────────────────────────────────┘
```

## Response Time SLAs

| Severity | Initial Response | Update Frequency | Resolution Target |
|----------|------------------|------------------|-------------------|
| SEV 1 | 15 minutes | Every 30 min | 4 hours |
| SEV 2 | 1 hour | Every 2 hours | 8 hours |
| SEV 3 | 4 hours | Daily | 3 business days |
| SEV 4 | Next business day | As needed | 2 weeks |

## Incident Classification

### SEV 1 - Critical
- Application completely unavailable
- Data loss or corruption occurring
- Security breach detected
- Payment processing broken (if applicable)

### SEV 2 - Major
- Major feature unavailable
- Significant performance degradation (>10x normal)
- Authentication not working
- Data not saving for all users

### SEV 3 - Minor
- Single feature partially broken
- Minor performance issues
- UI bugs affecting usability
- Non-critical errors in logs

### SEV 4 - Low
- Cosmetic issues
- Documentation errors
- Minor UX improvements needed
- Non-urgent feature requests

## Escalation Paths

### Path 1: Technical Escalation

```
On-Call Engineer
     │
     ├── Cannot resolve in 30 min (SEV 1) or 2 hours (SEV 2)
     │
     ▼
Senior Engineer / Tech Lead
     │
     ├── Requires infrastructure changes or external help
     │
     ▼
Platform Support (Vercel/Supabase)
```

### Path 2: Business Escalation

```
On-Call Engineer
     │
     ├── Customer impact or PR risk
     │
     ▼
Product Manager / Team Lead
     │
     ├── Major business impact
     │
     ▼
Executive Team
```

## On-Call Checklist

### Start of Shift
- [ ] Review handoff notes from previous on-call
- [ ] Check monitoring dashboard status
- [ ] Verify alert notifications working
- [ ] Review any ongoing incidents
- [ ] Test access to all systems

### During Incident
- [ ] Acknowledge alert
- [ ] Assess severity
- [ ] Create incident channel/thread (if SEV 1-2)
- [ ] Start incident log
- [ ] Communicate status updates
- [ ] Work toward resolution
- [ ] Escalate if needed

### End of Shift
- [ ] Document all incidents
- [ ] Update incident status
- [ ] Prepare handoff notes
- [ ] Brief incoming on-call
- [ ] Close resolved alerts

## Incident Response Workflow

### Step 1: Detection & Acknowledgment
```
Alert Received
     │
     ▼
Acknowledge within SLA
     │
     ▼
Initial Assessment (5 min)
- What is broken?
- Who is affected?
- What is the severity?
```

### Step 2: Triage & Communication
```
Determine Severity
     │
     ├── SEV 1-2: Create incident channel
     │            Notify stakeholders
     │
     ├── SEV 3-4: Track in issue system
     │
     ▼
Begin Investigation
```

### Step 3: Investigation & Resolution
```
Gather Information
- Check monitoring dashboard
- Review recent deployments
- Check error logs
- Review database status
     │
     ▼
Identify Root Cause
     │
     ▼
Implement Fix or Workaround
     │
     ▼
Verify Resolution
```

### Step 4: Post-Incident
```
Close Incident
     │
     ▼
Update Status Page (if public)
     │
     ▼
Schedule Post-Mortem (SEV 1-2)
     │
     ▼
Document Lessons Learned
```

## Communication Templates

### Initial Incident Notification
```
🚨 INCIDENT: [Brief Description]
Severity: SEV [1/2/3/4]
Status: Investigating
Impact: [Who/what is affected]
Time Detected: [HH:MM UTC]
On-Call: [Your Name]
Next Update: [Time]
```

### Status Update
```
📊 UPDATE: [Incident Name]
Status: [Investigating/Identified/Monitoring/Resolved]
Current State: [What's happening now]
Actions Taken: [What you've done]
Next Steps: [What's planned]
Next Update: [Time]
```

### Resolution Notification
```
✅ RESOLVED: [Incident Name]
Duration: [X hours/minutes]
Root Cause: [Brief explanation]
Resolution: [What fixed it]
Follow-up: [Any pending actions]
Post-Mortem: [Scheduled/Not Required]
```

## Tools & Access

### Required Access
- [ ] Vercel dashboard
- [ ] Monitoring dashboard (/monitoring)
- [ ] Sentry error tracking
- [ ] Team communication (Slack/Discord)
- [ ] Email for alerts

### Quick Links
| Tool | Purpose | URL |
|------|---------|-----|
| Monitoring | App metrics | `/monitoring` |
| Sentry | Error tracking | sentry.io |
| Vercel | Deployments | vercel.com |

## Emergency Contacts

### Internal
| Role | Contact Method | When to Contact |
|------|----------------|-----------------|
| Tech Lead | [Contact] | SEV 1-2, escalation |
| Product | [Contact] | Customer impact |
| Security | [Contact] | Security incidents |

### External
| Service | Support | SLA |
|---------|---------|-----|
| Vercel | Dashboard/Email | Based on plan |
| Supabase | Dashboard | Based on plan |

## Post-Mortem Process

### When Required
- All SEV 1 incidents
- SEV 2 incidents with >1 hour downtime
- Any incident with data loss
- Recurring incidents

### Post-Mortem Template
```markdown
# Incident Post-Mortem: [Title]

## Summary
- Date: 
- Duration:
- Severity:
- Impact:

## Timeline
- [Time]: Event
- [Time]: Event

## Root Cause
[Detailed explanation]

## Resolution
[What fixed it]

## Lessons Learned
- What went well
- What could improve

## Action Items
- [ ] Action 1 - Owner - Due Date
- [ ] Action 2 - Owner - Due Date
```
