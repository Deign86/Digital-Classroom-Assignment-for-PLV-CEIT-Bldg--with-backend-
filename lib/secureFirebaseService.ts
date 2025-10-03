// Secure Firebase Service Layer with Input Validation and Error Handling
// This adds security layers on top of the existing firebaseService

import { validateForm, validateInput, sanitizeInput } from '../utils/validation';
import { ErrorHandler, SecureError, ErrorType } from '../utils/errorHandling';
import { AccessControl, Permission } from '../utils/accessControl';
import type { User, Classroom, BookingRequest, SignupRequest, Schedule } from '../App';
import {
  classroomService as baseClassroomService,
  bookingRequestService as baseBookingRequestService,
  signupRequestService as baseSignupRequestService,
  scheduleService as baseScheduleService,
  userService as baseUserService,
  authService as baseAuthService,
} from './firebaseService';

// Secure Classroom Service
export const secureClassroomService = {
  /**
   * Get all classrooms (with authorization check)
   */
  async getAll(user: User | null): Promise<Classroom[]> {
    try {
      AccessControl.validateClassroomAccess(user, 'view');
      return await baseClassroomService.getAll();
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, 'get classrooms');
    }
  },

  /**
   * Get classroom by ID (with authorization check)
   */
  async getById(user: User | null, id: string): Promise<Classroom | null> {
    try {
      AccessControl.validateClassroomAccess(user, 'view');
      
      // Validate ID format
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new SecureError(
          ErrorType.VALIDATION,
          'Invalid classroom ID',
          undefined,
          400
        );
      }

      const classroom = await baseClassroomService.getById(id.trim());
      if (!classroom) {
        throw ErrorHandler.handle404Error('Classroom');
      }

      return classroom;
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'get classroom');
    }
  },

  /**
   * Create classroom with validation and authorization
   */
  async create(
    user: User | null,
    classroomData: Omit<Classroom, 'id'>
  ): Promise<Classroom> {
    try {
      AccessControl.validateClassroomAccess(user, 'create');

      // Validate input data
      const validation = validateForm.classroom({
        name: classroomData.name,
        capacity: classroomData.capacity,
        building: classroomData.building,
        floor: classroomData.floor,
        equipment: classroomData.equipment?.join(', ') || '',
      });

      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        throw new SecureError(
          ErrorType.VALIDATION,
          firstError,
          undefined,
          400
        );
      }

      // Sanitize input
      const sanitizedData: Omit<Classroom, 'id'> = {
        name: sanitizeInput.name(classroomData.name),
        capacity: parseInt(sanitizeInput.number(classroomData.capacity.toString()), 10),
        building: sanitizeInput.name(classroomData.building),
        floor: parseInt(sanitizeInput.number(classroomData.floor.toString()), 10),
        equipment: classroomData.equipment?.map(eq => sanitizeInput.equipment(eq)) || [],
        isAvailable: Boolean(classroomData.isAvailable),
      };

      // Check for duplicate classroom name
      const existingClassrooms = await baseClassroomService.getAll();
      const duplicateName = existingClassrooms.find(
        c => c.name.toLowerCase() === sanitizedData.name.toLowerCase()
      );

      if (duplicateName) {
        throw ErrorHandler.handleConflictError(
          'A classroom with this name already exists'
        );
      }

      return await baseClassroomService.create(sanitizedData);
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'create classroom');
    }
  },

  /**
   * Update classroom with validation and authorization
   */
  async update(
    user: User | null,
    id: string,
    updates: Partial<Classroom>
  ): Promise<Classroom> {
    try {
      AccessControl.validateClassroomAccess(user, 'update');

      // Validate ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new SecureError(
          ErrorType.VALIDATION,
          'Invalid classroom ID',
          undefined,
          400
        );
      }

      // Check if classroom exists
      const existingClassroom = await baseClassroomService.getById(id.trim());
      if (!existingClassroom) {
        throw ErrorHandler.handle404Error('Classroom');
      }

      // Validate update data
      if (updates.name !== undefined || updates.capacity !== undefined || 
          updates.building !== undefined || updates.floor !== undefined ||
          updates.equipment !== undefined) {
        
        const dataToValidate = {
          name: updates.name || existingClassroom.name,
          capacity: updates.capacity || existingClassroom.capacity,
          building: updates.building || existingClassroom.building,
          floor: updates.floor || existingClassroom.floor,
          equipment: updates.equipment?.join(', ') || existingClassroom.equipment.join(', '),
        };

        const validation = validateForm.classroom(dataToValidate);
        if (!validation.isValid) {
          const firstError = Object.values(validation.errors)[0];
          throw new SecureError(
            ErrorType.VALIDATION,
            firstError,
            undefined,
            400
          );
        }
      }

      // Sanitize updates
      const sanitizedUpdates: Partial<Classroom> = {};
      if (updates.name !== undefined) {
        sanitizedUpdates.name = sanitizeInput.name(updates.name);
      }
      if (updates.capacity !== undefined) {
        sanitizedUpdates.capacity = parseInt(sanitizeInput.number(updates.capacity.toString()), 10);
      }
      if (updates.building !== undefined) {
        sanitizedUpdates.building = sanitizeInput.name(updates.building);
      }
      if (updates.floor !== undefined) {
        sanitizedUpdates.floor = parseInt(sanitizeInput.number(updates.floor.toString()), 10);
      }
      if (updates.equipment !== undefined) {
        sanitizedUpdates.equipment = updates.equipment.map(eq => sanitizeInput.equipment(eq));
      }
      if (updates.isAvailable !== undefined) {
        sanitizedUpdates.isAvailable = Boolean(updates.isAvailable);
      }

      // Check for duplicate name if name is being updated
      if (sanitizedUpdates.name && sanitizedUpdates.name !== existingClassroom.name) {
        const existingClassrooms = await baseClassroomService.getAll();
        const duplicateName = existingClassrooms.find(
          c => c.id !== id && c.name.toLowerCase() === sanitizedUpdates.name!.toLowerCase()
        );

        if (duplicateName) {
          throw ErrorHandler.handleConflictError(
            'A classroom with this name already exists'
          );
        }
      }

      return await baseClassroomService.update(id.trim(), sanitizedUpdates);
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'update classroom');
    }
  },

  /**
   * Delete classroom with authorization and dependency checks
   */
  async delete(user: User | null, id: string): Promise<void> {
    try {
      AccessControl.validateClassroomAccess(user, 'delete');

      // Validate ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new SecureError(
          ErrorType.VALIDATION,
          'Invalid classroom ID',
          undefined,
          400
        );
      }

      // Check if classroom exists
      const existingClassroom = await baseClassroomService.getById(id.trim());
      if (!existingClassroom) {
        throw ErrorHandler.handle404Error('Classroom');
      }

      // Check for dependencies (existing bookings/schedules)
      const [bookingRequests, schedules] = await Promise.all([
        baseBookingRequestService.getAll(),
        baseScheduleService.getAll(),
      ]);

      const hasBookings = bookingRequests.some(req => req.classroomId === id.trim());
      const hasSchedules = schedules.some(schedule => schedule.classroomId === id.trim());

      if (hasBookings || hasSchedules) {
        throw ErrorHandler.handleConflictError(
          'Cannot delete classroom with existing bookings or schedules'
        );
      }

      await baseClassroomService.delete(id.trim());
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'delete classroom');
    }
  },
};

