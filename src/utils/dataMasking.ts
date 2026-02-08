/**
 * Data Masking Utility
 *
 * Provides FERPA-compliant data masking for learner personally identifiable information (PII).
 *
 * Business Rules:
 * - Instructors: See "FirstName L." format only (last name masked to initial)
 * - Department-admin: See "FirstName L." format only (last name masked to initial)
 * - Enrollment-admin: See full last names (no masking)
 * - System-admin: See full last names (no masking)
 *
 * This utility ensures FERPA compliance by restricting access to full learner names
 * based on the viewer's role.
 *
 * Usage:
 * ```typescript
 * import { maskLastName, maskUserList } from '@/utils/dataMasking';
 *
 * const maskedUser = maskLastName(learner, viewer);
 * const maskedList = maskUserList(learners, viewer);
 * ```
 *
 * @module utils/dataMasking
 */

/**
 * Mask last name to initial format: "FirstName L."
 *
 * Applies FERPA-compliant data masking based on viewer's role.
 *
 * @param user - The user whose data may be masked
 * @param viewer - The user viewing the data (determines masking rules)
 * @returns User object with masked lastName and fullName if applicable
 *
 * @example
 * // Enrollment-admin sees full name
 * const viewer = { roles: ['enrollment-admin'], ... };
 * const masked = maskLastName(learner, viewer);
 * // Result: { firstName: 'John', lastName: 'Doe', fullName: 'John Doe' }
 *
 * @example
 * // Instructor sees masked name
 * const viewer = { roles: ['instructor'], ... };
 * const masked = maskLastName(learner, viewer);
 * // Result: { firstName: 'John', lastName: 'D.', fullName: 'John D.' }
 */
export function maskLastName(user: any, viewer: any): any {
  // If user has no lastName, return as-is
  if (!user.lastName) {
    return user;
  }

  // Get viewer's roles (handle both array and string formats)
  const viewerRoles: string[] = Array.isArray(viewer.roles)
    ? viewer.roles
    : viewer.role
    ? [viewer.role]
    : [];

  // Normalize roles to lowercase for comparison
  const normalizedRoles = viewerRoles.map(r => r.toLowerCase());

  // Enrollment-admin and system-admin see full names
  if (
    normalizedRoles.includes('enrollment-admin') ||
    normalizedRoles.includes('system-admin')
  ) {
    return user;
  }

  // Instructors and department-admin see masked names
  if (
    normalizedRoles.includes('instructor') ||
    normalizedRoles.includes('department-admin')
  ) {
    // Mask last name to first letter + period
    const maskedLastName = user.lastName.charAt(0) + '.';

    return {
      ...user,
      lastName: maskedLastName,
      fullName: `${user.firstName} ${maskedLastName}`
    };
  }

  // Default: return user as-is (no masking for other roles)
  return user;
}

/**
 * Mask last names for an array of users
 *
 * Applies data masking to each user in the list based on viewer's role.
 * Useful for list endpoints (GET /learners, GET /enrollments, etc.)
 *
 * @param users - Array of users to mask
 * @param viewer - The user viewing the data (determines masking rules)
 * @returns Array of users with masked data where applicable
 *
 * @example
 * const learners = await Learner.find({});
 * const maskedLearners = maskUserList(learners, req.user);
 * res.json({ data: maskedLearners });
 */
export function maskUserList(users: any[], viewer: any): any[] {
  if (!Array.isArray(users)) {
    return users;
  }

  return users.map(user => maskLastName(user, viewer));
}

/**
 * Check if viewer should see masked data
 *
 * Utility function to determine if data masking should be applied
 * for the given viewer. Useful for conditional logic in services.
 *
 * @param viewer - The user viewing the data
 * @returns True if viewer should see masked data (instructor or dept-admin)
 *
 * @example
 * if (shouldMaskData(req.user)) {
 *   // Apply data masking
 *   data = maskUserList(data, req.user);
 * }
 */
export function shouldMaskData(viewer: any): boolean {
  const viewerRoles: string[] = Array.isArray(viewer.roles)
    ? viewer.roles
    : viewer.role
    ? [viewer.role]
    : [];

  const normalizedRoles = viewerRoles.map(r => r.toLowerCase());

  // Mask data for instructors and department-admin
  return (
    normalizedRoles.includes('instructor') ||
    normalizedRoles.includes('department-admin')
  );
}

/**
 * Mask email to partial format: "j***@example.com"
 *
 * Additional masking for email addresses (optional, for enhanced privacy).
 * Not required by current FERPA rules but can be used for extra protection.
 *
 * @param email - Email address to mask
 * @returns Masked email address
 *
 * @example
 * maskEmail('john.doe@example.com');
 * // Returns: 'j***@example.com'
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return email;
  }

  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.charAt(0) + '***';

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number to partial format: "(XXX) XXX-1234"
 *
 * Additional masking for phone numbers (optional, for enhanced privacy).
 *
 * @param phone - Phone number to mask
 * @returns Masked phone number
 *
 * @example
 * maskPhone('(555) 123-4567');
 * // Returns: '(XXX) XXX-4567'
 */
