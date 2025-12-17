# Scaling Strategies Guide

This document outlines the scalability architecture and strategies for handling application growth.

## Current Architecture

### Infrastructure (Handled by Vercel/Supabase)

| Component | Scaling Strategy | Status |
|-----------|-----------------|--------|
| Database | Supabase managed PostgreSQL with auto-scaling | ✅ Automatic |
| Connection Pooling | PgBouncer (Supabase default) | ✅ Automatic |
| Edge Functions | Serverless auto-scaling | ✅ Automatic |
| Static Assets | CDN distribution | ✅ Automatic |
| File Storage | Supabase Storage with CDN | ✅ Automatic |

### Application-Level Optimizations

| Strategy | Implementation | Location |
|----------|---------------|----------|
| Caching | 3-tier cache (Memory → LocalStorage → DB) | `src/lib/cache.ts` |
| Pagination | Cursor-based and offset pagination | `src/hooks/usePaginatedQuery.ts` |
| Code Splitting | React.lazy() for all pages | `src/App.tsx` |
| Query Optimization | Proper indexes and filtered queries | Database migrations |

## Caching Strategy

### Cache Tiers

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Memory Cache  │ ──► │ LocalStorage    │ ──► │ Database Cache  │
│   (Fastest)     │     │ (Persistent)    │     │ (Shared)        │
│   ~100 entries  │     │ ~5MB limit      │     │ Unlimited       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### When to Use Each Tier

| Tier | Use Case | TTL | Example |
|------|----------|-----|---------|
| Memory Only | Frequently accessed, small data | 5 min | User preferences |
| Memory + LocalStorage | Session-persistent data | 30 min | Filter states |
| All Tiers | Expensive computations | 1 hour+ | Market intelligence |

### Cache Usage Example

```typescript
import { cache, withCache } from '@/lib/cache';

// Simple caching
const data = await cache.get('market-intel-tech');
if (!data) {
  const fresh = await fetchMarketData('tech');
  await cache.set('market-intel-tech', fresh, { 
    ttlSeconds: 3600,
    useDatabase: true 
  });
}

// With helper function
const result = await withCache(
  'expensive-query',
  () => expensiveOperation(),
  { ttlSeconds: 1800, useDatabase: true }
);
```

## Pagination Strategy

### When to Paginate

- Lists with potentially > 50 items
- Data that grows over time (jobs, emails, contacts)
- Search results

### Pagination Patterns

```typescript
// Offset pagination (good for random access)
const { data, pagination, nextPage } = usePaginatedQuery('jobs', {
  table: 'jobs',
  pageSize: 20,
  filters: { user_id: userId }
});

// Infinite scroll (good for feeds)
const { data, hasMore, loadMore } = useInfiniteQuery('contacts', {
  table: 'professional_contacts',
  pageSize: 20
});
```

## Database Optimization

### Index Strategy

| Query Pattern | Index Type | Example |
|--------------|------------|---------|
| User's records | Composite | `(user_id, created_at DESC)` |
| Status filtering | Composite | `(user_id, status)` |
| Active records | Partial | `WHERE status NOT IN ('Rejected')` |
| Full-text search | GIN | `to_tsvector(title \|\| description)` |

### Current Indexes

```sql
-- Jobs table
idx_jobs_user_status ON jobs(user_id, status)
idx_jobs_user_created ON jobs(user_id, created_at DESC)
idx_jobs_active ON jobs(user_id) WHERE status NOT IN ('Rejected', 'Withdrawn')

-- Interviews
idx_interviews_user_scheduled ON interviews(user_id, scheduled_at)

-- Materials
idx_materials_user_type ON application_materials(user_id, material_type)
```

### Query Optimization Tips

1. **Always filter by user_id first** - Indexes are designed for this
2. **Use `.select()` with specific columns** - Don't fetch unnecessary data
3. **Add `.limit()` to all queries** - Supabase default is 1000
4. **Use `.maybeSingle()` for single records** - Avoids array overhead

## Frontend Performance

### Code Splitting

All pages are lazy-loaded:
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

### Bundle Optimization

- Tree shaking enabled (Vite default)
- Dynamic imports for heavy libraries
- CSS code splitting

### Image Optimization

- Use WebP format where possible
- Implement lazy loading: `loading="lazy"`
- Use responsive images with srcSet

## Monitoring

### Resource Monitor

Access at `/monitoring` to view:
- JavaScript heap memory usage
- LocalStorage utilization
- Cache statistics

### Key Metrics to Watch

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Memory Usage | < 75% | Reduce cached data |
| LocalStorage | < 80% | Clear old cache entries |
| Query Time | < 500ms | Add indexes or cache |
| Bundle Size | < 500KB (initial) | Code split more |

## Future Scaling Considerations

### When User Base Exceeds 10,000

1. **Read Replicas**
   - Route read queries to replica
   - Keep writes on primary

2. **Database Partitioning**
   - Partition large tables by user_id or date
   - Archive old data

3. **CDN Enhancement**
   - Add Cloudflare for additional caching
   - Implement edge caching rules

### When Data Exceeds 1M Rows

1. **Table Partitioning**
   ```sql
   CREATE TABLE jobs_2024 PARTITION OF jobs
   FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
   ```

2. **Archive Strategy**
   - Move completed jobs > 1 year old to archive
   - Keep summary data accessible

3. **Search Optimization**
   - Consider external search (Algolia, Meilisearch)
   - Implement materialized views for complex queries

## Load Testing

See `docs/LOAD_TESTING_GUIDE.md` for instructions on running load tests.

### Performance Baselines

| Endpoint | Target p95 | Concurrent Users |
|----------|------------|------------------|
| Job List | < 200ms | 100 |
| Dashboard | < 300ms | 100 |
| Search | < 500ms | 50 |

## Troubleshooting

### High Memory Usage

1. Check for memory leaks in useEffect cleanup
2. Review large state objects
3. Clear cache if excessive

### Slow Queries

1. Check EXPLAIN ANALYZE output
2. Verify indexes exist for query pattern
3. Consider caching result

### LocalStorage Full

1. Clear expired cache entries
2. Reduce cache TTL
3. Move to database cache tier
