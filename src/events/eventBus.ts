import { EventEmitter } from 'events';

/**
 * Application-wide event bus for decoupled communication between modules.
 *
 * Events:
 * - course.version.published: Emitted when a course version is published
 *   Payload: { courseVersionId, canonicalCourseId, previousVersionId, publishedBy }
 *
 * Usage:
 *   import { eventBus } from '@/events/eventBus';
 *
 *   // Emit an event
 *   eventBus.emit('course.version.published', {
 *     courseVersionId: '...',
 *     canonicalCourseId: '...',
 *     previousVersionId: '...',
 *     publishedBy: '...'
 *   });
 *
 *   // Listen for an event
 *   eventBus.on('course.version.published', async (payload) => {
 *     // Handle the event
 *   });
 */

// Event payload types
export interface CourseVersionPublishedPayload {
  courseVersionId: string;
  canonicalCourseId: string;
  previousVersionId: string | null;
  publishedBy: string;
}

// Event names as constants for type safety
export const EVENTS = {
  COURSE_VERSION_PUBLISHED: 'course.version.published',
  CERTIFICATE_DEFINITION_ACTIVATED: 'certificate.definition.activated',
  CERTIFICATE_DEFINITION_DEPRECATED: 'certificate.definition.deprecated',
  CERTIFICATE_ISSUED: 'certificate.issued',
  CERTIFICATE_REVOKED: 'certificate.revoked',
  CERTIFICATE_UPGRADED: 'certificate.upgraded',
  COURSE_COMPLETED: 'course.completed'
} as const;

// Create the event bus with increased max listeners for scalability
export const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);

export default eventBus;
