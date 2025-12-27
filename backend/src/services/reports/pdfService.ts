import PDFDocument from 'pdfkit';
import { prisma } from '../../config/database';

interface ReportOptions {
  startDate: Date;
  endDate: Date;
  includeActivities?: boolean;
  includePMC?: boolean;
  includeStrength?: boolean;
  includeNutrition?: boolean;
}

export class PDFReportService {
  /**
   * Generate training report PDF
   */
  async generateTrainingReport(userId: string, options: ReportOptions): Promise<Buffer> {
    const [user, activities, metrics, strengthProfile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      options.includeActivities
        ? prisma.activity.findMany({
            where: {
              userId,
              startDate: { gte: options.startDate, lte: options.endDate },
            },
            orderBy: { startDate: 'desc' },
          })
        : [],
      options.includePMC
        ? prisma.dailyMetrics.findMany({
            where: {
              userId,
              date: { gte: options.startDate, lte: options.endDate },
            },
            orderBy: { date: 'asc' },
          })
        : [],
      options.includeStrength
        ? prisma.strengthProfile.findUnique({
            where: { userId },
            include: {
              lifts: { orderBy: { performedAt: 'desc' }, take: 20 },
            },
          })
        : null,
    ]);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).fillColor('#1e3a5f').text('TriForce Training Report', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .fillColor('#666')
        .text(
          `${this.formatDate(options.startDate)} - ${this.formatDate(options.endDate)}`,
          { align: 'center' }
        );

      if (user?.name) {
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#888').text(`Prepared for: ${user.name}`, { align: 'center' });
      }

      doc.moveDown(2);

      // Training Summary
      if (activities.length > 0) {
        this.addSectionHeader(doc, 'Training Summary');

        const totalDuration = activities.reduce((sum, a) => sum + a.movingTime, 0);
        const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
        const totalTSS = activities.reduce((sum, a) => sum + (a.tss || 0), 0);

        doc
          .fontSize(11)
          .fillColor('#333')
          .text(`Total Activities: ${activities.length}`)
          .text(`Total Duration: ${this.formatDuration(totalDuration)}`)
          .text(`Total Distance: ${(totalDistance / 1000).toFixed(1)} km`)
          .text(`Total TSS: ${Math.round(totalTSS)}`);

        doc.moveDown();

        // By sport breakdown
        const bySport: Record<string, { count: number; duration: number; tss: number; distance: number }> = {};
        for (const activity of activities) {
          if (!bySport[activity.sportType]) {
            bySport[activity.sportType] = { count: 0, duration: 0, tss: 0, distance: 0 };
          }
          bySport[activity.sportType].count++;
          bySport[activity.sportType].duration += activity.movingTime;
          bySport[activity.sportType].tss += activity.tss || 0;
          bySport[activity.sportType].distance += activity.distance || 0;
        }

        doc.fontSize(12).fillColor('#1e3a5f').text('By Sport:', { underline: true });
        doc.moveDown(0.3);

        for (const [sport, data] of Object.entries(bySport)) {
          doc
            .fontSize(10)
            .fillColor('#333')
            .text(
              `  ${this.formatSportName(sport)}: ${data.count} activities, ${this.formatDuration(data.duration)}, ` +
                `${(data.distance / 1000).toFixed(1)}km, TSS ${Math.round(data.tss)}`
            );
        }
        doc.moveDown();
      }

      // PMC Summary
      if (metrics.length > 0) {
        this.addSectionHeader(doc, 'Fitness Metrics (PMC)');

        const latest = metrics[metrics.length - 1];
        const earliest = metrics[0];

        doc
          .fontSize(11)
          .fillColor('#333')
          .text(`Current CTL (Fitness): ${Math.round(latest.ctl || 0)}`)
          .text(`Current ATL (Fatigue): ${Math.round(latest.atl || 0)}`)
          .text(`Current TSB (Form): ${Math.round(latest.tsb || 0)}`);

        if (metrics.length > 1) {
          const ctlChange = (latest.ctl || 0) - (earliest.ctl || 0);
          doc.moveDown(0.5);
          doc
            .fontSize(10)
            .fillColor(ctlChange >= 0 ? '#2e7d32' : '#c62828')
            .text(
              `CTL change over period: ${ctlChange >= 0 ? '+' : ''}${Math.round(ctlChange)} points`
            );
        }

        doc.moveDown();
      }

      // Strength Profile
      if (strengthProfile) {
        this.addSectionHeader(doc, 'Strength Profile');

        doc
          .fontSize(11)
          .fillColor('#333')
          .text(`Strength Score: ${strengthProfile.strengthScore || 'N/A'}`)
          .text(`Classification: ${strengthProfile.classification || 'N/A'}`);

        if (strengthProfile.lifts.length > 0) {
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#666').text('Recent Personal Records:');

          const prs = strengthProfile.lifts.slice(0, 5);
          for (const lift of prs) {
            doc.text(
              `  ${this.formatLiftType(lift.liftType)}: ${lift.weight}kg x ${lift.reps} reps ` +
                `(Est. 1RM: ${Math.round(lift.estimated1RM || 0)}kg)`
            );
          }
        }
        doc.moveDown();
      }

      // Activity Log
      if (options.includeActivities && activities.length > 0) {
        doc.addPage();
        this.addSectionHeader(doc, 'Activity Log');

        const activitiesToShow = activities.slice(0, 30);
        for (const activity of activitiesToShow) {
          doc
            .fontSize(10)
            .fillColor('#1e3a5f')
            .text(`${this.formatDate(activity.startDate)} - ${activity.name}`);
          doc
            .fontSize(9)
            .fillColor('#666')
            .text(
              `  ${this.formatSportName(activity.sportType)} | ${this.formatDuration(activity.movingTime)} | ` +
                `${((activity.distance || 0) / 1000).toFixed(1)}km | TSS: ${Math.round(activity.tss || 0)}`,
              { indent: 20 }
            );
          doc.moveDown(0.3);
        }

        if (activities.length > 30) {
          doc
            .fontSize(9)
            .fillColor('#888')
            .text(`... and ${activities.length - 30} more activities`);
        }
      }

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#aaa')
        .text(`Generated by TriForce on ${new Date().toLocaleDateString()}`, { align: 'center' });

      doc.end();
    });
  }

  /**
   * Generate weekly summary PDF
   */
  async generateWeeklySummary(userId: string, weekStart: Date): Promise<Buffer> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return this.generateTrainingReport(userId, {
      startDate: weekStart,
      endDate: weekEnd,
      includeActivities: true,
      includePMC: true,
      includeStrength: false,
      includeNutrition: false,
    });
  }

  private addSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .fontSize(14)
      .fillColor('#1e3a5f')
      .text(title, { underline: true });
    doc.moveDown(0.5);
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private formatSportName(sport: string): string {
    const names: Record<string, string> = {
      SWIM: 'Swimming',
      BIKE: 'Cycling',
      RUN: 'Running',
      STRENGTH: 'Strength',
      OTHER: 'Other',
    };
    return names[sport] || sport;
  }

  private formatLiftType(liftType: string): string {
    return liftType
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }
}

export const pdfReportService = new PDFReportService();
export default pdfReportService;
