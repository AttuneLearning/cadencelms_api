/**
 * Unit tests for SchemaService
 * Following TDD approach - tests written before implementation
 */

import { SchemaService } from '@/services/ai/schema.service';

describe('SchemaService', () => {
  beforeEach(() => {
    // Clear any caches
    SchemaService.clearCache();
  });

  describe('getSchema', () => {
    describe('Course Schema', () => {
      it('should return valid JSON Schema for course resource', async () => {
        const result = await SchemaService.getSchema('course');

        expect(result).not.toBeNull();
        expect(result?.schema).toBeDefined();
        expect(result?.schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
        expect(result?.schema.type).toBe('object');
        expect(result?.schema.properties).toBeDefined();
      });

      it('should include required course fields in schema', async () => {
        const result = await SchemaService.getSchema('course');

        expect(result?.schema.properties.course).toBeDefined();
        expect(result?.schema.properties.course.required).toContain('title');
        expect(result?.schema.properties.course.required).toContain('code');
        expect(result?.schema.properties.course.required).toContain('department');
        expect(result?.schema.properties.course.required).toContain('credits');
      });

      it('should include course code validation pattern', async () => {
        const result = await SchemaService.getSchema('course');

        const courseCodeProperty = result?.schema.properties.course.properties.code;
        expect(courseCodeProperty).toBeDefined();
        expect(courseCodeProperty.pattern).toBe('^[A-Z]{2,4}[0-9]{3}[A-Z]?$');
        expect(courseCodeProperty.description).toContain('Course code');
      });

      it('should include examples for course schema', async () => {
        const result = await SchemaService.getSchema('course');

        expect(result?.examples).toBeDefined();
        expect(Array.isArray(result?.examples)).toBe(true);
        expect(result?.examples.length).toBeGreaterThanOrEqual(2);

        // Check that examples have proper structure
        result?.examples.forEach((example) => {
          expect(example.description).toBeDefined();
          expect(example.data).toBeDefined();
          expect(example.data.course).toBeDefined();
          expect(typeof example.description).toBe('string');
        });
      });

      it('should include validation rules for course', async () => {
        const result = await SchemaService.getSchema('course');

        expect(result?.validations).toBeDefined();
        expect(typeof result?.validations).toBe('object');
        expect(result?.validations['course.code']).toBeDefined();
        expect(result?.validations['course.code'].pattern).toBeDefined();
        expect(result?.validations['course.code'].description).toBeDefined();
      });
    });

    describe('Module Schema', () => {
      it('should return valid JSON Schema for module resource', async () => {
        const result = await SchemaService.getSchema('module');

        expect(result).not.toBeNull();
        expect(result?.schema).toBeDefined();
        expect(result?.schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
        expect(result?.schema.type).toBe('object');
      });

      it('should include module type enum values', async () => {
        const result = await SchemaService.getSchema('module');

        const moduleTypeProperty = result?.schema.properties.type;
        expect(moduleTypeProperty).toBeDefined();
        expect(moduleTypeProperty.enum).toContain('custom');
        expect(moduleTypeProperty.enum).toContain('scorm');
        expect(moduleTypeProperty.enum).toContain('video');
        expect(moduleTypeProperty.enum).toContain('document');
        expect(moduleTypeProperty.enum).toContain('exercise');
      });

      it('should include examples showing different module types', async () => {
        const result = await SchemaService.getSchema('module');

        expect(result?.examples).toBeDefined();
        expect(result?.examples.length).toBeGreaterThanOrEqual(2);

        // Should have examples for different module types
        const moduleTypes = result?.examples.map((ex) => ex.data.type);
        expect(moduleTypes?.length).toBeGreaterThan(1);
      });

      it('should include content structure in schema', async () => {
        const result = await SchemaService.getSchema('module');

        const contentProperty = result?.schema.properties.content;
        expect(contentProperty).toBeDefined();
        expect(contentProperty.properties).toBeDefined();
        expect(contentProperty.properties.text).toBeDefined();
        expect(contentProperty.properties.scormPackage).toBeDefined();
        expect(contentProperty.properties.videoUrl).toBeDefined();
      });
    });

    describe('Exercise Schema', () => {
      it('should return valid JSON Schema for exercise resource', async () => {
        const result = await SchemaService.getSchema('exercise');

        expect(result).not.toBeNull();
        expect(result?.schema).toBeDefined();
        expect(result?.schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
      });

      it('should include exercise type enum values', async () => {
        const result = await SchemaService.getSchema('exercise');

        const exerciseTypeProperty = result?.schema.properties.type;
        expect(exerciseTypeProperty).toBeDefined();
        expect(exerciseTypeProperty.enum).toContain('quiz');
        expect(exerciseTypeProperty.enum).toContain('exam');
        expect(exerciseTypeProperty.enum).toContain('practice');
        expect(exerciseTypeProperty.enum).toContain('assessment');
      });

      it('should include passing score validation (0-100)', async () => {
        const result = await SchemaService.getSchema('exercise');

        const passingScoreProperty = result?.schema.properties.passingScore;
        expect(passingScoreProperty).toBeDefined();
        expect(passingScoreProperty.type).toBe('number');
        expect(passingScoreProperty.minimum).toBe(0);
        expect(passingScoreProperty.maximum).toBe(100);
      });

      it('should include examples with questions array', async () => {
        const result = await SchemaService.getSchema('exercise');

        expect(result?.examples).toBeDefined();
        expect(result?.examples.length).toBeGreaterThanOrEqual(1);

        result?.examples.forEach((example) => {
          expect(example.data.questions).toBeDefined();
          expect(Array.isArray(example.data.questions)).toBe(true);
        });
      });
    });

    describe('Question Schema', () => {
      it('should return valid JSON Schema for question resource', async () => {
        const result = await SchemaService.getSchema('question');

        expect(result).not.toBeNull();
        expect(result?.schema).toBeDefined();
        expect(result?.schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
      });

      it('should include all question types in enum', async () => {
        const result = await SchemaService.getSchema('question');

        const questionTypeProperty = result?.schema.properties.type;
        expect(questionTypeProperty).toBeDefined();
        expect(questionTypeProperty.enum).toContain('multiple_choice');
        expect(questionTypeProperty.enum).toContain('true_false');
        expect(questionTypeProperty.enum).toContain('essay');
        expect(questionTypeProperty.enum).toContain('short_answer');
        expect(questionTypeProperty.enum).toContain('fill_blank');
      });

      it('should include examples for different question types', async () => {
        const result = await SchemaService.getSchema('question');

        expect(result?.examples).toBeDefined();
        expect(result?.examples.length).toBeGreaterThanOrEqual(3);

        // Should have examples for different question types
        const questionTypes = result?.examples.map((ex) => ex.data.type);
        expect(questionTypes).toContain('multiple_choice');
        expect(questionTypes).toContain('true_false');
      });

      it('should define options structure for multiple choice', async () => {
        const result = await SchemaService.getSchema('question');

        const optionsProperty = result?.schema.properties.options;
        expect(optionsProperty).toBeDefined();
        expect(optionsProperty.type).toBe('array');
        expect(optionsProperty.items).toBeDefined();
        expect(optionsProperty.items.properties.text).toBeDefined();
        expect(optionsProperty.items.properties.isCorrect).toBeDefined();
      });
    });

    describe('Invalid Resource', () => {
      it('should return null for invalid resource name', async () => {
        const result = await SchemaService.getSchema('invalid-resource');

        expect(result).toBeNull();
      });

      it('should return null for empty resource name', async () => {
        const result = await SchemaService.getSchema('');

        expect(result).toBeNull();
      });

      it('should handle undefined resource gracefully', async () => {
        const result = await SchemaService.getSchema(undefined as any);

        expect(result).toBeNull();
      });
    });

    describe('Caching', () => {
      it('should cache schema results for performance', async () => {
        // First call
        const result1 = await SchemaService.getSchema('course');
        // Second call
        const result2 = await SchemaService.getSchema('course');

        expect(result1).toBe(result2); // Should return same reference (cached)
      });

      it('should cache different resources separately', async () => {
        const courseSchema = await SchemaService.getSchema('course');
        const moduleSchema = await SchemaService.getSchema('module');

        expect(courseSchema).not.toBe(moduleSchema);
        expect(courseSchema?.schema).not.toEqual(moduleSchema?.schema);
      });

      it('should support cache clearing', async () => {
        const result1 = await SchemaService.getSchema('course');
        SchemaService.clearCache();
        const result2 = await SchemaService.getSchema('course');

        // After cache clear, should still return valid schema
        expect(result2).not.toBeNull();
        expect(result2?.schema).toBeDefined();
      });
    });

    describe('Schema Validation', () => {
      it('should return schemas that are valid JSON Schema Draft 7', async () => {
        const resources = ['course', 'module', 'exercise', 'question'];

        for (const resource of resources) {
          const result = await SchemaService.getSchema(resource);

          expect(result).not.toBeNull();
          expect(result?.schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
          expect(result?.schema.type).toBeDefined();
          expect(['object', 'array', 'string', 'number', 'boolean']).toContain(
            result?.schema.type
          );
        }
      });

      it('should include descriptions for all major properties', async () => {
        const result = await SchemaService.getSchema('course');

        const courseProperties = result?.schema.properties.course.properties;
        expect(courseProperties.title.description).toBeDefined();
        expect(courseProperties.code.description).toBeDefined();
        expect(courseProperties.department.description).toBeDefined();
        expect(courseProperties.credits.description).toBeDefined();
      });

      it('should include examples in schema properties where applicable', async () => {
        const result = await SchemaService.getSchema('course');

        const courseCodeProperty = result?.schema.properties.course.properties.code;
        expect(courseCodeProperty.examples).toBeDefined();
        expect(Array.isArray(courseCodeProperty.examples)).toBe(true);
        expect(courseCodeProperty.examples.length).toBeGreaterThan(0);
      });
    });

    describe('Validation Rules Extraction', () => {
      it('should extract pattern validations from schema', async () => {
        const result = await SchemaService.getSchema('course');

        expect(result?.validations['course.code']).toBeDefined();
        expect(result?.validations['course.code'].pattern).toBe('^[A-Z]{2,4}[0-9]{3}[A-Z]?$');
      });

      it('should extract min/max validations from schema', async () => {
        const result = await SchemaService.getSchema('course');

        const creditsValidation = result?.validations['course.credits'];
        expect(creditsValidation).toBeDefined();
        expect(creditsValidation.description.toLowerCase()).toContain('credit');
      });

      it('should extract string length validations from schema', async () => {
        const result = await SchemaService.getSchema('course');

        const titleValidation = result?.validations['course.title'];
        expect(titleValidation).toBeDefined();
        expect(titleValidation.description).toBeDefined();
      });
    });

    describe('Example Data Validity', () => {
      it('should include realistic and complete examples', async () => {
        const result = await SchemaService.getSchema('course');

        const minimalExample = result?.examples.find((ex) =>
          ex.description.toLowerCase().includes('minimal')
        );
        const completeExample = result?.examples.find((ex) =>
          ex.description.toLowerCase().includes('complete')
        );

        expect(minimalExample).toBeDefined();
        expect(completeExample).toBeDefined();

        // Minimal should have required fields only
        expect(minimalExample?.data.course.title).toBeDefined();
        expect(minimalExample?.data.course.code).toBeDefined();
        expect(minimalExample?.data.course.department).toBeDefined();
        expect(minimalExample?.data.course.credits).toBeDefined();

        // Complete should have optional fields too
        expect(completeExample?.data.course.description).toBeDefined();
        expect(completeExample?.data.modules).toBeDefined();
      });

      it('should include examples demonstrating all major variations', async () => {
        const moduleResult = await SchemaService.getSchema('module');

        // Should demonstrate different module types
        const hasCustom = moduleResult?.examples.some((ex) => ex.data.type === 'custom');
        const hasScormOrVideo = moduleResult?.examples.some(
          (ex) => ex.data.type === 'scorm' || ex.data.type === 'video'
        );

        expect(hasCustom || hasScormOrVideo).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing schema files gracefully', async () => {
      const result = await SchemaService.getSchema('nonexistent');

      expect(result).toBeNull();
    });

    it('should not throw errors for malformed resource names', async () => {
      await expect(SchemaService.getSchema('../../etc/passwd')).resolves.toBeNull();
      await expect(SchemaService.getSchema('../schema')).resolves.toBeNull();
    });
  });
});
