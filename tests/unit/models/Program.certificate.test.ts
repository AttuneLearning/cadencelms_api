import mongoose from 'mongoose';
import Program, { IProgram } from '../../../src/models/academic/Program.model';

describe('Program Model - Certificate Configuration', () => {
  const validProgramData = {
    name: 'Test Certificate Program',
    code: 'TESTCERT',
    departmentId: new mongoose.Types.ObjectId(),
    type: 'certificate' as const
  };

  describe('certificate field', () => {
    it('should create program without certificate config (defaults applied)', async () => {
      const program = new Program(validProgramData);
      await program.validate();

      // Certificate field exists with defaults when not explicitly set
      // enabled defaults to false, autoIssue defaults to false
      expect(program.certificate?.enabled).toBe(false);
      expect(program.certificate?.autoIssue).toBe(false);
    });

    it('should create program with certificate config enabled', async () => {
      const programWithCert = new Program({
        ...validProgramData,
        certificate: {
          enabled: true,
          title: 'Certificate of Completion',
          signatoryName: 'Dr. Jane Smith',
          signatoryTitle: 'Department Director',
          validityPeriod: 24,
          autoIssue: true
        }
      });

      await programWithCert.validate();

      expect(programWithCert.certificate).toBeDefined();
      expect(programWithCert.certificate?.enabled).toBe(true);
      expect(programWithCert.certificate?.title).toBe('Certificate of Completion');
      expect(programWithCert.certificate?.signatoryName).toBe('Dr. Jane Smith');
      expect(programWithCert.certificate?.signatoryTitle).toBe('Department Director');
      expect(programWithCert.certificate?.validityPeriod).toBe(24);
      expect(programWithCert.certificate?.autoIssue).toBe(true);
    });

    it('should create program with certificate disabled', async () => {
      const program = new Program({
        ...validProgramData,
        certificate: {
          enabled: false,
          autoIssue: false
        }
      });

      await program.validate();

      expect(program.certificate?.enabled).toBe(false);
      expect(program.certificate?.autoIssue).toBe(false);
    });

    it('should allow certificate config with templateId reference', async () => {
      const templateId = new mongoose.Types.ObjectId();
      const program = new Program({
        ...validProgramData,
        certificate: {
          enabled: true,
          templateId: templateId,
          autoIssue: true
        }
      });

      await program.validate();

      expect(program.certificate?.templateId?.toString()).toBe(templateId.toString());
    });

    it('should enforce validityPeriod minimum of 0', async () => {
      const program = new Program({
        ...validProgramData,
        certificate: {
          enabled: true,
          validityPeriod: -1,
          autoIssue: false
        }
      });

      await expect(program.validate()).rejects.toThrow();
    });

    it('should enforce title maxlength of 200', async () => {
      const program = new Program({
        ...validProgramData,
        certificate: {
          enabled: true,
          title: 'A'.repeat(201),
          autoIssue: false
        }
      });

      await expect(program.validate()).rejects.toThrow();
    });

    it('should enforce signatoryName maxlength of 100', async () => {
      const program = new Program({
        ...validProgramData,
        certificate: {
          enabled: true,
          signatoryName: 'A'.repeat(101),
          autoIssue: false
        }
      });

      await expect(program.validate()).rejects.toThrow();
    });

    it('should enforce signatoryTitle maxlength of 100', async () => {
      const program = new Program({
        ...validProgramData,
        certificate: {
          enabled: true,
          signatoryTitle: 'A'.repeat(101),
          autoIssue: false
        }
      });

      await expect(program.validate()).rejects.toThrow();
    });

    it('should default autoIssue to false when not specified', async () => {
      const program = new Program({
        ...validProgramData,
        certificate: {
          enabled: true
        }
      });

      await program.validate();

      expect(program.certificate?.autoIssue).toBe(false);
    });
  });
});
