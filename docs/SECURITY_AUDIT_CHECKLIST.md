# Security Audit Checklist

This document outlines the security measures and audit procedures for production deployment.

## Pre-Launch Security Checklist

### 1. Authentication & Authorization

- [ ] All routes requiring authentication are protected
- [ ] Password requirements meet security standards (min 8 chars, complexity)
- [ ] Session timeout is configured appropriately
- [ ] Logout properly invalidates sessions
- [ ] OAuth providers are correctly configured with secure redirect URIs
- [ ] Password reset tokens expire appropriately (1 hour)
- [ ] Rate limiting on authentication endpoints

### 2. Row Level Security (RLS)

- [ ] All user data tables have RLS enabled
- [ ] RLS policies use `auth.uid()` for user identification
- [ ] No policies allow unrestricted access to user data
- [ ] Policies are tested with multiple user accounts
- [ ] Admin functions use security definer functions

### 3. Input Validation & Sanitization

- [ ] All form inputs are validated with Zod schemas
- [ ] HTML content is sanitized with DOMPurify before rendering
- [ ] URLs are validated to prevent javascript: protocol attacks
- [ ] File uploads are validated for type and size
- [ ] SQL injection prevented via parameterized queries (Supabase SDK)

### 4. XSS Prevention

- [ ] No unsanitized user content in `dangerouslySetInnerHTML`
- [ ] All dynamic content is escaped before rendering
- [ ] Content Security Policy headers are configured
- [ ] External scripts are loaded from trusted sources only

### 5. Edge Functions Security

- [ ] JWT verification enabled for authenticated endpoints
- [ ] CORS headers properly configured
- [ ] Rate limiting implemented for public endpoints
- [ ] No sensitive data logged (emails, passwords, tokens)
- [ ] Error messages don't expose internal details

### 6. HTTP Security Headers

- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Strict-Transport-Security configured
- [ ] Content-Security-Policy configured
- [ ] Referrer-Policy configured

### 7. Data Protection

- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced for all connections
- [ ] API keys stored as secrets, not in code
- [ ] No credentials committed to version control
- [ ] PII not exposed in logs or error messages

### 8. Third-Party Integrations

- [ ] OAuth tokens stored securely
- [ ] API keys rotated regularly
- [ ] Third-party libraries updated for security patches
- [ ] Minimal permissions requested for integrations

## Vulnerability Testing

### UC-145: Penetration Testing Dashboard

The application includes an interactive penetration testing dashboard at `/monitoring-dashboard` → Security tab.

**Running Tests:**
1. Navigate to Monitoring Dashboard
2. Click "Security" tab
3. Run UC-135 tests (XSS/sanitization)
4. Run UC-145 tests (full pentest suite)
5. Export report for documentation

### OWASP Top 10 Tests (Automated)

| Category | Test | Status |
|----------|------|--------|
| A01 | Broken Access Control (RLS, IDOR) | Automated |
| A02 | Cryptographic Failures (HTTPS, storage) | Automated |
| A03 | Injection (SQL, XSS, URL) | Automated |
| A05 | Security Misconfiguration | Automated |
| A07 | Auth Failures (session management) | Automated |

### Common Attacks to Test

1. **XSS (Cross-Site Scripting)**
   - Test: `<script>alert('XSS')</script>` in text inputs
   - Test: `javascript:alert('XSS')` in URL fields
   - Expected: Input sanitized, no script execution
   - **Automated in:** UC-135 SecurityTestPanel

2. **SQL Injection**
   - Test: `'; DROP TABLE users; --` in search fields
   - Expected: Query fails safely, no data loss
   - **Automated in:** UC-145 PenetrationTestPanel

3. **CSRF (Cross-Site Request Forgery)**
   - Test: Submit forms from external origins
   - Expected: Requests blocked without valid session
   - **Automated in:** UC-145 PenetrationTestPanel

4. **Authentication Bypass**
   - Test: Access protected routes without authentication
   - Test: Modify JWT tokens
   - Expected: Redirected to login, invalid tokens rejected
   - **Automated in:** UC-145 PenetrationTestPanel

5. **Authorization Bypass**
   - Test: Access other users' data via URL manipulation
   - Test: Modify user IDs in API requests
   - Expected: Access denied, 403 error
   - **Automated in:** UC-145 PenetrationTestPanel

6. **Rate Limiting**
   - Test: Rapid requests to endpoints
   - Expected: Rate limiting kicks in
   - **Automated in:** UC-145 PenetrationTestPanel

7. **Sensitive Data Exposure**
   - Test: Check localStorage for PII
   - Test: Check URL for sensitive params
   - Expected: No sensitive data exposed
   - **Automated in:** UC-145 PenetrationTestPanel

### Automated Security Scanning

```bash
# Run npm audit for dependency vulnerabilities
npm audit --audit-level=high

# Run security-focused tests
npm run test:security
```

## Incident Response

See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) for detailed procedures.

### Quick Response Steps

1. **Identify** - Detect and classify the incident
2. **Contain** - Limit damage and prevent spread
3. **Eradicate** - Remove the threat
4. **Recover** - Restore normal operations
5. **Review** - Document lessons learned

## Security Contacts

- Security issues should be reported via the project's security advisory
- Critical vulnerabilities require immediate escalation
- All security incidents should be documented

## Compliance Notes

- User data is subject to privacy regulations
- Data retention policies should be documented
- User consent required for data collection
- Right to deletion must be supported

---

**Last Updated:** December 2024
**Review Frequency:** Quarterly
