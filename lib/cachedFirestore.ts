/**
 * Cached Firestore wrapper - Transparent caching layer for Firestore operations.
 * 
 * Provides drop-in replacements for common Firestore operations with automatic caching:
 * - getDoc → cached getDoc
 * - getDocs → cached getDocs  
 * - Collection queries with automatic cache key generation
 * 
 * Features:
 * - Automatic cache key generation from queries
 * - Configurable TTL per operation
 * - Smart invalidation on writes
 * - Preserves Firestore API semantics
 * - Supports both single documents and collections
 */

import {
  getDoc as firestoreGetDoc,
  getDocs as firestoreGetDocs,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { systemCache, CACHE_TTL } from './systemCache';
import { logger } from './logger';

/**
 * Options for cached operations
 */
interface CachedOptions {
  /** Time-to-live in milliseconds (overrides default) */
  ttl?: number;
  /** Force bypass cache and fetch fresh data */
  bypassCache?: boolean;
  /** Custom cache namespace (auto-generated if not provided) */
  namespace?: string;
}

/**
 * Generate a stable, consistent hash using djb2 algorithm
 * This produces the same output for the same input across sessions
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Extract collection path from a query by accessing internal Firestore properties
 * Falls back gracefully if internal structure changes
 */
function getQueryPath(query: Query<DocumentData>): string {
  try {
    // Access the internal _query property to get collection path
    const internalQuery = (query as any)._query;
    if (internalQuery?.path?.segments) {
      return internalQuery.path.segments.join('/');
    }
    // Fallback: try to extract from toString if available
    const str = String(query);
    const match = str.match(/collection\((["'])(.+?)\1\)/);
    if (match) return match[2];
  } catch {
    // Ignore errors in path extraction
  }
  return 'unknown';
}

/**
 * Extract query constraints (where, orderBy, limit) for cache key generation
 */
function extractQueryConstraints(query: Query<DocumentData>): string {
  try {
    const internalQuery = (query as any)._query;
    if (!internalQuery) return '';

    const parts: string[] = [];

    // Extract filters (where clauses)
    if (internalQuery.filters?.length > 0) {
      const filters = internalQuery.filters.map((f: any) => {
        try {
          const field = f.field?.segments?.join('.') || f.field || 'unknown';
          const op = f.op || '==';
          const value = JSON.stringify(f.value?.arrayValue?.values || f.value);
          return `${field}${op}${value}`;
        } catch {
          return 'filter';
        }
      });
      parts.push(`f:${filters.sort().join(',')}`);
    }

    // Extract order by
    if (internalQuery.orderBy?.length > 0) {
      const orders = internalQuery.orderBy.map((o: any) => {
        try {
          const field = o.field?.segments?.join('.') || o.field || 'unknown';
          const dir = o.dir || 'asc';
          return `${field}:${dir}`;
        } catch {
          return 'order';
        }
      });
      parts.push(`o:${orders.join(',')}`);
    }

    // Extract limit
    if (internalQuery.limit) {
      parts.push(`l:${internalQuery.limit}`);
    }

    return parts.join('|');
  } catch {
    return '';
  }
}

/**
 * Generate a stable cache key from a Firestore query
 * 
 * Creates a unique, consistent key based on:
 * - Collection path
 * - Query constraints (where, orderBy, limit)
 * - Project ID for multi-project support
 * 
 * The key remains stable across sessions for the same query structure
 */
function generateQueryCacheKey(query: Query<DocumentData>): string {
  const path = getQueryPath(query);
  const constraints = extractQueryConstraints(query);
  const projectId = query.firestore.app.options.projectId || 'default';
  
  // Combine all parts into a stable string
  const cacheString = `${projectId}:${path}:${constraints}`;
  
  // Generate a stable hash
  const hash = djb2Hash(cacheString);
  
  return `query_${path}_${hash}`;
}

/**
 * Extract collection path from DocumentReference
 */
function getCollectionPath(ref: DocumentReference): string {
  return ref.path.split('/').slice(0, -1).join('/') || 'root';
}

/**
 * Cached version of Firestore getDoc
 * 
 * @param ref - Document reference
 * @param options - Cache options
 * @returns Promise of DocumentSnapshot
 */
export async function getCachedDoc<T extends DocumentData>(
  ref: DocumentReference<T>,
  options: CachedOptions = {}
): Promise<DocumentSnapshot<T>> {
  const namespace = options.namespace || getCollectionPath(ref);
  const docId = ref.id;

  // Check cache first unless bypass is requested
  if (!options.bypassCache) {
    const cached = systemCache.get<DocumentSnapshot<T>>(namespace, docId);
    if (cached) {
      logger.log(`[CachedFirestore] Cache hit for doc: ${namespace}/${docId}`);
      return cached;
    }
  }

  // Cache miss - fetch from Firestore
  logger.log(`[CachedFirestore] Cache miss for doc: ${namespace}/${docId}, fetching...`);
  const snapshot = await firestoreGetDoc(ref);

  // Only cache if document exists
  if (snapshot.exists()) {
    const ttl = options.ttl || CACHE_TTL.LIST;
    systemCache.set(namespace, docId, snapshot, ttl);
  }

  return snapshot;
}

/**
 * Cached version of Firestore getDocs
 * 
 * @param query - Firestore query
 * @param options - Cache options
 * @returns Promise of QuerySnapshot
 */
export async function getCachedDocs<T extends DocumentData>(
  query: Query<T>,
  options: CachedOptions = {}
): Promise<QuerySnapshot<T>> {
  // Generate cache key from query
  const cacheKey = generateQueryCacheKey(query);
  const namespace = options.namespace || 'queries';

  // Check cache first unless bypass is requested
  if (!options.bypassCache) {
    const cached = systemCache.get<QuerySnapshot<T>>(namespace, cacheKey);
    if (cached) {
      logger.log(`[CachedFirestore] Cache hit for query: ${namespace}/${cacheKey}`);
      return cached;
    }
  }

  // Cache miss - fetch from Firestore
  logger.log(`[CachedFirestore] Cache miss for query: ${namespace}/${cacheKey}, fetching...`);
  const snapshot = await firestoreGetDocs(query);

  // Cache the result
  const ttl = options.ttl || CACHE_TTL.LIST;
  systemCache.set(namespace, cacheKey, snapshot, ttl);

  // Also cache individual documents for later getDoc calls
  if (options.namespace) {
    snapshot.docs.forEach(doc => {
      systemCache.set(options.namespace!, doc.id, doc, ttl);
    });
  }

  return snapshot;
}

/**
 * Invalidate cache for a document
 * 
 * Call this after create/update/delete operations to ensure cache consistency
 */
export function invalidateDoc(ref: DocumentReference): void {
  const namespace = getCollectionPath(ref);
  const docId = ref.id;
  
  systemCache.invalidate(namespace, docId);
  logger.log(`[CachedFirestore] Invalidated doc: ${namespace}/${docId}`);
}

/**
 * Invalidate all cached queries in a namespace
 * 
 * Call this after bulk operations or when data shape changes significantly
 */
export function invalidateCollection(namespace: string): void {
  systemCache.invalidateNamespace(namespace);
  systemCache.invalidateNamespace('queries'); // Also clear query cache
  logger.log(`[CachedFirestore] Invalidated collection: ${namespace}`);
}

/**
 * Invalidate related caches when data changes
 * 
 * This is a smart invalidation function that knows about data relationships
 * For example, when a booking request changes, we should invalidate:
 * - The booking request itself
 * - All booking request lists
 * - Related faculty booking lists
 * - Related classroom schedules
 */
export function invalidateRelated(
  type: 'user' | 'classroom' | 'bookingRequest' | 'schedule' | 'signupRequest',
  id: string,
  additionalData?: Record<string, unknown>
): void {
  switch (type) {
    case 'user':
      systemCache.invalidate('users', id);
      systemCache.invalidateNamespace('users:all');
      break;

    case 'classroom':
      systemCache.invalidate('classrooms', id);
      systemCache.invalidateNamespace('classrooms:all');
      // Classrooms affect schedules and booking availability
      systemCache.invalidateNamespace('schedules');
      systemCache.invalidateNamespace('bookingRequests');
      break;

    case 'bookingRequest':
      systemCache.invalidate('bookingRequests', id);
      systemCache.invalidateNamespace('bookingRequests:all');
      
      // Invalidate faculty-specific caches if facultyId is provided
      if (additionalData?.facultyId) {
        systemCache.invalidate('bookingRequests:faculty', String(additionalData.facultyId));
      }
      
      // Booking requests affect schedules
      systemCache.invalidateNamespace('schedules');
      break;

    case 'schedule':
      systemCache.invalidate('schedules', id);
      systemCache.invalidateNamespace('schedules:all');
      
      // Invalidate faculty-specific caches if facultyId is provided
      if (additionalData?.facultyId) {
        systemCache.invalidate('schedules:faculty', String(additionalData.facultyId));
      }
      
      // Schedules affect booking availability
      systemCache.invalidateNamespace('bookingRequests');
      break;

    case 'signupRequest':
      systemCache.invalidate('signupRequests', id);
      systemCache.invalidateNamespace('signupRequests:all');
      systemCache.invalidateNamespace('signupHistory');
      break;
  }

  // Always clear query cache to be safe
  systemCache.invalidateNamespace('queries');
  
  logger.log(`[CachedFirestore] Invalidated related caches for ${type}:${id}`);
}

/**
 * Wrapper for write operations that automatically invalidates cache
 */
export async function cachedWrite<T>(
  writeOperation: () => Promise<T>,
  invalidation: {
    type: 'user' | 'classroom' | 'bookingRequest' | 'schedule' | 'signupRequest';
    id: string;
    additionalData?: Record<string, unknown>;
  }
): Promise<T> {
  // Perform the write
  const result = await writeOperation();
  
  // Invalidate related caches
  invalidateRelated(invalidation.type, invalidation.id, invalidation.additionalData);
  
  return result;
}

/**
 * Helper to wrap multiple write operations with batch invalidation
 */
export async function cachedBatchWrite<T>(
  writeOperation: () => Promise<T>,
  invalidations: Array<{
    type: 'user' | 'classroom' | 'bookingRequest' | 'schedule' | 'signupRequest';
    id: string;
    additionalData?: Record<string, unknown>;
  }>
): Promise<T> {
  // Perform the write
  const result = await writeOperation();
  
  // Invalidate all related caches
  invalidations.forEach(inv => {
    invalidateRelated(inv.type, inv.id, inv.additionalData);
  });
  
  return result;
}

export default {
  getCachedDoc,
  getCachedDocs,
  invalidateDoc,
  invalidateCollection,
  invalidateRelated,
  cachedWrite,
  cachedBatchWrite,
};
