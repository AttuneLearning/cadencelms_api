import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AcademicYear from '@/models/academic/AcademicYear.model';

describe('AcademicYear Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await AcademicYear.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid academic year with required fields', async () => {
      const year = await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        isActive: true
      });

      expect(year.name).toBe('2024-2025');
      expect(year.code).toBe('2024-25');
      expect(year.startDate).toEqual(new Date('2024-09-01'));
      expect(year.endDate).toEqual(new Date('2025-06-30'));
      expect(year.isActive).toBe(true);
    });

    it('should require name field', async () => {
      const year = new AcademicYear({
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30')
      });

      await expect(year.save()).rejects.toThrow(/name/);
    });

    it('should require code field', async () => {
      const year = new AcademicYear({
        name: '2024-2025',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30')
      });

      await expect(year.save()).rejects.toThrow(/code/);
    });

    it('should require startDate field', async () => {
      const year = new AcademicYear({
        name: '2024-2025',
        code: '2024-25',
        endDate: new Date('2025-06-30')
      });

      await expect(year.save()).rejects.toThrow(/startDate/);
    });

    it('should require endDate field', async () => {
      const year = new AcademicYear({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01')
      });

      await expect(year.save()).rejects.toThrow(/endDate/);
    });

    it('should enforce unique code', async () => {
      await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30')
      });

      await expect(
        AcademicYear.create({
          name: '2024-2025 Duplicate',
          code: '2024-25',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2025-06-30')
        })
      ).rejects.toThrow(/duplicate/);
    });

    it('should trim whitespace', async () => {
      const year = await AcademicYear.create({
        name: '  2024-2025  ',
        code: '  2024-25  ',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30')
      });

      expect(year.name).toBe('2024-2025');
      expect(year.code).toBe('2024-25');
    });

    it('should validate endDate is after startDate', async () => {
      const year = new AcademicYear({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2025-06-30'),
        endDate: new Date('2024-09-01')
      });

      await expect(year.save()).rejects.toThrow(/must be after/);
    });

    it('should not allow endDate equal to startDate', async () => {
      const date = new Date('2024-09-01');
      const year = new AcademicYear({
        name: '2024-2025',
        code: '2024-25',
        startDate: date,
        endDate: date
      });

      await expect(year.save()).rejects.toThrow(/must be after/);
    });
  });

  describe('Terms', () => {
    it('should store terms within academic year', async () => {
      const year = await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        terms: [
          {
            name: 'Fall 2024',
            code: 'FALL24',
            startDate: new Date('2024-09-01'),
            endDate: new Date('2024-12-20')
          },
          {
            name: 'Spring 2025',
            code: 'SPRING25',
            startDate: new Date('2025-01-15'),
            endDate: new Date('2025-05-15')
          }
        ]
      });

      expect(year.terms).toHaveLength(2);
      expect(year.terms[0].name).toBe('Fall 2024');
      expect(year.terms[1].name).toBe('Spring 2025');
    });

    it('should require term name', async () => {
      const year = new AcademicYear({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        terms: [
          {
            code: 'FALL24',
            startDate: new Date('2024-09-01'),
            endDate: new Date('2024-12-20')
          }
        ]
      });

      await expect(year.save()).rejects.toThrow();
    });

    it('should require term code', async () => {
      const year = new AcademicYear({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        terms: [
          {
            name: 'Fall 2024',
            startDate: new Date('2024-09-01'),
            endDate: new Date('2024-12-20')
          }
        ]
      });

      await expect(year.save()).rejects.toThrow();
    });

    it('should validate term endDate is after startDate', async () => {
      const year = new AcademicYear({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        terms: [
          {
            name: 'Fall 2024',
            code: 'FALL24',
            startDate: new Date('2024-12-20'),
            endDate: new Date('2024-09-01')
          }
        ]
      });

      await expect(year.save()).rejects.toThrow(/must be after/);
    });

    it('should convert term code to uppercase', async () => {
      const year = await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        terms: [
          {
            name: 'Fall 2024',
            code: 'fall24',
            startDate: new Date('2024-09-01'),
            endDate: new Date('2024-12-20')
          }
        ]
      });

      expect(year.terms[0].code).toBe('FALL24');
    });
  });

  describe('Metadata', () => {
    it('should set default isActive to true', async () => {
      const year = await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30')
      });

      expect(year.isActive).toBe(true);
    });

    it('should allow setting isActive to false', async () => {
      const year = await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        isActive: false
      });

      expect(year.isActive).toBe(false);
    });

    it('should store custom metadata', async () => {
      const year = await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        metadata: {
          theme: 'Innovation',
          holidays: ['2024-12-25', '2025-01-01']
        }
      });

      expect(year.metadata).toEqual({
        theme: 'Innovation',
        holidays: ['2024-12-25', '2025-01-01']
      });
    });

    it('should auto-generate timestamps', async () => {
      const year = await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30')
      });

      expect(year.createdAt).toBeDefined();
      expect(year.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find active academic years', async () => {
      await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        isActive: true
      });

      await AcademicYear.create({
        name: '2023-2024',
        code: '2023-24',
        startDate: new Date('2023-09-01'),
        endDate: new Date('2024-06-30'),
        isActive: false
      });

      const active = await AcademicYear.find({ isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('2024-2025');
    });

    it('should find by code', async () => {
      await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30')
      });

      const year = await AcademicYear.findOne({ code: '2024-25' });
      expect(year).toBeDefined();
      expect(year!.name).toBe('2024-2025');
    });

    it('should find years by date range', async () => {
      await AcademicYear.create({
        name: '2024-2025',
        code: '2024-25',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30')
      });

      const year = await AcademicYear.findOne({
        startDate: { $lte: new Date('2024-10-01') },
        endDate: { $gte: new Date('2024-10-01') }
      });

      expect(year).toBeDefined();
      expect(year!.name).toBe('2024-2025');
    });
  });
});