// Secure Booking Request Service
export const secureBookingRequestService = {
  /**
   * Get all booking requests with authorization
   */
  async getAll(user: User | null): Promise<BookingRequest[]> {
    try {
      AccessControl.requireApprovedUser(user);

      if (AccessControl.hasPermission(user, Permission.VIEW_ALL_BOOKINGS)) {
        return await baseBookingRequestService.getAll();
      } else {
        // Faculty can only see their own requests
        const allRequests = await baseBookingRequestService.getAll();
        return allRequests.filter(req => req.facultyId === user!.id);
      }
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'get booking requests');
    }
  },

  /**
   * Create booking request with validation
   */
  async create(
    user: User | null,
    requestData: Omit<BookingRequest, 'id' | 'requestDate' | 'status' | 'facultyId' | 'facultyName'>
  ): Promise<BookingRequest> {
    try {
      AccessControl.validateBookingAccess(user, 'create');

      // Validate request data
      const validation = validateForm.bookingRequest({
        classroomId: requestData.classroomId,
        date: requestData.date,
        startTime: requestData.startTime,
        endTime: requestData.endTime,
        purpose: requestData.purpose,
      });

      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        throw new SecureError(
          ErrorType.VALIDATION,
          firstError,
          undefined,
          400
        );
      }

      // Validate classroom exists
      const classroom = await baseClassroomService.getById(requestData.classroomId);
      if (!classroom) {
        throw ErrorHandler.handle404Error('Classroom');
      }

      if (!classroom.isAvailable) {
        throw ErrorHandler.handleConflictError('Selected classroom is not available for booking');
      }

      // Sanitize input
      const sanitizedData = {
        ...requestData,
        classroomName: sanitizeInput.name(requestData.classroomName),
        purpose: sanitizeInput.description(requestData.purpose),
      };

      const fullRequestData = {
        ...sanitizedData,
        facultyId: user!.id,
        facultyName: user!.name,
      };

      return await baseBookingRequestService.create(fullRequestData);
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'create booking request');
    }
  },

  /**
   * Update booking request with authorization
   */
  async update(
    user: User | null,
    id: string,
    updates: Partial<BookingRequest>
  ): Promise<BookingRequest> {
    try {
      // Get existing request to check ownership
      const existingRequest = await baseBookingRequestService.getById(id);
      if (!existingRequest) {
        throw ErrorHandler.handle404Error('Booking request');
      }

      AccessControl.validateBookingAccess(user, 'update', existingRequest.facultyId);

      // Validate admin feedback if present
      if (updates.adminFeedback !== undefined) {
        const feedbackValidation = validateInput.adminFeedback(updates.adminFeedback);
        if (!feedbackValidation.isValid) {
          throw new SecureError(
            ErrorType.VALIDATION,
            feedbackValidation.error!,
            undefined,
            400
          );
        }
      }

      // Sanitize updates
      const sanitizedUpdates: Partial<BookingRequest> = {};
      if (updates.adminFeedback !== undefined) {
        sanitizedUpdates.adminFeedback = sanitizeInput.description(updates.adminFeedback);
      }
      if (updates.status !== undefined) {
        if (!['pending', 'approved', 'rejected'].includes(updates.status)) {
          throw new SecureError(
            ErrorType.VALIDATION,
            'Invalid status value',
            undefined,
            400
          );
        }
        sanitizedUpdates.status = updates.status;
      }

      return await baseBookingRequestService.update(id, sanitizedUpdates);
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'update booking request');
    }
  },

  /**
   * Approve booking request
   */
  async approve(
    user: User | null,
    id: string,
    feedback?: string
  ): Promise<BookingRequest> {
    try {
      AccessControl.validateBookingAccess(user, 'approve');

      const updates: Partial<BookingRequest> = {
        status: 'approved',
        adminFeedback: feedback ? sanitizeInput.description(feedback) : undefined,
      };

      return await this.update(user, id, updates);
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'approve booking request');
    }
  },

  /**
   * Reject booking request
   */
  async reject(
    user: User | null,
    id: string,
    feedback: string
  ): Promise<BookingRequest> {
    try {
      AccessControl.validateBookingAccess(user, 'approve');

      if (!feedback || feedback.trim().length === 0) {
        throw new SecureError(
          ErrorType.VALIDATION,
          'Feedback is required when rejecting a request',
          undefined,
          400
        );
      }

      const updates: Partial<BookingRequest> = {
        status: 'rejected',
        adminFeedback: sanitizeInput.description(feedback),
      };

      return await this.update(user, id, updates);
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'reject booking request');
    }
  },
};

