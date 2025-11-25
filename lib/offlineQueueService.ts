/**
 * Offline Queue Service - Manages booking requests when offline
 * 
 * Features:
 * - IndexedDB storage for offline persistence
 * - Automatic sync when connection is restored
 * - Conflict detection and resolution
 * - Queue status tracking and notifications
 * - Retry logic with exponential backoff
 * 
 * Edge cases handled:
 * - Conflict detection unavailable when offline (queued as "pending-validation")
 * - Network failures during sync (retry with backoff)
 * - Conflicts discovered after coming online (user notification + resolution UI)
 * - Multiple offline requests for same slot (local conflict detection)
 * - App closure with pending queue (persists in IndexedDB)
 */

import { openDB, type IDBPDatabase } from 'idb';
import { logger } from './logger';
import type { BookingRequest } from '../App';

/**
 * Queued booking request with metadata
 */
export interface QueuedBookingRequest {
  /** Unique queue ID (generated client-side) */
  queueId: string;
  
  /** Booking request data (without id, requestDate, status) */
  bookingData: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>;
  
  /** When the request was queued */
  queuedAt: string;
  
  /** Current status of the queued request */
  queueStatus: 
    | 'pending-validation' // Waiting to validate for conflicts
    | 'pending-sync'       // Validated, waiting to sync
    | 'syncing'            // Currently attempting to sync
    | 'conflict'           // Conflict detected after validation
    | 'failed'             // Sync failed (will retry)
    | 'synced';            // Successfully synced
  
  /** Number of sync attempts */
  attempts: number;
  
  /** Last sync attempt timestamp */
  lastAttempt?: string;
  
  /** Error message if sync failed */
  error?: string;
  
  /** Conflict details if conflict detected */
  conflictDetails?: {
    message: string;
    conflictingBookings?: string[];
  };
  
  /** Next retry timestamp (for exponential backoff) */
  nextRetry?: string;
}

/**
 * Sync result for a queued request
 */
export interface SyncResult {
  queueId: string;
  success: boolean;
  bookingId?: string; // Firestore ID if synced successfully
  error?: string;
  conflict?: boolean;
  conflictDetails?: QueuedBookingRequest['conflictDetails'];
}

/**
 * Offline queue configuration
 */
const QUEUE_CONFIG = {
  DB_NAME: 'plv-offline-queue',
  DB_VERSION: 1,
  STORE_NAME: 'booking-queue',
  MAX_RETRIES: 5,
  INITIAL_RETRY_DELAY: 2000, // 2 seconds
  MAX_RETRY_DELAY: 300000, // 5 minutes
} as const;

class OfflineQueueService {
  private db: IDBPDatabase | null = null;
  private syncInProgress = false;
  private listeners: Set<() => void> = new Set();
  
  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return;
    
