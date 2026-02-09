import mongoose from 'mongoose';
import { CertificatePdfService } from '@/services/certificate/certificatePdf.service';
import { ApiError } from '@/utils/ApiError';

const { ObjectId } = mongoose.Types;

// --- Mocks ---

jest.mock('@/models/certificate/CertificateIssuance.model', () => {
  const mockFindById = jest.fn();
  const mockFindByIdAndUpdate = jest.fn();
  return {
    __esModule: true,
    default: {
      findById: mockFindById,
      findByIdAndUpdate: mockFindByIdAndUpdate
    }
  };
});

jest.mock('@/services/storage/storage.factory', () => ({
  getStorageProvider: jest.fn()
}));

jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const handlers: Record<string, Function[]> = {};
    return {
      on: jest.fn((event: string, handler: Function) => {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(handler);
        return this;
      }),
      rect: jest.fn().mockReturnThis(),
      lineWidth: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      image: jest.fn().mockReturnThis(),
      end: jest.fn(function(this: any) {
        const dataHandlers = handlers['data'] || [];
        for (const h of dataHandlers) {
          h(Buffer.from('mock-pdf-content'));
        }
        const endHandlers = handlers['end'] || [];
        for (const h of endHandlers) {
          h();
        }
      })
    };
  });
});

jest.mock('qrcode', () => ({
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-qr-png'))
}));

jest.mock('@/events/eventBus', () => {
  const onFn = jest.fn();
  return {
    eventBus: { on: onFn, emit: jest.fn() },
    EVENTS: {
      CERTIFICATE_REVOKED: 'certificate.revoked',
      CERTIFICATE_UPGRADED: 'certificate.upgraded'
    }
  };
});

// --- Imports after mocks ---

import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import { getStorageProvider } from '@/services/storage/storage.factory';
import QRCode from 'qrcode';
import { eventBus, EVENTS } from '@/events/eventBus';

// --- Helpers ---

const mockIssuanceId = new ObjectId().toHexString();
const mockUserId = new ObjectId().toHexString();
const mockLearnerId = new ObjectId();

function buildMockIssuance(overrides: Record<string, any> = {}) {
  return {
    _id: new ObjectId(mockIssuanceId),
    certificateDefinitionId: { _id: new ObjectId(), title: 'Safety Cert v1' },
    credentialGroupId: { _id: new ObjectId(), name: 'OSHA Safety', type: 'certificate' },
    learnerId: { _id: mockLearnerId, firstName: 'Jane', lastName: 'Doe' },
    completedRequirements: [
      {
        courseTitle: 'Safety Fundamentals',
        finalScore: 92,
        completedAt: new Date('2025-06-01')
      }
    ],
    issuedAt: new Date('2025-06-15'),
    expiresAt: null,
    verificationCode: 'ABCDEF234567',
    pdfUrl: null,
    revokedAt: null,
    ...overrides
  };
}

