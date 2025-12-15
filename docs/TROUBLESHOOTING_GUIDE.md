# Troubleshooting Guide

## Quick Diagnosis

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| Blank page | JavaScript error | Check browser console |
| 401 Unauthorized | Auth token expired | Re-login |
| 403 Forbidden | RLS policy blocking | Check user permissions |
| 500 Error | Edge function crash | Check function logs |
| Slow loading | Large bundle/slow API | Check Network tab |
| Data not saving | RLS or validation | Check database logs |

## Common Issues & Solutions

### Authentication Issues

#### "Invalid login credentials"
**Cause**: Wrong email/password or user doesn't exist
**Solution**:
1. Verify email is correct
2. Use "Forgot Password" to reset
3. Check if user exists in Cloud dashboard

#### "Email not confirmed"
**Cause**: Auto-confirm disabled or email pending
**Solution**:
1. Check spam folder for confirmation email
2. Resend confirmation from login page
3. Enable auto-confirm in auth settings

#### OAuth Login Fails
**Cause**: Callback URL mismatch or provider misconfiguration
**Solution**:
1. Verify callback URL in provider settings matches exactly
2. Check client ID and secret are correct
3. Ensure required scopes are enabled

### Database Issues

#### "Row-level security policy violation"
**Cause**: User trying to access data they don't own
**Solution**:
1. Check RLS policies on the table
2. Verify user_id matches auth.uid()
3. Ensure user is authenticated

#### "Duplicate key value violates unique constraint"
**Cause**: Trying to insert duplicate data
**Solution**:
1. Use upsert with `onConflict` clause
2. Check for existing record before insert
3. Add unique constraint only if needed

#### Data Not Appearing
**Cause**: RLS blocking or query issue
**Solution**:
1. Check browser Network tab for response
2. Verify RLS allows SELECT for the user
3. Test query in SQL editor (if available)
4. Check if filtering is too restrictive

### Edge Function Issues

#### Function Returns 500
**Cause**: Runtime error in function code
**Solution**:
1. Check edge function logs at `/monitoring`
2. Look for stack trace in Sentry
3. Add try/catch and logging
4. Test with simple input first

#### Function Timeout
**Cause**: Long-running operation or infinite loop
**Solution**:
1. Add timeout handling
2. Break into smaller operations
3. Use background jobs for heavy work

#### CORS Error
**Cause**: Missing or incorrect CORS headers
**Solution**:
```typescript
// Add to edge function response
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
})
```

### UI/Frontend Issues

#### Component Not Rendering
**Cause**: JavaScript error, missing data, or conditional logic
**Solution**:
1. Check browser console for errors
2. Add loading states and error boundaries
3. Verify data is being fetched
4. Check conditional rendering logic

#### Styles Not Applied
**Cause**: CSS specificity, missing classes, or build issue
**Solution**:
1. Inspect element in DevTools
2. Check Tailwind class names are correct
3. Verify design tokens in `index.css`
4. Clear browser cache

#### Form Not Submitting
**Cause**: Validation error or handler issue
**Solution**:
1. Check form validation errors
2. Verify onSubmit handler is attached
3. Check for JavaScript errors
4. Test API endpoint separately

### Performance Issues

#### Slow Initial Load
**Cause**: Large bundle or blocking resources
**Solution**:
1. Verify lazy loading is working (check Network tab)
2. Check for large dependencies
3. Optimize images
4. Enable compression

#### Slow API Response
**Cause**: Complex query or large dataset
**Solution**:
1. Add database indexes
2. Limit query results with pagination
3. Use select() to fetch only needed columns
4. Consider caching

#### Memory Leak Warnings
**Cause**: Subscriptions or intervals not cleaned up
**Solution**:
```typescript
// Clean up in useEffect
useEffect(() => {
  const subscription = supabase.channel('...').subscribe()
  return () => {
    subscription.unsubscribe()
  }
}, [])
```

### Email Issues

#### Emails Not Sending
**Cause**: SMTP misconfiguration or quota exceeded
**Solution**:
1. Verify SMTP credentials in secrets
2. Check EMAIL_FROM is plain email (not formatted)
3. Test SMTP connection separately
4. Check Gmail quota (500/day free)

#### Email Goes to Spam
**Cause**: Missing authentication or poor reputation
**Solution**:
1. Set up SPF/DKIM if using custom domain
2. Use recognized sender address
3. Avoid spam trigger words
4. Include unsubscribe option

## Debugging Tools

### Browser DevTools
- **Console**: JavaScript errors and logs
- **Network**: API requests and responses
- **Application**: Local storage, cookies, session
- **Performance**: Loading timeline

### Monitoring Dashboard
Navigate to `/monitoring` to access:
- Application logs
- API metrics
- Performance data
- Error tracking

### Sentry Dashboard
Access at sentry.io to view:
- Error details and stack traces
- User impact
- Release tracking
- Performance traces

## Escalation Path

### Level 1: Self-Service
1. Check this troubleshooting guide
2. Review browser console and logs
3. Search documentation

### Level 2: Team Support
1. Post in team Slack/Discord
2. Include error message and steps to reproduce
3. Share relevant logs

### Level 3: Platform Support
1. Vercel: Contact via dashboard or support
2. File issue with reproduction steps
3. Include project ID if needed

## Log Analysis

### Finding Relevant Logs
```
1. Go to /monitoring
2. Filter by log level (error, warn)
3. Search for specific keywords
4. Check timestamp range
```

### Common Log Patterns
```
[ERROR] Database connection failed → Check Supabase status
[WARN] Rate limit approaching → Reduce API calls
[INFO] User login successful → Normal operation
[DEBUG] Query executed: ... → Development logging
```

## Quick Reference Commands

### Clear Application State
```javascript
// In browser console
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### Test Supabase Connection
```javascript
// In browser console
const { data, error } = await supabase.from('user_profiles').select('count')
console.log({ data, error })
```

### Force Refresh Cache
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```