// Secure Signup Request Service  
export const secureSignupRequestService = {
  /**
   * Get all signup requests with authorization
   */
  async getAll(user: User | null): Promise<SignupRequest[]> {
    try {
      AccessControl.validateSignupAccess(user, 'view');
      return await baseSignupRequestService.getAll();
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, 'get signup requests');
    }
  },

  /**
   * Create signup request with validation
   */
  async create(requestData: {
    email: string;
    name: string;
    department: string;
  }): Promise<SignupRequest> {
    try {
      // Validate request data
      const validation = validateForm.signupRequest(requestData);
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        throw new SecureError(
          ErrorType.VALIDATION,
          firstError,
          undefined,
          400
        );
      }

      // Check for existing user/request with same email
      const existingUsers = await baseUserService.getAll();
      const existingUser = existingUsers.find(
        u => u.email.toLowerCase() === requestData.email.toLowerCase()
      );
      
      if (existingUser) {
        throw ErrorHandler.handleConflictError('An account with this email already exists');
      }

      const existingRequests = await baseSignupRequestService.getAll();
      const existingRequest = existingRequests.find(
        r => r.email.toLowerCase() === requestData.email.toLowerCase() && r.status === 'pending'
      );

      if (existingRequest) {
        throw ErrorHandler.handleConflictError('A pending signup request for this email already exists');
      }

      // Sanitize input
      const sanitizedData = {
        userId: '', // Will be set when approved
        email: sanitizeInput.email(requestData.email),
        name: sanitizeInput.name(requestData.name),
        department: sanitizeInput.name(requestData.department),
      };

      return await baseSignupRequestService.create(sanitizedData);
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'create signup request');
    }
  },

  /**
   * Approve signup request
   */
  async approve(
    user: User | null,
    id: string,
    feedback?: string
  ): Promise<SignupRequest> {
    try {
      AccessControl.validateSignupAccess(user, 'approve');

      const updates: Partial<SignupRequest> = {
        status: 'approved',
        adminFeedback: feedback ? sanitizeInput.description(feedback) : undefined,
        resolvedAt: new Date().toISOString(),
      };

      return await baseSignupRequestService.update(id, updates);
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'approve signup request');
    }
  },

  /**
   * Reject signup request
   */
  async reject(
    user: User | null,
    id: string,
    feedback: string
  ): Promise<SignupRequest> {
    try {
      AccessControl.validateSignupAccess(user, 'approve');

      if (!feedback || feedback.trim().length === 0) {
        throw new SecureError(
          ErrorType.VALIDATION,
          'Feedback is required when rejecting a signup request',
          undefined,
          400
        );
      }

      const updates: Partial<SignupRequest> = {
        status: 'rejected',
        adminFeedback: sanitizeInput.description(feedback),
        resolvedAt: new Date().toISOString(),
      };

      return await baseSignupRequestService.update(id, updates);
    } catch (error) {
      if (error instanceof SecureError) throw error;
      throw ErrorHandler.handleDatabaseError(error, 'reject signup request');
    }
  },
};

// Export secure services
export {
  secureClassroomService as classroomService,
  secureBookingRequestService as bookingRequestService,
  secureSignupRequestService as signupRequestService,
};