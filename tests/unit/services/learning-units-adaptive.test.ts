import { Types } from 'mongoose';
import { LearningUnitsService } from '@/services/academic/learning-units.service';

jest.mock('@/models/content/LearningUnit.model');
jest.mock('@/models/academic/Module.model');

import LearningUnit from '@/models/content/LearningUnit.model';
import Module from '@/models/academic/Module.model';

const mockObjectId = () => new Types.ObjectId();

describe('LearningUnitsService — Adaptive Metadata', () => {
  const moduleId = mockObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLearningUnit', () => {
    it('should include adaptive field in response when set', async () => {
      const nodeId1 = mockObjectId();
      const nodeId2 = mockObjectId();
      const luId = mockObjectId();

      const mockUnit = {
        _id: luId,
        moduleId: new Types.ObjectId(moduleId),
        title: 'Gate Assessment',
        type: 'assessment',
        category: 'assessment',
        isRequired: true,
        isReplayable: false,
        weight: 50,
        sequence: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        adaptive: {
          teachesNodes: [nodeId1],
          assessesNodes: [nodeId2],
          isGate: true,
          isSkippable: false,
          gateConfig: {
            masteryThreshold: 0.85,
            minQuestions: 5,
            maxRetries: 3,
            failStrategy: 'inject-practice'
          }
        }
      };
      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockUnit);

      const result = await LearningUnitsService.getLearningUnit(luId.toString());

      expect(result.adaptive).toBeDefined();
      expect(result.adaptive!.teachesNodes).toEqual([nodeId1.toString()]);
      expect(result.adaptive!.assessesNodes).toEqual([nodeId2.toString()]);
      expect(result.adaptive!.isGate).toBe(true);
      expect(result.adaptive!.isSkippable).toBe(false);
      expect(result.adaptive!.gateConfig).toEqual({
        masteryThreshold: 0.85,
        minQuestions: 5,
        maxRetries: 3,
        failStrategy: 'inject-practice'
      });
    });

    it('should return undefined adaptive when not set', async () => {
      const luId = mockObjectId();
      const mockUnit = {
        _id: luId,
        moduleId: new Types.ObjectId(moduleId),
        title: 'Regular Lesson',
        type: 'lesson',
        category: 'lesson',
        isRequired: true,
        isReplayable: false,
        weight: 10,
        sequence: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
        // no adaptive field
      };
      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockUnit);

      const result = await LearningUnitsService.getLearningUnit(luId.toString());

      expect(result.adaptive).toBeUndefined();
    });
  });

  describe('createLearningUnit', () => {
    it('should accept adaptive data on creation', async () => {
      const nodeId = mockObjectId().toString();
      (Module.findById as jest.Mock).mockResolvedValue({ _id: moduleId });

      const mockMaxSeq = null;
      (LearningUnit.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockMaxSeq)
      });

      const createdLu = {
        _id: mockObjectId(),
        moduleId: new Types.ObjectId(moduleId),
        title: 'New Gate',
        type: 'assessment',
        category: 'assessment',
        isRequired: true,
        isReplayable: false,
        weight: 0,
        sequence: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        adaptive: {
          teachesNodes: [new Types.ObjectId(nodeId)],
          assessesNodes: [],
          isGate: true,
          isSkippable: false,
          gateConfig: {
            masteryThreshold: 0.8,
            minQuestions: 3,
            maxRetries: -1,
            failStrategy: 'hold'
          }
        }
      };
      (LearningUnit.create as jest.Mock).mockResolvedValue(createdLu);

      const result = await LearningUnitsService.createLearningUnit(
        moduleId,
        {
          title: 'New Gate',
          category: 'assessment',
          contentType: 'assessment',
          adaptive: {
            teachesNodes: [nodeId],
            isGate: true
          }
        },
        mockObjectId().toString()
      );

      // Verify adaptive was passed to create
      const createCall = (LearningUnit.create as jest.Mock).mock.calls[0][0];
      expect(createCall.adaptive).toBeDefined();
      expect(createCall.adaptive.teachesNodes).toHaveLength(1);
      expect(createCall.adaptive.isGate).toBe(true);

      expect(result.adaptive).toBeDefined();
      expect(result.adaptive!.isGate).toBe(true);
    });
  });

  describe('updateLearningUnit', () => {
    it('should update adaptive field', async () => {
      const luId = mockObjectId();
      const nodeId = mockObjectId().toString();

      const mockUnit = {
        _id: luId,
        moduleId: new Types.ObjectId(moduleId),
        title: 'Lesson',
        type: 'lesson',
        category: 'lesson',
        isRequired: true,
        isReplayable: false,
        weight: 10,
        sequence: 1,
        isActive: true,
        adaptive: undefined as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(undefined)
      };
      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockUnit);

      const result = await LearningUnitsService.updateLearningUnit(
        luId.toString(),
        {
          adaptive: {
            teachesNodes: [nodeId],
            isSkippable: true
          }
        }
      );

      expect(mockUnit.save).toHaveBeenCalled();
      expect(mockUnit.adaptive).toBeDefined();
      expect(mockUnit.adaptive.teachesNodes).toHaveLength(1);
      expect(mockUnit.adaptive.isSkippable).toBe(true);
    });
  });

  describe('listLearningUnits', () => {
    it('should include adaptive in list responses', async () => {
      const nodeId = mockObjectId();
      const units = [
        {
          _id: mockObjectId(),
          moduleId: new Types.ObjectId(moduleId),
          title: 'Unit 1',
          type: 'lesson',
          category: 'lesson',
          isRequired: true,
          isReplayable: false,
          weight: 10,
          sequence: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          adaptive: {
            teachesNodes: [nodeId],
            assessesNodes: [],
            isGate: false,
            isSkippable: true
          }
        }
      ];

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(units)
      };
      (LearningUnit.find as jest.Mock).mockReturnValue(mockFind);
      (LearningUnit.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await LearningUnitsService.listLearningUnits(moduleId, {});

      expect(result.learningUnits[0].adaptive).toBeDefined();
      expect(result.learningUnits[0].adaptive!.isSkippable).toBe(true);
      expect(result.learningUnits[0].adaptive!.teachesNodes).toEqual([nodeId.toString()]);
    });
  });
});
