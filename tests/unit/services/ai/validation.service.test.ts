/**
 * Unit tests for ValidationService
 * Following TDD approach - tests written before implementation
 */

import { Types } from 'mongoose';
import { ValidationService } from '@/services/ai/validation.service';
import { ResolverService } from '@/services/ai/resolver.service';
import {
  AICourseInput,
  AIModuleInput,
  AIExerciseInput,
  ValidationContext,
} from '@/types/ai.types';

// Mock ResolverService
jest.mock('@/services/ai/resolver.service');

describe('ValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCourseStructure', () => {
    it('should validate a complete valid course structure', async () => {
      // Mock successful resolutions
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: new Types.ObjectId(),
      });

      const validCourse: AICourseInput = {
        course: {
          title: 'Introduction to Computer Science',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
        },
        modules: [
          {
            title: 'Module 1',
            type: 'custom',
            content: {
              text: 'Module content',
            },
          },
        ],
      };

      const result = await ValidationService.validateCourseStructure(validCourse);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(Object.keys(result.resolutions)).toContain('course.department');
    });

    it('should collect ALL errors (not fail fast)', async () => {
      const invalidCourse: AICourseInput = {
        course: {
          title: '', // Invalid: empty
          code: 'invalid', // Invalid: wrong format
          department: '', // Invalid: empty
          credits: -1, // Invalid: negative
        },
        modules: [
          {
            title: '', // Invalid: empty
            type: 'scorm',
            // Missing required scormPackage for scorm type
          },
        ],
      };

      const result = await ValidationService.validateCourseStructure(invalidCourse);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3); // Should collect multiple errors
      expect(result.errors.some((e) => e.path === 'course.title')).toBe(true);
      expect(result.errors.some((e) => e.path === 'course.code')).toBe(true);
      expect(result.errors.some((e) => e.path === 'course.credits')).toBe(true);
    });

    it('should validate course code format', async () => {
      const invalidCodes = ['cs101', 'C1', 'CS1234567', 'CS-101', '123ABC'];

      for (const code of invalidCodes) {
        const course: AICourseInput = {
          course: {
            title: 'Test Course',
            code,
            department: 'Computer Science',
            credits: 3,
          },
        };

        const result = await ValidationService.validateCourseStructure(course);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.path === 'course.code' && e.code === 'INVALID_COURSE_CODE')
        ).toBe(true);
      }
    });

    it('should accept valid course codes', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: new Types.ObjectId(),
      });

      const validCodes = ['CS101', 'MATH200', 'ENG301A', 'BIO101'];

      for (const code of validCodes) {
        jest.clearAllMocks();
        (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
          success: true,
          objectId: new Types.ObjectId(),
        });

        const course: AICourseInput = {
          course: {
            title: 'Test Course',
            code,
            department: 'Computer Science',
            credits: 3,
          },
        };

        const result = await ValidationService.validateCourseStructure(course);

        const codeErrors = result.errors.filter((e) => e.path === 'course.code');
        expect(codeErrors).toHaveLength(0);
      }
    });

    it('should validate department exists', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: false,
        error: 'No match found for "Non-Existent Department"',
        suggestions: ['Computer Science', 'Mathematics'],
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Non-Existent Department',
          credits: 3,
        },
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'course.department' && e.code === 'DEPARTMENT_NOT_FOUND'
        )
      ).toBe(true);
      const deptError = result.errors.find((e) => e.path === 'course.department');
      expect(deptError?.suggestions).toContain('Computer Science');
    });

    it('should validate program belongs to department', async () => {
      const deptId = new Types.ObjectId();
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: deptId,
      });
      (ResolverService.resolveProgram as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Program not found in department',
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          program: 'Non-Existent Program',
          credits: 3,
        },
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === 'course.program' && e.code === 'PROGRAM_NOT_FOUND')
      ).toBe(true);
      expect(ResolverService.resolveProgram).toHaveBeenCalledWith(
        'Non-Existent Program',
        deptId.toString(),
        expect.any(Object)
      );
    });

    it('should warn when instructors not found', async () => {
      const deptId = new Types.ObjectId();
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: deptId,
      });
      (ResolverService.resolveInstructor as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          objectId: new Types.ObjectId(),
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Instructor not found',
          suggestions: ['John Doe', 'Jane Smith'],
        });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
          instructors: ['Valid Instructor', 'Invalid Instructor'],
        },
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(true); // Still valid, just warning
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some(
          (w) => w.path === 'course.instructors[1]' && w.code === 'INSTRUCTOR_NOT_FOUND'
        )
      ).toBe(true);
    });

    it('should validate prerequisites exist', async () => {
      const deptId = new Types.ObjectId();
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: deptId,
      });
      (ResolverService.resolveCourse as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          objectId: new Types.ObjectId(),
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Course not found',
          suggestions: ['CS100', 'CS099'],
        });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
          prerequisites: ['CS100', 'NonExistent'],
        },
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'course.prerequisites[1]' && e.code === 'PREREQUISITE_NOT_FOUND'
        )
      ).toBe(true);
    });

    it('should validate credits are positive', async () => {
      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 0,
        },
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === 'course.credits' && e.code === 'INVALID_CREDITS')
      ).toBe(true);
    });

    it('should validate module ordering is sequential', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: new Types.ObjectId(),
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
        },
        modules: [
          {
            title: 'Module 1',
            type: 'custom',
            orderIndex: 1,
            content: { text: 'Content' },
          },
          {
            title: 'Module 2',
            type: 'custom',
            orderIndex: 3, // Gap in sequence
            content: { text: 'Content' },
          },
        ],
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'INVALID_MODULE_ORDERING')
      ).toBe(true);
    });

    it('should validate SCORM modules have scormPackage URL', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: new Types.ObjectId(),
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
        },
        modules: [
          {
            title: 'SCORM Module',
            type: 'scorm',
            // Missing scormPackage
          },
        ],
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'modules[0].content.scormPackage' && e.code === 'MISSING_SCORM_PACKAGE'
        )
      ).toBe(true);
    });

    it('should validate video modules have videoUrl', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: new Types.ObjectId(),
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
        },
        modules: [
          {
            title: 'Video Module',
            type: 'video',
            content: {},
          },
        ],
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'modules[0].content.videoUrl' && e.code === 'MISSING_VIDEO_URL'
        )
      ).toBe(true);
    });

    it('should validate document modules have documentUrl', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: new Types.ObjectId(),
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
        },
        modules: [
          {
            title: 'Document Module',
            type: 'document',
            content: {},
          },
        ],
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'modules[0].content.documentUrl' && e.code === 'MISSING_DOCUMENT_URL'
        )
      ).toBe(true);
    });

    it('should validate custom modules have text or attachments', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: new Types.ObjectId(),
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
        },
        modules: [
          {
            title: 'Custom Module',
            type: 'custom',
            content: {},
          },
        ],
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'modules[0].content' && e.code === 'MISSING_CUSTOM_CONTENT'
        )
      ).toBe(true);
    });

    it('should validate exercise modules have exercise object', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: new Types.ObjectId(),
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
        },
        modules: [
          {
            title: 'Exercise Module',
            type: 'exercise',
            // Missing exercise
          },
        ],
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'modules[0].exercise' && e.code === 'MISSING_EXERCISE'
        )
      ).toBe(true);
    });
  });

  describe('validateModule', () => {
    it('should validate a valid module', async () => {
      const module: AIModuleInput = {
        title: 'Test Module',
        type: 'custom',
        content: {
          text: 'Module content',
        },
      };

      const context: ValidationContext = {
        departmentId: new Types.ObjectId().toString(),
      };

      const result = await ValidationService.validateModule(module, context);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate required fields', async () => {
      const module: any = {
        // Missing title
        type: 'custom',
      };

      const result = await ValidationService.validateModule(module, {});

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === 'title' && e.code === 'MISSING_REQUIRED_FIELD')).toBe(
        true
      );
    });

    it('should validate module type', async () => {
      const module: any = {
        title: 'Test Module',
        type: 'invalid-type',
      };

      const result = await ValidationService.validateModule(module, {});

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === 'type' && e.code === 'INVALID_MODULE_TYPE')).toBe(
        true
      );
    });
  });

  describe('validateExercise', () => {
    it('should validate a valid exercise', async () => {
      const exercise: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 70,
        questions: [
          {
            type: 'multiple_choice',
            questionText: 'What is 2+2?',
            points: 10,
            options: [
              { text: '3', isCorrect: false },
              { text: '4', isCorrect: true },
            ],
          },
        ],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate required fields', async () => {
      const exercise: any = {
        // Missing title
        type: 'quiz',
        questions: [],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === 'title')).toBe(true);
    });

    it('should validate passingScore is between 0 and 100', async () => {
      const exercise1: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: -10,
        questions: [
          {
            type: 'multiple_choice',
            questionText: 'Test?',
            points: 10,
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false },
            ],
          },
        ],
      };

      const result1 = await ValidationService.validateExercise(exercise1, {});
      expect(result1.valid).toBe(false);
      expect(
        result1.errors.some((e) => e.path === 'passingScore' && e.code === 'INVALID_PASSING_SCORE')
      ).toBe(true);

      const exercise2: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 150,
        questions: [
          {
            type: 'multiple_choice',
            questionText: 'Test?',
            points: 10,
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false },
            ],
          },
        ],
      };

      const result2 = await ValidationService.validateExercise(exercise2, {});
      expect(result2.valid).toBe(false);
      expect(
        result2.errors.some((e) => e.path === 'passingScore' && e.code === 'INVALID_PASSING_SCORE')
      ).toBe(true);
    });

    it('should validate timeLimit is positive', async () => {
      const exercise: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 70,
        timeLimit: -5,
        questions: [
          {
            type: 'multiple_choice',
            questionText: 'Test?',
            points: 10,
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false },
            ],
          },
        ],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === 'timeLimit' && e.code === 'INVALID_TIME_LIMIT')
      ).toBe(true);
    });

    it('should validate exercise has at least one question', async () => {
      const exercise: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 70,
        questions: [],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === 'questions' && e.code === 'NO_QUESTIONS')
      ).toBe(true);
    });

    it('should validate multiple choice questions have at least 2 options', async () => {
      const exercise: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 70,
        questions: [
          {
            type: 'multiple_choice',
            questionText: 'Test?',
            points: 10,
            options: [{ text: 'Only one option', isCorrect: true }],
          },
        ],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'questions[0].options' && e.code === 'INSUFFICIENT_OPTIONS'
        )
      ).toBe(true);
    });

    it('should validate multiple choice questions have at least one correct answer', async () => {
      const exercise: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 70,
        questions: [
          {
            type: 'multiple_choice',
            questionText: 'Test?',
            points: 10,
            options: [
              { text: 'A', isCorrect: false },
              { text: 'B', isCorrect: false },
            ],
          },
        ],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'questions[0].options' && e.code === 'NO_CORRECT_ANSWER'
        )
      ).toBe(true);
    });

    it('should validate true/false questions have boolean correctAnswer', async () => {
      const exercise: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 70,
        questions: [
          {
            type: 'true_false',
            questionText: 'Is this true?',
            points: 10,
            // Missing correctAnswer
          },
        ],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'questions[0].correctAnswer' && e.code === 'MISSING_CORRECT_ANSWER'
        )
      ).toBe(true);
    });

    it('should validate other question types have correctAnswer', async () => {
      const exercise: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 70,
        questions: [
          {
            type: 'short_answer',
            questionText: 'What is the capital of France?',
            points: 10,
            // Missing correctAnswer
          },
        ],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.path === 'questions[0].correctAnswer' && e.code === 'MISSING_CORRECT_ANSWER'
        )
      ).toBe(true);
    });

    it('should validate question points are positive', async () => {
      const exercise: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 70,
        questions: [
          {
            type: 'multiple_choice',
            questionText: 'Test?',
            points: -5,
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false },
            ],
          },
        ],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === 'questions[0].points' && e.code === 'INVALID_POINTS')
      ).toBe(true);
    });

    it('should validate essay questions with optional sampleAnswer', async () => {
      const exercise: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 70,
        questions: [
          {
            type: 'essay',
            questionText: 'Discuss the importance of testing.',
            points: 20,
            sampleAnswer: 'Testing is important because...',
          },
        ],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate fill_blank questions', async () => {
      const exercise: AIExerciseInput = {
        title: 'Test Quiz',
        type: 'quiz',
        passingScore: 70,
        questions: [
          {
            type: 'fill_blank',
            questionText: 'The capital of France is ____.',
            points: 5,
            correctAnswer: 'Paris',
          },
        ],
      };

      const result = await ValidationService.validateExercise(exercise, {});

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Error messages and suggestions', () => {
    it('should provide helpful suggestions for department not found', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: false,
        error: 'No match found',
        suggestions: ['Computer Science', 'Computer Engineering'],
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Comp Sci',
          credits: 3,
        },
      };

      const result = await ValidationService.validateCourseStructure(course);

      const deptError = result.errors.find((e) => e.path === 'course.department');
      expect(deptError?.suggestions).toBeDefined();
      expect(deptError?.suggestions?.length).toBeGreaterThan(0);
    });

    it('should provide JSONPath for nested errors', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: new Types.ObjectId(),
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
        },
        modules: [
          {
            title: 'Module 1',
            type: 'exercise', // Changed to exercise type since it has an exercise
            exercise: {
              title: 'Quiz 1',
              type: 'quiz',
              passingScore: 70,
              questions: [
                {
                  type: 'multiple_choice',
                  questionText: 'Test?',
                  points: 10,
                  options: [{ text: 'Only one', isCorrect: true }], // Invalid: needs at least 2
                },
              ],
            },
          },
        ],
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === 'modules[0].exercise.questions[0].options')
      ).toBe(true);
    });
  });

  describe('Integration with ResolverService', () => {
    it('should use ResolverService for all name resolutions', async () => {
      const deptId = new Types.ObjectId();
      const programId = new Types.ObjectId();
      const instructorId = new Types.ObjectId();

      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: deptId,
      });
      (ResolverService.resolveProgram as jest.Mock).mockResolvedValue({
        success: true,
        objectId: programId,
      });
      (ResolverService.resolveInstructor as jest.Mock).mockResolvedValue({
        success: true,
        objectId: instructorId,
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          program: 'BS Computer Science',
          credits: 3,
          instructors: ['John Doe'],
        },
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(ResolverService.resolveDepartment).toHaveBeenCalledWith(
        'Computer Science',
        expect.any(Object)
      );
      expect(ResolverService.resolveProgram).toHaveBeenCalledWith(
        'BS Computer Science',
        deptId.toString(),
        expect.any(Object)
      );
      expect(ResolverService.resolveInstructor).toHaveBeenCalledWith(
        'John Doe',
        deptId.toString(),
        expect.any(Object)
      );

      expect(Object.keys(result.resolutions)).toContain('course.department');
      expect(result.resolutions['course.department'].toString()).toEqual(deptId.toString());
    });

    it('should return all successful resolutions', async () => {
      const deptId = new Types.ObjectId();
      const programId = new Types.ObjectId();
      const prereqId = new Types.ObjectId();

      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: deptId,
      });
      (ResolverService.resolveProgram as jest.Mock).mockResolvedValue({
        success: true,
        objectId: programId,
      });
      (ResolverService.resolveCourse as jest.Mock).mockResolvedValue({
        success: true,
        objectId: prereqId,
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          program: 'BS Computer Science',
          credits: 3,
          prerequisites: ['CS100'],
        },
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(Object.keys(result.resolutions)).toContain('course.department');
      expect(Object.keys(result.resolutions)).toContain('course.program');
      expect(Object.keys(result.resolutions)).toContain('course.prerequisites[0]');
      expect(result.resolutions['course.department'].toString()).toEqual(deptId.toString());
      expect(result.resolutions['course.program'].toString()).toEqual(programId.toString());
      expect(result.resolutions['course.prerequisites[0]'].toString()).toEqual(prereqId.toString());
    });
  });

  describe('Warnings vs Errors', () => {
    it('should treat instructor not found as warning, not error', async () => {
      const deptId = new Types.ObjectId();
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: true,
        objectId: deptId,
      });
      (ResolverService.resolveInstructor as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Instructor not found',
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Computer Science',
          credits: 3,
          instructors: ['Unknown Instructor'],
        },
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(true); // Still valid
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    });

    it('should treat missing department as error', async () => {
      (ResolverService.resolveDepartment as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Department not found',
      });

      const course: AICourseInput = {
        course: {
          title: 'Test Course',
          code: 'CS101',
          department: 'Unknown Department',
          credits: 3,
        },
      };

      const result = await ValidationService.validateCourseStructure(course);

      expect(result.valid).toBe(false); // Invalid
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
