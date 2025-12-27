import { DurationCurveService, STANDARD_DURATIONS } from '../../src/services/analytics/durationCurveService';

describe('DurationCurveService', () => {
  let service: DurationCurveService;

  beforeEach(() => {
    service = new DurationCurveService();
  });

  describe('calculatePeakForDuration', () => {
    it('should find the best average for a given duration', () => {
      // Simulated power data with a 5-second peak around index 10
      const data = [
        200, 210, 220, 230, 240, 250, 260, 270, 280, 290,
        400, 410, 420, 430, 440, // Peak 5s = (400+410+420+430+440)/5 = 420
        300, 290, 280, 270, 260,
      ];

      const peak5s = service.calculatePeakForDuration(data, 5);
      expect(peak5s).toBeCloseTo(420, 0);
    });

    it('should return 0 for insufficient data', () => {
      const data = [200, 210, 220]; // Only 3 data points
      const peak5s = service.calculatePeakForDuration(data, 5); // Need 5 points

      expect(peak5s).toBe(0);
    });

    it('should handle single value for 1-second duration', () => {
      const data = [250, 300, 350, 280, 260];
      const peak1s = service.calculatePeakForDuration(data, 1);

      expect(peak1s).toBe(350); // Max value
    });

    it('should return 0 for empty array', () => {
      expect(service.calculatePeakForDuration([], 5)).toBe(0);
    });

    it('should return 0 for zero duration', () => {
      expect(service.calculatePeakForDuration([100, 200, 300], 0)).toBe(0);
    });
  });

  describe('determinePhenotype', () => {
    it('should identify sprinter phenotype', () => {
      const points = [
        { duration: 5, label: '5s', value: 1200 },     // Very high 5s power
        { duration: 60, label: '1min', value: 600 },
        { duration: 300, label: '5min', value: 380 },   // 5s/5min ratio = 3.16
        { duration: 1200, label: '20min', value: 300 }, // 20min/5min ratio = 0.79
      ];

      const result = service.determinePhenotype(points);
      expect(result.phenotype).toBe('sprinter');
      expect(result.strengths).toContain('Sprint finishes');
    });

    it('should identify time trialist phenotype', () => {
      // Time trialist: low sprint ratio (<1.78), high sustained ratio (>0.88)
      const points = [
        { duration: 5, label: '5s', value: 550 },       // Low sprint power
        { duration: 60, label: '1min', value: 420 },
        { duration: 300, label: '5min', value: 350 },   // 5s/5min ratio = 1.57 (low)
        { duration: 1200, label: '20min', value: 320 }, // 20min/5min ratio = 0.91 (high)
      ];

      const result = service.determinePhenotype(points);
      expect(result.phenotype).toBe('time_trialist');
      expect(result.strengths).toContain('Time trials');
    });

    it('should return all_rounder for insufficient data', () => {
      const points = [
        { duration: 5, label: '5s', value: 800 },
        { duration: 60, label: '1min', value: 500 },
      ];

      const result = service.determinePhenotype(points);
      expect(result.phenotype).toBe('all_rounder');
      expect(result.description).toContain('Not enough data');
    });
  });

  describe('estimateFTPFromCurve', () => {
    it('should estimate FTP as 95% of 20-min power', () => {
      const points = [
        { duration: 300, label: '5min', value: 350 },
        { duration: 1200, label: '20min', value: 300 },
      ];

      const ftp = service.estimateFTPFromCurve(points);
      expect(ftp).toBe(Math.round(300 * 0.95)); // 285
    });

    it('should fall back to 85% of 5-min power if 20-min not available', () => {
      const points = [
        { duration: 300, label: '5min', value: 350 },
      ];

      const ftp = service.estimateFTPFromCurve(points);
      expect(ftp).toBe(Math.round(350 * 0.85)); // 298
    });

    it('should return 0 for empty points', () => {
      expect(service.estimateFTPFromCurve([])).toBe(0);
    });
  });

  describe('STANDARD_DURATIONS', () => {
    it('should include standard duration values', () => {
      expect(STANDARD_DURATIONS).toContain(5);
      expect(STANDARD_DURATIONS).toContain(60);
      expect(STANDARD_DURATIONS).toContain(300);
      expect(STANDARD_DURATIONS).toContain(1200);
      expect(STANDARD_DURATIONS).toContain(3600);
    });
  });
});
