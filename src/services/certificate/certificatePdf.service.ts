import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import { getStorageProvider } from '@/services/storage/storage.factory';
import { ApiError } from '@/utils/ApiError';
import { eventBus, EVENTS } from '@/events/eventBus';

interface PdfData {
  credentialGroupName: string;
  credentialType: string;
  certificateTitle: string;
  learnerName: string;
  completedRequirements: Array<{
    courseTitle: string;
    finalScore: number | null;
    completedAt: Date;
  }>;
  issuedAt: Date;
  expiresAt: Date | null;
  verificationCode: string;
  verificationUrl: string;
}

/**
 * Certificate PDF Generation Service
 *
 * Generates and caches certificate PDF documents with learner info,
 * course details, grades, and verification QR codes.
 */
export class CertificatePdfService {
  /**
   * Get or generate a PDF for a certificate issuance.
   * Returns cached PDF URL if available, otherwise generates a new one.
   */
  static async getOrGeneratePdf(
    issuanceId: string,
    _userId: string
  ): Promise<{ pdfUrl: string }> {
    if (!mongoose.Types.ObjectId.isValid(issuanceId)) {
      throw ApiError.badRequest('Invalid issuance ID format');
    }

    const issuance = await CertificateIssuance.findById(issuanceId)
      .populate('certificateDefinitionId', 'title')
      .populate('credentialGroupId', 'name type')
      .populate('learnerId', 'firstName lastName')
      .lean();

    if (!issuance) {
      throw ApiError.notFound('Certificate issuance not found');
    }

    if (issuance.revokedAt) {
      throw ApiError.badRequest('Certificate has been revoked');
    }

    // Check cached PDF
    const storageKey = CertificatePdfService.buildStorageKey(
      issuanceId,
      issuance.verificationCode
    );
    const storage = getStorageProvider();

    if (issuance.pdfUrl) {
      const exists = await storage.objectExists(storageKey);
      if (exists) {
        return { pdfUrl: issuance.pdfUrl };
      }
    }

    // Build data for PDF generation
    const credentialGroup = issuance.credentialGroupId as any;
    const definition = issuance.certificateDefinitionId as any;
    const learner = issuance.learnerId as any;

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const verificationUrl = `${appUrl}/certificates/verify/${issuance.verificationCode}`;

    const pdfData: PdfData = {
      credentialGroupName: credentialGroup.name,
      credentialType: credentialGroup.type,
      certificateTitle: definition.title,
      learnerName: `${learner.firstName} ${learner.lastName}`,
      completedRequirements: issuance.completedRequirements.map((r: any) => ({
        courseTitle: r.courseTitle,
        finalScore: r.finalScore,
        completedAt: r.completedAt
      })),
      issuedAt: issuance.issuedAt,
      expiresAt: issuance.expiresAt,
      verificationCode: issuance.verificationCode,
      verificationUrl
    };

    const pdfBuffer = await CertificatePdfService.generatePdfBuffer(pdfData);
    const pdfUrl = await storage.putObject(storageKey, pdfBuffer, 'application/pdf');

    // Cache the URL on the issuance document
    await CertificateIssuance.findByIdAndUpdate(issuanceId, { pdfUrl });

    return { pdfUrl };
  }

  /**
   * Generate a PDF buffer from certificate data using PDFKit.
   * Creates a landscape A4 certificate layout.
   */
  static async generatePdfBuffer(data: PdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 60, right: 60 }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = 841.89; // A4 landscape width in points
      const contentWidth = pageWidth - 120; // minus margins

      // Border
      doc.rect(20, 20, pageWidth - 40, 555.28).lineWidth(2).stroke('#1a365d');
      doc.rect(25, 25, pageWidth - 50, 545.28).lineWidth(0.5).stroke('#4a90d9');

      // Header: credential type + group name
      const typeLabel = data.credentialType.charAt(0).toUpperCase() + data.credentialType.slice(1);
      doc.fontSize(12).fillColor('#666666').text(typeLabel.toUpperCase(), 60, 50, {
        align: 'center',
        width: contentWidth
      });

      doc.fontSize(10).fillColor('#999999').text(data.credentialGroupName, 60, 68, {
        align: 'center',
        width: contentWidth
      });

