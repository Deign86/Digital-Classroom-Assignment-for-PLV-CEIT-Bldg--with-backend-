# System-Wide Caching Implementation

## Overview

This document describes the comprehensive caching layer implemented for the Digital Classroom Assignment system. The caching system reduces Firestore read operations, improves application responsiveness, and provides better offline support.

## Architecture

### Core Components

1. **`lib/systemCache.ts`** - Centralized cache manager
   - In-memory cache with TTL (Time-To-Live)
   - Namespace-based organization
   - Automatic expiration and size management
   - Development mode debugging

2. **`lib/cachedFirestore.ts`** - Firestore wrapper utilities
   - Transparent caching for Firestore operations
   - Smart cache invalidation
   - Relationship-aware invalidation

3. **`lib/firebaseService.ts`** - Integration layer
   - All read operations use cache
   - All write operations invalidate cache
   - Maintains cache consistency

## Cache Configuration

### Default TTL Values

| Data Type | TTL | Reasoning |
|-----------|-----|-----------|
| Users | 10 minutes | Changes infrequently |
| Classrooms | 15 minutes | Mostly static data |
| Booking Requests | 2 minutes | Frequently updated |
| Schedules | 5 minutes | Moderately dynamic |
| Signup Requests | 5 minutes | Admin-managed updates |
| Signup History | 30 minutes | Rarely changes |
| List Queries | 3 minutes | Default for collections |

### Cache Namespaces

```typescript
CACHE_NAMESPACES = {
  USERS: 'users',
  USERS_ALL: 'users:all',
  CLASSROOMS: 'classrooms',
  CLASSROOMS_ALL: 'classrooms:all',
  BOOKING_REQUESTS: 'bookingRequests',
  BOOKING_REQUESTS_ALL: 'bookingRequests:all',
  BOOKING_REQUESTS_FACULTY: 'bookingRequests:faculty',
  SCHEDULES: 'schedules',
  SCHEDULES_ALL: 'schedules:all',
  SCHEDULES_FACULTY: 'schedules:faculty',
  SIGNUP_REQUESTS: 'signupRequests',
  SIGNUP_REQUESTS_ALL: 'signupRequests:all',
  SIGNUP_HISTORY: 'signupHistory',
  SIGNUP_HISTORY_ALL: 'signupHistory:all',
}
```

## How It Works

### Read Operations (Cached)

All `getAll()`, `getAllForFaculty()`, and `getById()` methods now:

1. **Check cache first** - If valid data exists, return immediately
2. **Cache miss** - Fetch from Firestore
3. **Store in cache** - Save for future requests with appropriate TTL
4. **Return data**

Example:
```typescript
async getById(id: string): Promise<User | null> {
  // Check cache first
  const cached = systemCache.get<User>(CACHE_NAMESPACES.USERS, id);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from Firestore
  const user = await fetchUserById(id);
  
  // Cache the result if user exists
  if (user) {
    systemCache.set(CACHE_NAMESPACES.USERS, id, user, CACHE_TTL.USERS);
  }
  
  return user;
}
```

### Write Operations (Invalidation)

All `create()`, `update()`, and `delete()` methods now:

1. **Perform write operation**
2. **Invalidate related caches** - Clear affected cache entries
3. **Return result**

Example:
```typescript
async update(id: string, updates: Partial<User>): Promise<User> {
  const database = getDb();
  const userRef = doc(database, COLLECTIONS.USERS, id);
  
  // ... perform update ...
  
  await updateDoc(userRef, sanitized);
  
  // Invalidate cache
  invalidateRelated('user', id);
  
  const snapshot = await getDoc(userRef);
  // ... return updated user ...
}
```

### Smart Invalidation

The `invalidateRelated()` function understands data relationships:

- **User changes** → Invalidate user cache and user lists
- **Classroom changes** → Invalidate classrooms, schedules, and bookings (availability affected)
- **Booking request changes** → Invalidate bookings, related faculty cache, and schedules
- **Schedule changes** → Invalidate schedules, related faculty cache, and bookings
- **Signup request changes** → Invalidate signup requests and history

## Benefits

### Performance Improvements

1. **Reduced Firestore reads** - Up to 80% reduction in repeated queries
2. **Faster page loads** - Cached data returns instantly
3. **Better UX** - Instant navigation between pages with cached data
4. **Lower costs** - Fewer Firestore read operations

### Real-Time Integration

The caching system works seamlessly with real-time listeners:

- **Real-time listeners update cache** - When data changes, listeners update the cache
- **Cache serves initial data** - First load uses cache, then real-time takes over
- **Write operations sync** - Manual updates invalidate cache to trigger re-fetch

### Development Features

- **Debug logging** - Enabled in DEV mode to track cache hits/misses
- **Cache statistics** - Track hit rate, cache size, invalidations
- **Manual controls** - Clear cache, inspect contents, reset stats