export function maskPhone(phone: string): string {
  if (!phone) {
    return phone;
  }

  // Keep only last 4 digits visible
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return 'XXX-XXXX';
  }

  const lastFour = digits.slice(-4);
  return `(XXX) XXX-${lastFour}`;
}

/**
 * Apply full PII masking to user object
 *
 * Masks lastName, email, and phone for comprehensive PII protection.
 * Use when displaying learner lists to instructors.
 *
 * @param user - User object to mask
 * @param viewer - The user viewing the data
 * @param options - Masking options (email, phone)
 * @returns User object with masked PII
 *
 * @example
 * const masked = maskUserPII(learner, instructor, {
 *   maskEmail: true,
 *   maskPhone: true
 * });
 */
export function maskUserPII(
  user: any,
  viewer: any,
  options: { maskEmail?: boolean; maskPhone?: boolean } = {}
): any {
  // Start with lastName masking
  let maskedUser = maskLastName(user, viewer);

  // Apply additional masking if viewer should see masked data
  if (shouldMaskData(viewer)) {
    if (options.maskEmail && maskedUser.email) {
      maskedUser = {
        ...maskedUser,
        email: maskEmail(maskedUser.email)
      };
    }

    if (options.maskPhone && maskedUser.phone) {
      maskedUser = {
        ...maskedUser,
        phone: maskPhone(maskedUser.phone)
      };
    }
  }

  return maskedUser;
}

/**
 * Check if viewer has full PII access based on permissions
 *
 * @param viewer - The user viewing the data (should have permissions array)
 * @returns True if viewer has learner:pii:read permission
 */
export function hasFullPiiAccess(viewer: any): boolean {
  if (!viewer) return false;

  // Check permissions array
  const permissions: string[] = viewer.permissions || [];
  return permissions.includes('learner:pii:read');
}

/**
 * Check if viewer has at least directory access based on permissions
 *
 * @param viewer - The user viewing the data
 * @returns True if viewer has learner:directory:read or learner:pii:read
 */
export function hasDirectoryAccess(viewer: any): boolean {
  if (!viewer) return false;

  const permissions: string[] = viewer.permissions || [];
  return permissions.includes('learner:pii:read') || permissions.includes('learner:directory:read');
}

/**
 * Build display name in "LastName, F." format
 *
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Formatted display name
 */
export function buildDisplayName(firstName: string, lastName: string): string {
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '?';
  return `${lastName || 'Unknown'}, ${firstInitial}.`;
}

/**
 * Get last 4 characters of an ObjectId for disambiguation
 *
 * @param id - MongoDB ObjectId string
 * @returns Last 4 characters
 */
export function getIdSuffix(id: string): string {
  if (!id || id.length < 4) return '????';
  return id.slice(-4);
}

/**
 * Convert learner to directory-level format (no PII)
 *
 * Returns only: displayName, idSuffix, status, counts
 * No email, DOB, address, or full names
 *
 * @param learner - Full learner object
 * @returns Directory-level learner object
 */
export function toDirectoryFormat(learner: any): any {
  return {
    id: learner.id,
    displayName: buildDisplayName(learner.firstName, learner.lastName),
    idSuffix: getIdSuffix(learner.id),
    status: learner.status,
    isProgramEnrollee: learner.isProgramEnrollee || false,
    programCount: learner.programEnrollments || learner.programCount || 0,
    courseCount: learner.courseEnrollments || learner.courseCount || 0
  };
}

/**
 * Convert learner list to directory-level format
 *
 * @param learners - Array of full learner objects
 * @returns Array of directory-level learner objects
 */
export function toDirectoryFormatList(learners: any[]): any[] {
  if (!Array.isArray(learners)) return learners;
  return learners.map(toDirectoryFormat);
}

/**
 * Apply permission-based masking to learner list
 *
 * - learner:pii:read → full data with displayName and idSuffix added
 * - learner:directory:read only → directory format only
 *
 * @param learners - Array of learner objects
 * @param viewer - The user viewing the data
 * @returns Appropriately masked learner array
 */
export function maskLearnersForViewer(learners: any[], viewer: any): any[] {
  if (!Array.isArray(learners)) return learners;

  if (hasFullPiiAccess(viewer)) {
    // Full access - add displayName and idSuffix but keep all data
    return learners.map(learner => ({
      ...learner,
      displayName: buildDisplayName(learner.firstName, learner.lastName),
      idSuffix: getIdSuffix(learner.id)
    }));
  }

  // Directory access only - strip PII
  return toDirectoryFormatList(learners);
}

/**
 * Export default object with all masking functions
 */
export default {
  maskLastName,
  maskUserList,
  shouldMaskData,
  maskEmail,
  maskPhone,
  maskUserPII,
  hasFullPiiAccess,
  hasDirectoryAccess,
  buildDisplayName,
  getIdSuffix,
  toDirectoryFormat,
  toDirectoryFormatList,
  maskLearnersForViewer
};