      // Certificate title
      doc.moveDown(0.5);
      doc.fontSize(28).fillColor('#1a365d').text(data.certificateTitle, 60, 95, {
        align: 'center',
        width: contentWidth
      });

      // Divider line
      doc.moveTo(200, 140).lineTo(pageWidth - 200, 140).lineWidth(1).stroke('#4a90d9');

      // "Awarded to"
      doc.fontSize(12).fillColor('#666666').text('Awarded to', 60, 155, {
        align: 'center',
        width: contentWidth
      });

      // Learner name
      doc.fontSize(24).fillColor('#1a365d').text(data.learnerName, 60, 175, {
        align: 'center',
        width: contentWidth
      });

      // Completed courses section
      let yPos = 215;
      if (data.completedRequirements.length > 0) {
        doc.fontSize(10).fillColor('#666666').text('Completed Courses:', 60, yPos, {
          align: 'center',
          width: contentWidth
        });
        yPos += 18;

        for (const req of data.completedRequirements) {
          const scoreText = req.finalScore !== null ? ` — Score: ${req.finalScore}%` : '';
          doc.fontSize(9).fillColor('#333333').text(
            `${req.courseTitle}${scoreText}`,
            60,
            yPos,
            { align: 'center', width: contentWidth }
          );
          yPos += 14;
        }
      }

      // Dates section
      yPos += 10;
      const issuedDate = new Date(data.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.fontSize(10).fillColor('#666666').text(`Issued: ${issuedDate}`, 60, yPos, {
        align: 'center',
        width: contentWidth
      });

      if (data.expiresAt) {
        yPos += 16;
        const expiresDate = new Date(data.expiresAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.fontSize(10).fillColor('#666666').text(`Valid Until: ${expiresDate}`, 60, yPos, {
          align: 'center',
          width: contentWidth
        });
      }

      // Bottom section: verification code + QR code
      const bottomY = 480;
      doc.fontSize(8).fillColor('#999999').text(
        `Verification Code: ${data.verificationCode}`,
        60,
        bottomY,
        { align: 'center', width: contentWidth }
      );

      doc.fontSize(7).fillColor('#aaaaaa').text(
        `Verify at: ${data.verificationUrl}`,
        60,
        bottomY + 12,
        { align: 'center', width: contentWidth }
      );

      // Generate QR code and add to PDF
      CertificatePdfService.generateQrCode(data.verificationUrl)
        .then((qrBuffer) => {
          doc.image(qrBuffer, pageWidth / 2 - 30, bottomY + 28, {
            width: 60,
            height: 60
          });
          doc.end();
        })
        .catch(() => {
          // If QR generation fails, still produce the PDF without it
          doc.end();
        });
    });
  }

  /**
   * Generate a QR code PNG buffer for a verification URL.
   */
  static async generateQrCode(verificationUrl: string): Promise<Buffer> {
    return QRCode.toBuffer(verificationUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#1a365d', light: '#ffffff' }
    });
  }

  /**
   * Build the storage key for a certificate PDF.
   */
  static buildStorageKey(issuanceId: string, verificationCode: string): string {
    return `certificates/pdfs/${issuanceId}/certificate-${verificationCode}.pdf`;
  }

  /**
   * Invalidate cached PDF for an issuance (e.g., after revocation or upgrade).
   */
  static async invalidatePdfCache(issuanceId: string): Promise<void> {
    const issuance = await CertificateIssuance.findById(issuanceId).lean();
    if (!issuance) return;

    const storageKey = CertificatePdfService.buildStorageKey(
      issuanceId,
      issuance.verificationCode
    );

    const storage = getStorageProvider();
    try {
      await storage.deleteObject(storageKey);
    } catch {
      // Ignore deletion errors (file may not exist)
    }

    await CertificateIssuance.findByIdAndUpdate(issuanceId, { pdfUrl: null });
  }
}

// Event listeners for cache invalidation
eventBus.on(EVENTS.CERTIFICATE_REVOKED, async (payload: { issuanceId: string }) => {
  await CertificatePdfService.invalidatePdfCache(payload.issuanceId);
});

eventBus.on(EVENTS.CERTIFICATE_UPGRADED, async (payload: { previousIssuanceId: string }) => {
  await CertificatePdfService.invalidatePdfCache(payload.previousIssuanceId);
});