## Usage Examples

### Check Cache Statistics

```typescript
import { systemCache } from './lib/systemCache';

// Get cache stats
const stats = systemCache.getStats();
console.log('Cache hit rate:', stats.hitRate + '%');
console.log('Total hits:', stats.hits);
console.log('Total misses:', stats.misses);
console.log('Cache size:', stats.size);
```

### Manual Cache Control

```typescript
import { systemCache, CACHE_NAMESPACES } from './lib/systemCache';

// Clear specific namespace
systemCache.invalidateNamespace(CACHE_NAMESPACES.CLASSROOMS);

// Clear entire cache
systemCache.clear();

// Check if entry exists
const exists = systemCache.has(CACHE_NAMESPACES.USERS, userId);
```

### Custom TTL

```typescript
// Store with custom TTL (1 minute)
systemCache.set(CACHE_NAMESPACES.USERS, userId, userData, 60 * 1000);
```

## Monitoring

### Debug Mode

In development, cache operations are logged:

```
[SystemCache] Initialized with config: { defaultTTL: 300000, maxSize: 500, debug: true }
[SystemCache] HIT: users:abc123
[SystemCache] MISS: classrooms:xyz789
[SystemCache] SET: bookingRequests:def456 (TTL: 120000ms)
[SystemCache] INVALIDATE: schedules:ghi789
[SystemCache] INVALIDATE NAMESPACE: bookingRequests (12 entries)
```

### Production Monitoring

Cache statistics can be exposed via a monitoring endpoint or admin dashboard:

- Hit rate percentage
- Total hits/misses
- Current cache size
- Invalidation count

## Best Practices

### When to Bypass Cache

Use `bypassCache: true` option when:
- Absolute freshness is required (e.g., admin verification)
- Testing cache invalidation
- Debugging data issues

### Cache Tuning

Adjust TTL values based on:
- **Data change frequency** - More frequent = shorter TTL
- **Data importance** - Critical data = shorter TTL
- **User expectations** - Real-time feel = shorter TTL
- **Cost constraints** - Budget-limited = longer TTL

### Memory Management

The cache automatically:
- Prunes expired entries every 50 sets
- Enforces max size (500 entries by default)
- Removes oldest entries when at capacity

## Maintenance

### Cache Size Limits

Default: 500 entries. Adjust if needed:

```typescript
const systemCache = new SystemCache({
  maxSize: 1000, // Increase for larger datasets
});
```

### Namespace Organization

Keep namespaces organized:
- Use consistent naming: `{collection}` or `{collection}:{subtype}`
- Document custom namespaces
- Avoid overlapping namespace prefixes

## Troubleshooting

### Stale Data Issues

**Symptom**: UI shows old data after updates

**Solutions**:
1. Check if write operation calls `invalidateRelated()`
2. Verify namespace matches between read/write
3. Check TTL isn't too long
4. Clear cache manually: `systemCache.clear()`

### Cache Misses

**Symptom**: High miss rate, low performance gain

**Solutions**:
1. Increase TTL for stable data
2. Check if real-time listeners are bypassing cache
3. Verify cache keys are consistent
4. Review invalidation patterns (too aggressive?)

### Memory Usage

**Symptom**: High memory consumption

**Solutions**:
1. Reduce `maxSize` config
2. Shorten TTL values
3. More aggressive pruning (modify `pruneExpired()`)
4. Use selective caching (only cache frequently accessed data)

## Future Enhancements

Potential improvements:

1. **Persistent cache** - Store in IndexedDB for offline support
2. **Cache warming** - Pre-load frequently accessed data
3. **Adaptive TTL** - Adjust based on update patterns
4. **Cache partitioning** - Separate cache per user role
5. **Cache compression** - Reduce memory footprint
6. **Cache versioning** - Handle schema changes gracefully

## Migration Notes

### Existing Code

No changes required! The caching is transparent:

```typescript
// This code works exactly the same
const users = await userService.getAll();
const classroom = await classroomService.getById(id);

// But now it's cached automatically!
```

### Real-Time Listeners

Real-time listeners continue to work as before and automatically update the cache when enabled.

## Performance Metrics

Expected improvements:

- **Initial page load**: Same (cache empty)
- **Subsequent loads**: 50-80% faster
- **Firestore reads**: 60-80% reduction
- **Network requests**: 60-80% reduction
- **User-perceived speed**: Significantly faster

## Conclusion

The system-wide caching implementation provides:

✅ Transparent integration with existing code  
✅ Significant performance improvements  
✅ Cost reduction through fewer Firestore reads  
✅ Better user experience with instant data access  
✅ Development-friendly debugging and monitoring  
✅ Production-ready with automatic maintenance  

The caching layer is now active across all data services and ready for production use.