    try {
      this.db = await openDB(QUEUE_CONFIG.DB_NAME, QUEUE_CONFIG.DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(QUEUE_CONFIG.STORE_NAME)) {
            const store = db.createObjectStore(QUEUE_CONFIG.STORE_NAME, { keyPath: 'queueId' });
            store.createIndex('queueStatus', 'queueStatus');
            store.createIndex('queuedAt', 'queuedAt');
            store.createIndex('nextRetry', 'nextRetry');
          }
        },
      });
      
      logger.log('[OfflineQueue] IndexedDB initialized');
    } catch (error) {
      logger.error('[OfflineQueue] Failed to initialize IndexedDB:', error);
      throw error;
    }
  }
  
  /**
   * Add a booking request to the offline queue
   */
  async queueBooking(
    bookingData: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>
  ): Promise<QueuedBookingRequest> {
    await this.init();
    
    const queuedRequest: QueuedBookingRequest = {
      queueId: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookingData,
      queuedAt: new Date().toISOString(),
      queueStatus: 'pending-validation',
      attempts: 0,
    };
    
    try {
      await this.db!.add(QUEUE_CONFIG.STORE_NAME, queuedRequest);
      logger.log('[OfflineQueue] Added to queue:', queuedRequest.queueId);
      this.notifyListeners();
      return queuedRequest;
    } catch (error) {
      logger.error('[OfflineQueue] Failed to queue booking:', error);
      throw error;
    }
  }
  
  /**
   * Get all queued requests
   */
  async getQueuedRequests(status?: QueuedBookingRequest['queueStatus']): Promise<QueuedBookingRequest[]> {
    await this.init();
    
    try {
      if (status) {
        return await this.db!.getAllFromIndex(QUEUE_CONFIG.STORE_NAME, 'queueStatus', status);
      }
      return await this.db!.getAll(QUEUE_CONFIG.STORE_NAME);
    } catch (error) {
      logger.error('[OfflineQueue] Failed to get queued requests:', error);
      return [];
    }
  }
  
  /**
   * Get a specific queued request by ID
   */
  async getQueuedRequest(queueId: string): Promise<QueuedBookingRequest | undefined> {
    await this.init();
    
    try {
      return await this.db!.get(QUEUE_CONFIG.STORE_NAME, queueId);
    } catch (error) {
      logger.error('[OfflineQueue] Failed to get queued request:', error);
      return undefined;
    }
  }
  
  /**
   * Update a queued request
   */
  async updateQueuedRequest(queueId: string, updates: Partial<QueuedBookingRequest>): Promise<void> {
    await this.init();
    
    try {
      const existing = await this.db!.get(QUEUE_CONFIG.STORE_NAME, queueId);
      if (!existing) {
        throw new Error(`Queued request ${queueId} not found`);
      }
      
      const updated = { ...existing, ...updates };
      await this.db!.put(QUEUE_CONFIG.STORE_NAME, updated);
      this.notifyListeners();
    } catch (error) {
      logger.error('[OfflineQueue] Failed to update queued request:', error);
      throw error;
    }
  }
  
  /**
   * Remove a queued request
   */
  async removeQueuedRequest(queueId: string): Promise<void> {
    await this.init();
    
    try {
      await this.db!.delete(QUEUE_CONFIG.STORE_NAME, queueId);
      logger.log('[OfflineQueue] Removed from queue:', queueId);
      this.notifyListeners();
    } catch (error) {
      logger.error('[OfflineQueue] Failed to remove queued request:', error);
      throw error;
    }
  }
  
  /**
   * Check for local conflicts in the queue
   * (same classroom, date, overlapping time)
   */
  async checkLocalConflicts(
    bookingData: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>,
    excludeQueueId?: string
  ): Promise<boolean> {
    const allQueued = await this.getQueuedRequests();
    
    // Filter to same classroom and date
    const potentialConflicts = allQueued.filter(q => 
      q.queueId !== excludeQueueId &&
      q.queueStatus !== 'synced' &&
      q.queueStatus !== 'failed' &&
      q.bookingData.classroomId === bookingData.classroomId &&
      q.bookingData.date === bookingData.date
    );
    
    if (potentialConflicts.length === 0) return false;
    
    // Check for time overlap
    const newStart = this.timeToMinutes(bookingData.startTime);
    const newEnd = this.timeToMinutes(bookingData.endTime);
    
    for (const queued of potentialConflicts) {
      const qStart = this.timeToMinutes(queued.bookingData.startTime);
      const qEnd = this.timeToMinutes(queued.bookingData.endTime);
      
      // Check overlap: (StartA < EndB) and (EndA > StartB)
      if (newStart < qEnd && newEnd > qStart) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Sync all pending requests when connection is restored
   * 
   * @param onBookingRequest - Callback to create booking request
   * @param checkConflicts - Callback to check for conflicts
   * @returns Array of sync results
   */
  async syncQueue(
    onBookingRequest: (request: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>) => Promise<string>,
    checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string) => Promise<boolean>
  ): Promise<SyncResult[]> {
    if (this.syncInProgress) {
      logger.warn('[OfflineQueue] Sync already in progress');
      return [];
    }
    
    this.syncInProgress = true;
    const results: SyncResult[] = [];
    
    try {
      // Get all requests that need syncing
      const pendingValidation = await this.getQueuedRequests('pending-validation');
      const pendingSync = await this.getQueuedRequests('pending-sync');
      const failed = await this.getQueuedRequests('failed');
      
      // Filter failed requests that are ready for retry
      const readyToRetry = failed.filter(req => {
        if (!req.nextRetry) return true;
        return new Date(req.nextRetry) <= new Date();
      });
      
      const allPending = [...pendingValidation, ...pendingSync, ...readyToRetry];
      
      logger.log(`[OfflineQueue] Syncing ${allPending.length} requests`);
      
      // Process each request
      for (const queued of allPending) {
        const result = await this.syncSingleRequest(queued, onBookingRequest, checkConflicts);
        results.push(result);
      }
      
      this.notifyListeners();
      return results;
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Sync a single request
   */
  private async syncSingleRequest(
    queued: QueuedBookingRequest,
    onBookingRequest: (request: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>) => Promise<string>,
    checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string) => Promise<boolean>
  ): Promise<SyncResult> {
    const { queueId, bookingData } = queued;
    
    try {
      // Update status to syncing
      await this.updateQueuedRequest(queueId, {
        queueStatus: 'syncing',
        lastAttempt: new Date().toISOString(),
        attempts: queued.attempts + 1,
      });
      
      // Step 1: Check for conflicts if not already validated
      if (queued.queueStatus === 'pending-validation') {
        const hasConflict = await checkConflicts(
          bookingData.classroomId,
          bookingData.date,
          bookingData.startTime,
          bookingData.endTime
        );
        
        if (hasConflict) {
          await this.updateQueuedRequest(queueId, {
            queueStatus: 'conflict',
            conflictDetails: {
              message: 'This time slot is no longer available. Another booking was created while you were offline.',
              conflictingBookings: [],
            },
          });
          
          return {
            queueId,
            success: false,
            conflict: true,
            conflictDetails: {
              message: 'Time slot conflict detected',
            },
          };
        }
        
        // No conflict, mark as validated
        await this.updateQueuedRequest(queueId, {
          queueStatus: 'pending-sync',
        });
      }
      
      // Step 2: Submit the booking
      const bookingId = await onBookingRequest(bookingData);
      
      // Success! Mark as synced
      await this.updateQueuedRequest(queueId, {
        queueStatus: 'synced',
      });
      
      logger.log(`[OfflineQueue] Successfully synced ${queueId} -> ${bookingId}`);
      
      return {
        queueId,
        success: true,
        bookingId,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[OfflineQueue] Failed to sync ${queueId}:`, error);
      
      // Calculate next retry with exponential backoff
      const nextRetryDelay = Math.min(
        QUEUE_CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, queued.attempts),
        QUEUE_CONFIG.MAX_RETRY_DELAY
      );
      
      const nextRetry = new Date(Date.now() + nextRetryDelay).toISOString();
      
      // Check if we've exceeded max retries
      const maxRetriesExceeded = queued.attempts >= QUEUE_CONFIG.MAX_RETRIES;
      
      await this.updateQueuedRequest(queueId, {
        queueStatus: maxRetriesExceeded ? 'failed' : 'failed',
        error: errorMessage,
        nextRetry: maxRetriesExceeded ? undefined : nextRetry,
      });
      
      return {
        queueId,
        success: false,
        error: errorMessage,
      };
    }
  }
  
  /**
   * Clear all synced requests from the queue
   */
  async clearSynced(): Promise<number> {
    const synced = await this.getQueuedRequests('synced');
    
    for (const req of synced) {
      await this.removeQueuedRequest(req.queueId);
    }
    
    return synced.length;
  }
  
  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    total: number;
    pendingValidation: number;
    pendingSync: number;
    syncing: number;
    conflict: number;
    failed: number;
    synced: number;
  }> {
    const all = await this.getQueuedRequests();
    
    return {
      total: all.length,
      pendingValidation: all.filter(q => q.queueStatus === 'pending-validation').length,
      pendingSync: all.filter(q => q.queueStatus === 'pending-sync').length,
      syncing: all.filter(q => q.queueStatus === 'syncing').length,
      conflict: all.filter(q => q.queueStatus === 'conflict').length,
      failed: all.filter(q => q.queueStatus === 'failed').length,
      synced: all.filter(q => q.queueStatus === 'synced').length,
    };
  }
  
  /**
   * Subscribe to queue changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        logger.error('[OfflineQueue] Listener error:', error);
      }
    });
  }
  
  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    // Handle both 12-hour and 24-hour formats
    const match = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  }
}

// Export singleton instance
export const offlineQueueService = new OfflineQueueService();

// Auto-initialize on import
offlineQueueService.init().catch(err => {
  logger.error('[OfflineQueue] Auto-init failed:', err);
});
