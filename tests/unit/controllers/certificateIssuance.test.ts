/**
 * CertificateIssuance Controller Tests
 * Tests the getCertificatePdf endpoint added for PDF generation
 */

import { Request, Response } from 'express';

// Mock dependencies before importing
jest.mock('@/services/certificate/certificatePdf.service');
jest.mock('@/utils/asyncHandler', () => ({
  asyncHandler: (fn: Function) => fn,
}));
jest.mock('@/services/certificate/certificateIssuance.service');
jest.mock('@/services/certificate/certificateVerification.service');
jest.mock('@/services/certificate/certificateUpgrade.service');

import { getCertificatePdf } from '@/controllers/certificate/certificateIssuance.controller';
import { CertificatePdfService } from '@/services/certificate/certificatePdf.service';

describe('CertificateIssuance Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let redirectMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    redirectMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      params: { id: 'issuance-123' },
      query: {},
      headers: { accept: 'application/json' },
      user: { userId: 'user-1' },
    } as any;

    mockResponse = {
      json: jsonMock,
      status: statusMock,
      redirect: redirectMock,
    };
  });

  describe('getCertificatePdf', () => {
    it('should return PDF URL as JSON when no download flag', async () => {
      const mockResult = { pdfUrl: 'https://storage.example.com/certificates/cert.pdf' };
      (CertificatePdfService.getOrGeneratePdf as jest.Mock).mockResolvedValue(mockResult);

      await getCertificatePdf(mockRequest as Request, mockResponse as Response);

      expect(CertificatePdfService.getOrGeneratePdf).toHaveBeenCalledWith('issuance-123', 'user-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult,
        })
      );
    });

    it('should redirect when download query param is true', async () => {
      const pdfUrl = 'https://storage.example.com/certificates/cert.pdf';
      (CertificatePdfService.getOrGeneratePdf as jest.Mock).mockResolvedValue({ pdfUrl });

      mockRequest.query = { download: 'true' };

      await getCertificatePdf(mockRequest as Request, mockResponse as Response);

      expect(redirectMock).toHaveBeenCalledWith(302, pdfUrl);
    });

    it('should redirect when Accept header is application/pdf', async () => {
      const pdfUrl = 'https://storage.example.com/certificates/cert.pdf';
      (CertificatePdfService.getOrGeneratePdf as jest.Mock).mockResolvedValue({ pdfUrl });

      mockRequest.headers = { accept: 'application/pdf' };

      await getCertificatePdf(mockRequest as Request, mockResponse as Response);

      expect(redirectMock).toHaveBeenCalledWith(302, pdfUrl);
    });

    it('should call getOrGeneratePdf with correct params', async () => {
      const mockResult = { pdfUrl: 'https://example.com/cert.pdf' };
      (CertificatePdfService.getOrGeneratePdf as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.params = { id: 'different-id' };
      (mockRequest as any).user = { userId: 'another-user' };

      await getCertificatePdf(mockRequest as Request, mockResponse as Response);

      expect(CertificatePdfService.getOrGeneratePdf).toHaveBeenCalledWith(
        'different-id',
        'another-user'
      );
    });
  });
});