function buildMockStorage(overrides: Record<string, any> = {}) {
  return {
    objectExists: jest.fn().mockResolvedValue(false),
    putObject: jest.fn().mockResolvedValue('https://storage.example.com/certificates/pdfs/test.pdf'),
    deleteObject: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

// --- Tests ---

describe('CertificatePdfService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrGeneratePdf', () => {
    it('should generate PDF, upload, save URL, and return', async () => {
      const issuance = buildMockIssuance();
      const storage = buildMockStorage();

      (CertificateIssuance.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(issuance)
            })
          })
        })
      });
      (getStorageProvider as jest.Mock).mockReturnValue(storage);
      (CertificateIssuance.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await CertificatePdfService.getOrGeneratePdf(mockIssuanceId, mockUserId);

      expect(result).toHaveProperty('pdfUrl');
      expect(storage.putObject).toHaveBeenCalledWith(
        expect.stringContaining('certificates/pdfs/'),
        expect.any(Buffer),
        'application/pdf'
      );
      expect(CertificateIssuance.findByIdAndUpdate).toHaveBeenCalledWith(
        mockIssuanceId,
        { pdfUrl: expect.any(String) }
      );
    });

    it('should return cached PDF URL without regeneration', async () => {
      const cachedUrl = 'https://storage.example.com/certificates/pdfs/cached.pdf';
      const issuance = buildMockIssuance({ pdfUrl: cachedUrl });
      const storage = buildMockStorage({ objectExists: jest.fn().mockResolvedValue(true) });

      (CertificateIssuance.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(issuance)
            })
          })
        })
      });
      (getStorageProvider as jest.Mock).mockReturnValue(storage);

      const result = await CertificatePdfService.getOrGeneratePdf(mockIssuanceId, mockUserId);

      expect(result.pdfUrl).toBe(cachedUrl);
      expect(storage.putObject).not.toHaveBeenCalled();
    });

    it('should regenerate if pdfUrl is set but file is missing (stale cache)', async () => {
      const issuance = buildMockIssuance({ pdfUrl: 'https://storage.example.com/stale.pdf' });
      const storage = buildMockStorage({
        objectExists: jest.fn().mockResolvedValue(false)
      });

      (CertificateIssuance.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(issuance)
            })
          })
        })
      });
      (getStorageProvider as jest.Mock).mockReturnValue(storage);
      (CertificateIssuance.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await CertificatePdfService.getOrGeneratePdf(mockIssuanceId, mockUserId);

      expect(result).toHaveProperty('pdfUrl');
      expect(storage.putObject).toHaveBeenCalled();
    });

    it('should throw badRequest for revoked certificate', async () => {
      const issuance = buildMockIssuance({ revokedAt: new Date() });

      (CertificateIssuance.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(issuance)
            })
          })
        })
      });

      await expect(
        CertificatePdfService.getOrGeneratePdf(mockIssuanceId, mockUserId)
      ).rejects.toThrow(ApiError);

      await expect(
        CertificatePdfService.getOrGeneratePdf(mockIssuanceId, mockUserId)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw notFound when issuance does not exist', async () => {
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(null)
            })
          })
        })
      });

      await expect(
        CertificatePdfService.getOrGeneratePdf(mockIssuanceId, mockUserId)
      ).rejects.toThrow(ApiError);

      await expect(
        CertificatePdfService.getOrGeneratePdf(mockIssuanceId, mockUserId)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw badRequest for invalid ID format', async () => {
      await expect(
        CertificatePdfService.getOrGeneratePdf('not-an-objectid', mockUserId)
      ).rejects.toThrow(ApiError);

      await expect(
        CertificatePdfService.getOrGeneratePdf('not-an-objectid', mockUserId)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('generatePdfBuffer', () => {
    it('should return a Buffer', async () => {
      const data = {
        credentialGroupName: 'OSHA Safety',
        credentialType: 'certificate',
        certificateTitle: 'Safety Cert v1',
        learnerName: 'Jane Doe',
        completedRequirements: [
          { courseTitle: 'Safety 101', finalScore: 95, completedAt: new Date() }
        ],
        issuedAt: new Date(),
        expiresAt: null,
        verificationCode: 'ABCDEF234567',
        verificationUrl: 'http://localhost:3000/certificates/verify/ABCDEF234567'
      };

      const result = await CertificatePdfService.generatePdfBuffer(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  describe('generateQrCode', () => {
    it('should call QRCode.toBuffer with correct URL', async () => {
      const url = 'http://localhost:3000/certificates/verify/ABCDEF234567';
      const result = await CertificatePdfService.generateQrCode(url);

      expect(QRCode.toBuffer).toHaveBeenCalledWith(url, {
        width: 200,
        margin: 1,
        color: { dark: '#1a365d', light: '#ffffff' }
      });
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  describe('buildStorageKey', () => {
    it('should return correct format', () => {
      const key = CertificatePdfService.buildStorageKey('abc123', 'XYZCODE');
      expect(key).toBe('certificates/pdfs/abc123/certificate-XYZCODE.pdf');
    });
  });

  describe('invalidatePdfCache', () => {
    it('should delete from storage and clear pdfUrl', async () => {
      const issuance = { _id: new ObjectId(), verificationCode: 'ABCDEF234567' };
      const storage = buildMockStorage();

      (CertificateIssuance.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(issuance)
      });
      (getStorageProvider as jest.Mock).mockReturnValue(storage);
      (CertificateIssuance.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await CertificatePdfService.invalidatePdfCache(mockIssuanceId);

      expect(storage.deleteObject).toHaveBeenCalledWith(
        expect.stringContaining('certificates/pdfs/')
      );
      expect(CertificateIssuance.findByIdAndUpdate).toHaveBeenCalledWith(
        mockIssuanceId,
        { pdfUrl: null }
      );
    });

    it('should handle missing issuance gracefully', async () => {
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      await expect(
        CertificatePdfService.invalidatePdfCache(mockIssuanceId)
      ).resolves.not.toThrow();
    });
  });

  describe('Event listeners', () => {
    // Capture calls at module load time (before beforeEach clears mocks)
    const eventBusOnCalls = (eventBus.on as jest.Mock).mock.calls.slice();

    it('should register listeners for CERTIFICATE_REVOKED and CERTIFICATE_UPGRADED', () => {
      const revokedCall = eventBusOnCalls.find(
        (call) => call[0] === 'certificate.revoked'
      );
      const upgradedCall = eventBusOnCalls.find(
        (call) => call[0] === 'certificate.upgraded'
      );

      expect(revokedCall).toBeDefined();
      expect(typeof revokedCall![1]).toBe('function');
      expect(upgradedCall).toBeDefined();
      expect(typeof upgradedCall![1]).toBe('function');
    });
  });
});
