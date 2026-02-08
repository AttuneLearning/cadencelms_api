import { EventEmitter } from 'events';
import { eventBus, EVENTS, CourseVersionPublishedPayload } from '@/events/eventBus';

describe('EventBus', () => {
  describe('eventBus instance', () => {
    it('should be an instance of EventEmitter', () => {
      expect(eventBus).toBeInstanceOf(EventEmitter);
    });

    it('should have max listeners set to 50', () => {
      expect(eventBus.getMaxListeners()).toBe(50);
    });
  });

  describe('EVENTS constants', () => {
    it('should have correct COURSE_VERSION_PUBLISHED value', () => {
      expect(EVENTS.COURSE_VERSION_PUBLISHED).toBe('course.version.published');
    });

    it('should have correct CERTIFICATE_DEFINITION_ACTIVATED value', () => {
      expect(EVENTS.CERTIFICATE_DEFINITION_ACTIVATED).toBe('certificate.definition.activated');
    });

    it('should have correct CERTIFICATE_DEFINITION_DEPRECATED value', () => {
      expect(EVENTS.CERTIFICATE_DEFINITION_DEPRECATED).toBe('certificate.definition.deprecated');
    });

    it('should have correct CERTIFICATE_ISSUED value', () => {
      expect(EVENTS.CERTIFICATE_ISSUED).toBe('certificate.issued');
    });

    it('should have correct CERTIFICATE_REVOKED value', () => {
      expect(EVENTS.CERTIFICATE_REVOKED).toBe('certificate.revoked');
    });

    it('should have correct CERTIFICATE_UPGRADED value', () => {
      expect(EVENTS.CERTIFICATE_UPGRADED).toBe('certificate.upgraded');
    });

    it('should have correct COURSE_COMPLETED value', () => {
      expect(EVENTS.COURSE_COMPLETED).toBe('course.completed');
    });

    it('should have exactly 7 event constants', () => {
      expect(Object.keys(EVENTS)).toHaveLength(7);
    });
  });

  describe('event emission and listening', () => {
    afterEach(() => {
      eventBus.removeAllListeners();
      // Restore max listeners after removeAllListeners
      eventBus.setMaxListeners(50);
    });

    it('should support the on/emit pattern', () => {
      const handler = jest.fn();
      eventBus.on('test.event', handler);
      eventBus.emit('test.event');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support the off pattern to remove listeners', () => {
      const handler = jest.fn();
      eventBus.on('test.event', handler);
      eventBus.off('test.event', handler);
      eventBus.emit('test.event');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should emit and receive events with payloads', () => {
      const handler = jest.fn();
      const payload: CourseVersionPublishedPayload = {
        courseVersionId: 'version-123',
        canonicalCourseId: 'course-456',
        previousVersionId: 'version-100',
        publishedBy: 'user-789'
      };

      eventBus.on(EVENTS.COURSE_VERSION_PUBLISHED, handler);
      eventBus.emit(EVENTS.COURSE_VERSION_PUBLISHED, payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should emit events with null previousVersionId', () => {
      const handler = jest.fn();
      const payload: CourseVersionPublishedPayload = {
        courseVersionId: 'version-123',
        canonicalCourseId: 'course-456',
        previousVersionId: null,
        publishedBy: 'user-789'
      };

      eventBus.on(EVENTS.COURSE_VERSION_PUBLISHED, handler);
      eventBus.emit(EVENTS.COURSE_VERSION_PUBLISHED, payload);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ previousVersionId: null })
      );
    });

    it('should support multiple listeners for the same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('test.event', handler1);
      eventBus.on('test.event', handler2);
      eventBus.emit('test.event', { data: 'test' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });
});
