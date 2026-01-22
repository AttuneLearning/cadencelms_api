import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { LearningUnitsService } from '@/services/academic/learning-units.service';
import LearningUnit from '@/models/content/LearningUnit.model';
import Module from '@/models/academic/Module.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('LearningUnitsService - Unit Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  /**
   * Helper function to create a test module
   */
  const createTestModule = async (overrides: Partial<any> = {}) => {
    const defaultModule = {
      courseId: new mongoose.Types.ObjectId(),
      title: 'Test Module',
      description: 'A test module',
      prerequisites: [],
      completionCriteria: {
        type: 'all_required',
        requireAllExpositions: true
      },
      presentationRules: {
        presentationMode: 'prescribed',
        repetitionMode: 'none',
        repeatOn: {
          failedAttempt: false,
          belowMastery: false,
          learnerRequest: false
        },
        repeatableCategories: [],
        showAllAvailable: true,
        allowSkip: false
      },
      isPublished: false,
      estimatedDuration: 60,
      order: 1,
      createdBy: new mongoose.Types.ObjectId()
    };

    return Module.create({ ...defaultModule, ...overrides });
  };

  /**
   * Helper function to create a test learning unit
   */
  const createTestLearningUnit = async (moduleId: mongoose.Types.ObjectId, overrides: Partial<any> = {}) => {
    const defaultLearningUnit = {
      moduleId,
      title: 'Test Learning Unit',
      description: 'A test learning unit',
      type: 'video',
      category: 'exposition',
      isRequired: true,
      isReplayable: false,
      weight: 10,
      sequence: 1,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId()
    };

    return LearningUnit.create({ ...defaultLearningUnit, ...overrides });
  };

  describe('listLearningUnits()', () => {
    it('should return empty array when no learning units exist for module', async () => {
      const moduleId = new mongoose.Types.ObjectId().toString();

      const result = await LearningUnitsService.listLearningUnits(moduleId, {});

      expect(result.learningUnits).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should return learning units for a specific module', async () => {
      const module = await createTestModule();
      await createTestLearningUnit(module._id, { title: 'Unit 1', sequence: 1 });
      await createTestLearningUnit(module._id, { title: 'Unit 2', sequence: 2 });

      const result = await LearningUnitsService.listLearningUnits(module._id.toString(), {});

      expect(result.learningUnits).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should not return learning units from other modules', async () => {
      const module1 = await createTestModule({ title: 'Module 1' });
      const module2 = await createTestModule({ title: 'Module 2' });

      await createTestLearningUnit(module1._id, { title: 'Unit in Module 1' });
      await createTestLearningUnit(module2._id, { title: 'Unit in Module 2' });

      const result = await LearningUnitsService.listLearningUnits(module1._id.toString(), {});

      expect(result.learningUnits).toHaveLength(1);
      expect(result.learningUnits[0].title).toBe('Unit in Module 1');
    });

    it('should filter by category', async () => {
      const module = await createTestModule();
      await createTestLearningUnit(module._id, { title: 'Exposition Unit', category: 'exposition' });
      await createTestLearningUnit(module._id, { title: 'Practice Unit', category: 'practice', sequence: 2 });
      await createTestLearningUnit(module._id, { title: 'Assessment Unit', category: 'assessment', sequence: 3 });

      const result = await LearningUnitsService.listLearningUnits(module._id.toString(), {
        category: 'practice'
      });

      expect(result.learningUnits).toHaveLength(1);
      expect(result.learningUnits[0].category).toBe('practice');
    });

    it('should filter by isRequired', async () => {
      const module = await createTestModule();
      await createTestLearningUnit(module._id, { title: 'Required Unit', isRequired: true });
      await createTestLearningUnit(module._id, { title: 'Optional Unit', isRequired: false, sequence: 2 });

      const result = await LearningUnitsService.listLearningUnits(module._id.toString(), {
        isRequired: true
      });

      expect(result.learningUnits).toHaveLength(1);
      expect(result.learningUnits[0].isRequired).toBe(true);
    });

    it('should paginate results', async () => {
      const module = await createTestModule();
      for (let i = 1; i <= 15; i++) {
        await createTestLearningUnit(module._id, { title: `Unit ${i}`, sequence: i });
      }

      const page1 = await LearningUnitsService.listLearningUnits(module._id.toString(), {
        page: 1,
        limit: 10
      });

      expect(page1.learningUnits).toHaveLength(10);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.total).toBe(15);
      expect(page1.pagination.totalPages).toBe(2);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);

      const page2 = await LearningUnitsService.listLearningUnits(module._id.toString(), {
        page: 2,
        limit: 10
      });

      expect(page2.learningUnits).toHaveLength(5);
      expect(page2.pagination.hasNext).toBe(false);
      expect(page2.pagination.hasPrev).toBe(true);
    });

    it('should sort by sequence ascending by default', async () => {
      const module = await createTestModule();
      await createTestLearningUnit(module._id, { title: 'Unit 3', sequence: 3 });
      await createTestLearningUnit(module._id, { title: 'Unit 1', sequence: 1 });
      await createTestLearningUnit(module._id, { title: 'Unit 2', sequence: 2 });

      const result = await LearningUnitsService.listLearningUnits(module._id.toString(), {});

      expect(result.learningUnits[0].title).toBe('Unit 1');
      expect(result.learningUnits[1].title).toBe('Unit 2');
      expect(result.learningUnits[2].title).toBe('Unit 3');
    });

    it('should support custom sorting', async () => {
      const module = await createTestModule();
      await createTestLearningUnit(module._id, { title: 'Alpha', sequence: 2 });
      await createTestLearningUnit(module._id, { title: 'Beta', sequence: 1 });

      const result = await LearningUnitsService.listLearningUnits(module._id.toString(), {
        sort: 'title'
      });

      expect(result.learningUnits[0].title).toBe('Alpha');
      expect(result.learningUnits[1].title).toBe('Beta');
    });

    it('should only return active learning units', async () => {
      const module = await createTestModule();
      await createTestLearningUnit(module._id, { title: 'Active Unit', isActive: true });
      await createTestLearningUnit(module._id, { title: 'Inactive Unit', isActive: false, sequence: 2 });

      const result = await LearningUnitsService.listLearningUnits(module._id.toString(), {});

      expect(result.learningUnits).toHaveLength(1);
      expect(result.learningUnits[0].title).toBe('Active Unit');
    });
  });

  describe('getLearningUnit()', () => {
    it('should return a learning unit by ID', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id, {
        title: 'Test Unit',
        description: 'Test description',
        category: 'exposition',
        type: 'video'
      });

      const result = await LearningUnitsService.getLearningUnit(learningUnit._id.toString());

      expect(result.id).toBe(learningUnit._id.toString());
      expect(result.title).toBe('Test Unit');
      expect(result.description).toBe('Test description');
      expect(result.category).toBe('exposition');
    });

    it('should throw 404 for non-existent learning unit', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        LearningUnitsService.getLearningUnit(nonExistentId)
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw 404 for inactive learning unit', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id, { isActive: false });

      await expect(
        LearningUnitsService.getLearningUnit(learningUnit._id.toString())
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw error for invalid ID format', async () => {
      await expect(
        LearningUnitsService.getLearningUnit('invalid-id')
      ).rejects.toThrow('Invalid learning unit ID');
    });
  });

  describe('createLearningUnit()', () => {
    it('should create a learning unit with required fields', async () => {
      const module = await createTestModule();
      const createdBy = new mongoose.Types.ObjectId().toString();

      const result = await LearningUnitsService.createLearningUnit(
        module._id.toString(),
        {
          title: 'New Unit',
          category: 'exposition',
          contentType: 'video'
        },
        createdBy
      );

      expect(result.title).toBe('New Unit');
      expect(result.category).toBe('exposition');
      expect(result.contentType).toBe('video');
      expect(result.moduleId).toBe(module._id.toString());
    });

    it('should create a learning unit with all optional fields', async () => {
      const module = await createTestModule();
      const createdBy = new mongoose.Types.ObjectId().toString();
      const contentId = new mongoose.Types.ObjectId().toString();

      const result = await LearningUnitsService.createLearningUnit(
        module._id.toString(),
        {
          title: 'Complete Unit',
          description: 'Full description',
          category: 'assessment',
          contentType: 'exercise',
          contentId,
          isRequired: false,
          isReplayable: true,
          weight: 25,
          estimatedDuration: 30
        },
        createdBy
      );

      expect(result.title).toBe('Complete Unit');
      expect(result.description).toBe('Full description');
      expect(result.category).toBe('assessment');
      expect(result.isRequired).toBe(false);
      expect(result.isReplayable).toBe(true);
      expect(result.weight).toBe(25);
      expect(result.estimatedDuration).toBe(30);
    });

    it('should auto-assign sequence number', async () => {
      const module = await createTestModule();
      const createdBy = new mongoose.Types.ObjectId().toString();

      await createTestLearningUnit(module._id, { sequence: 1 });
      await createTestLearningUnit(module._id, { sequence: 2 });

      const result = await LearningUnitsService.createLearningUnit(
        module._id.toString(),
        {
          title: 'Third Unit',
          category: 'practice',
          contentType: 'exercise'
        },
        createdBy
      );

      expect(result.sequence).toBe(3);
    });

    it('should throw error for non-existent module', async () => {
      const nonExistentModuleId = new mongoose.Types.ObjectId().toString();
      const createdBy = new mongoose.Types.ObjectId().toString();

      await expect(
        LearningUnitsService.createLearningUnit(
          nonExistentModuleId,
          {
            title: 'Test Unit',
            category: 'exposition',
            contentType: 'video'
          },
          createdBy
        )
      ).rejects.toThrow('Module not found');
    });

    it('should validate category values', async () => {
      const module = await createTestModule();
      const createdBy = new mongoose.Types.ObjectId().toString();

      await expect(
        LearningUnitsService.createLearningUnit(
          module._id.toString(),
          {
            title: 'Test Unit',
            category: 'invalid' as any,
            contentType: 'video'
          },
          createdBy
        )
      ).rejects.toThrow();
    });

    it('should set default values for isRequired and isReplayable', async () => {
      const module = await createTestModule();
      const createdBy = new mongoose.Types.ObjectId().toString();

      const result = await LearningUnitsService.createLearningUnit(
        module._id.toString(),
        {
          title: 'Default Values Unit',
          category: 'exposition',
          contentType: 'video'
        },
        createdBy
      );

      expect(result.isRequired).toBe(true);
      expect(result.isReplayable).toBe(false);
    });
  });

  describe('updateLearningUnit()', () => {
    it('should update learning unit fields', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id, {
        title: 'Original Title',
        description: 'Original description'
      });

      const result = await LearningUnitsService.updateLearningUnit(
        learningUnit._id.toString(),
        {
          title: 'Updated Title',
          description: 'Updated description'
        }
      );

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated description');
    });

    it('should update category', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id, { category: 'exposition' });

      const result = await LearningUnitsService.updateLearningUnit(
        learningUnit._id.toString(),
        { category: 'practice' }
      );

      expect(result.category).toBe('practice');
    });

    it('should update weight and required fields', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id, {
        weight: 10,
        isRequired: true
      });

      const result = await LearningUnitsService.updateLearningUnit(
        learningUnit._id.toString(),
        {
          weight: 20,
          isRequired: false
        }
      );

      expect(result.weight).toBe(20);
      expect(result.isRequired).toBe(false);
    });

    it('should throw 404 for non-existent learning unit', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        LearningUnitsService.updateLearningUnit(nonExistentId, { title: 'Updated' })
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw 404 for inactive learning unit', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id, { isActive: false });

      await expect(
        LearningUnitsService.updateLearningUnit(learningUnit._id.toString(), { title: 'Updated' })
      ).rejects.toThrow('Learning unit not found');
    });

    it('should not modify fields that are not provided', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id, {
        title: 'Original',
        description: 'Original description',
        weight: 15
      });

      const result = await LearningUnitsService.updateLearningUnit(
        learningUnit._id.toString(),
        { title: 'Updated' }
      );

      expect(result.title).toBe('Updated');
      expect(result.description).toBe('Original description');
      expect(result.weight).toBe(15);
    });
  });

  describe('deleteLearningUnit()', () => {
    it('should soft delete a learning unit', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id);

      await LearningUnitsService.deleteLearningUnit(learningUnit._id.toString());

      const deleted = await LearningUnit.findById(learningUnit._id);
      expect(deleted?.isActive).toBe(false);
    });

    it('should throw 404 for non-existent learning unit', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        LearningUnitsService.deleteLearningUnit(nonExistentId)
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw 404 for already deleted learning unit', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id, { isActive: false });

      await expect(
        LearningUnitsService.deleteLearningUnit(learningUnit._id.toString())
      ).rejects.toThrow('Learning unit not found');
    });
  });

  describe('reorderLearningUnits()', () => {
    it('should reorder learning units based on provided order', async () => {
      const module = await createTestModule();
      const unit1 = await createTestLearningUnit(module._id, { title: 'Unit 1', sequence: 1 });
      const unit2 = await createTestLearningUnit(module._id, { title: 'Unit 2', sequence: 2 });
      const unit3 = await createTestLearningUnit(module._id, { title: 'Unit 3', sequence: 3 });

      // Reorder: Unit 3, Unit 1, Unit 2
      await LearningUnitsService.reorderLearningUnits(module._id.toString(), [
        unit3._id.toString(),
        unit1._id.toString(),
        unit2._id.toString()
      ]);

      const reorderedUnit1 = await LearningUnit.findById(unit1._id);
      const reorderedUnit2 = await LearningUnit.findById(unit2._id);
      const reorderedUnit3 = await LearningUnit.findById(unit3._id);

      expect(reorderedUnit3?.sequence).toBe(1);
      expect(reorderedUnit1?.sequence).toBe(2);
      expect(reorderedUnit2?.sequence).toBe(3);
    });

    it('should throw error if learning unit IDs do not belong to the module', async () => {
      const module1 = await createTestModule({ title: 'Module 1' });
      const module2 = await createTestModule({ title: 'Module 2' });

      const unit1 = await createTestLearningUnit(module1._id, { title: 'Unit 1' });
      const unit2 = await createTestLearningUnit(module2._id, { title: 'Unit 2' });

      await expect(
        LearningUnitsService.reorderLearningUnits(module1._id.toString(), [
          unit1._id.toString(),
          unit2._id.toString()
        ])
      ).rejects.toThrow('One or more learning units do not belong to this module');
    });

    it('should throw error if not all module learning units are included', async () => {
      const module = await createTestModule();
      const unit1 = await createTestLearningUnit(module._id, { title: 'Unit 1', sequence: 1 });
      await createTestLearningUnit(module._id, { title: 'Unit 2', sequence: 2 });

      await expect(
        LearningUnitsService.reorderLearningUnits(module._id.toString(), [
          unit1._id.toString()
        ])
      ).rejects.toThrow('Must include all active learning units in the reorder');
    });

    it('should handle empty array gracefully', async () => {
      const module = await createTestModule();

      await LearningUnitsService.reorderLearningUnits(module._id.toString(), []);
      // Should not throw
    });
  });

  describe('moveLearningUnit()', () => {
    it('should move learning unit to another module', async () => {
      const module1 = await createTestModule({ title: 'Source Module' });
      const module2 = await createTestModule({ title: 'Target Module' });

      const learningUnit = await createTestLearningUnit(module1._id, { title: 'Movable Unit' });

      const result = await LearningUnitsService.moveLearningUnit(
        learningUnit._id.toString(),
        module2._id.toString()
      );

      expect(result.moduleId).toBe(module2._id.toString());

      const movedUnit = await LearningUnit.findById(learningUnit._id);
      expect(movedUnit?.moduleId.toString()).toBe(module2._id.toString());
    });

    it('should assign correct sequence in target module', async () => {
      const module1 = await createTestModule({ title: 'Source Module' });
      const module2 = await createTestModule({ title: 'Target Module' });

      // Create existing units in target module
      await createTestLearningUnit(module2._id, { title: 'Existing Unit 1', sequence: 1 });
      await createTestLearningUnit(module2._id, { title: 'Existing Unit 2', sequence: 2 });

      const learningUnit = await createTestLearningUnit(module1._id, { title: 'Movable Unit' });

      const result = await LearningUnitsService.moveLearningUnit(
        learningUnit._id.toString(),
        module2._id.toString()
      );

      expect(result.sequence).toBe(3);
    });

    it('should throw error for non-existent target module', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id);
      const nonExistentModuleId = new mongoose.Types.ObjectId().toString();

      await expect(
        LearningUnitsService.moveLearningUnit(learningUnit._id.toString(), nonExistentModuleId)
      ).rejects.toThrow('Target module not found');
    });

    it('should throw error for non-existent learning unit', async () => {
      const module = await createTestModule();
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        LearningUnitsService.moveLearningUnit(nonExistentId, module._id.toString())
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw error when moving to the same module', async () => {
      const module = await createTestModule();
      const learningUnit = await createTestLearningUnit(module._id);

      await expect(
        LearningUnitsService.moveLearningUnit(learningUnit._id.toString(), module._id.toString())
      ).rejects.toThrow('Learning unit is already in this module');
    });

    it('should update sequences in source module after move', async () => {
      const module1 = await createTestModule({ title: 'Source Module' });
      const module2 = await createTestModule({ title: 'Target Module' });

      const unit1 = await createTestLearningUnit(module1._id, { title: 'Unit 1', sequence: 1 });
      const unit2 = await createTestLearningUnit(module1._id, { title: 'Unit 2', sequence: 2 });
      const unit3 = await createTestLearningUnit(module1._id, { title: 'Unit 3', sequence: 3 });

      // Move the middle unit
      await LearningUnitsService.moveLearningUnit(unit2._id.toString(), module2._id.toString());

      const remainingUnit1 = await LearningUnit.findById(unit1._id);
      const remainingUnit3 = await LearningUnit.findById(unit3._id);

      expect(remainingUnit1?.sequence).toBe(1);
      expect(remainingUnit3?.sequence).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid ObjectId format for moduleId in listLearningUnits', async () => {
      await expect(
        LearningUnitsService.listLearningUnits('invalid-id', {})
      ).rejects.toThrow('Invalid module ID');
    });

    it('should handle invalid ObjectId format for learningUnitId in getLearningUnit', async () => {
      await expect(
        LearningUnitsService.getLearningUnit('invalid-id')
      ).rejects.toThrow('Invalid learning unit ID');
    });

    it('should handle invalid ObjectId format in createLearningUnit', async () => {
      const createdBy = new mongoose.Types.ObjectId().toString();

      await expect(
        LearningUnitsService.createLearningUnit(
          'invalid-module-id',
          {
            title: 'Test',
            category: 'exposition',
            contentType: 'video'
          },
          createdBy
        )
      ).rejects.toThrow('Invalid module ID');
    });

    it('should handle invalid ObjectId format in updateLearningUnit', async () => {
      await expect(
        LearningUnitsService.updateLearningUnit('invalid-id', { title: 'Updated' })
      ).rejects.toThrow('Invalid learning unit ID');
    });

    it('should handle invalid ObjectId format in deleteLearningUnit', async () => {
      await expect(
        LearningUnitsService.deleteLearningUnit('invalid-id')
      ).rejects.toThrow('Invalid learning unit ID');
    });

    it('should handle invalid ObjectId format in reorderLearningUnits', async () => {
      await expect(
        LearningUnitsService.reorderLearningUnits('invalid-id', [])
      ).rejects.toThrow('Invalid module ID');
    });

    it('should handle invalid ObjectId format in moveLearningUnit', async () => {
      const validId = new mongoose.Types.ObjectId().toString();

      await expect(
        LearningUnitsService.moveLearningUnit('invalid-id', validId)
      ).rejects.toThrow('Invalid learning unit ID');

      await expect(
        LearningUnitsService.moveLearningUnit(validId, 'invalid-id')
      ).rejects.toThrow('Invalid module ID');
    });
  });
});
