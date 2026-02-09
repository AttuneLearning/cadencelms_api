/**
 * Unit Tests: Certificate PDF Endpoint
 *
 * Tests for the getCertificatePdf controller action.
 */

import { Request, Response } from 'express';

// Mock the services before importing the controller
jest.mock('@/services/certificate/certificateIssuance.service');
jest.mock('@/services/certificate/certificateVerification.service');
jest.mock('@/services/certificate/certificateUpgrade.service');
jest.mock('@/services/certificate/certificatePdf.service', () => ({
  CertificatePdfService: {
    getOrGeneratePdf: jest.fn()
  }
}));

import { getCertificatePdf } from '@/controllers/certificate/certificateIssuance.controller';
import { CertificatePdfService } from '@/services/certificate/certificatePdf.service';

describe('getCertificatePdf', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let redirectMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    redirectMock = jest.fn();

    mockRequest = {
      params: { id: 'issuance-123' },
      query: {},
      headers: {}
    };
    (mockRequest as any).user = { userId: 'user-1' };

    mockResponse = {
      json: jsonMock,
      status: statusMock,
      redirect: redirectMock
    };

    mockNext = jest.fn();
  });

  it('should return JSON with pdfUrl when no download requested', async () => {
    const pdfResult = { pdfUrl: 'https://cdn.test.com/certs/cert-123.pdf' };
    (CertificatePdfService.getOrGeneratePdf as jest.Mock).mockResolvedValue(pdfResult);

    // asyncHandler wraps the function; call the inner function directly
    const handler = getCertificatePdf as any;
    await handler(mockRequest as Request, mockResponse as Response, mockNext);

    expect(CertificatePdfService.getOrGeneratePdf).toHaveBeenCalledWith(
      'issuance-123',
      'user-1'
    );
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  it('should redirect when download=true query param is set', async () => {
    const pdfUrl = 'https://cdn.test.com/certs/cert-123.pdf';
    (CertificatePdfService.getOrGeneratePdf as jest.Mock).mockResolvedValue({ pdfUrl });
    mockRequest.query = { download: 'true' };

    const handler = getCertificatePdf as any;
    await handler(mockRequest as Request, mockResponse as Response, mockNext);

    expect(redirectMock).toHaveBeenCalledWith(302, pdfUrl);
  });

  it('should redirect when Accept header is application/pdf', async () => {
    const pdfUrl = 'https://cdn.test.com/certs/cert-456.pdf';
    (CertificatePdfService.getOrGeneratePdf as jest.Mock).mockResolvedValue({ pdfUrl });
    mockRequest.headers = { accept: 'application/pdf' };

    const handler = getCertificatePdf as any;
    await handler(mockRequest as Request, mockResponse as Response, mockNext);

    expect(redirectMock).toHaveBeenCalledWith(302, pdfUrl);
  });
});
