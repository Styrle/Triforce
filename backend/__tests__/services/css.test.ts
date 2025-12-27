import { CSSService } from '../../src/services/analytics/cssService';

describe('CSSService', () => {
  let service: CSSService;

  beforeEach(() => {
    service = new CSSService();
  });

  describe('formatPace', () => {
    it('should format seconds to mm:ss', () => {
      expect(service.formatPace(105)).toBe('1:45');
      expect(service.formatPace(90)).toBe('1:30');
      expect(service.formatPace(120)).toBe('2:00');
      expect(service.formatPace(65)).toBe('1:05');
    });

    it('should handle sub-minute paces', () => {
      expect(service.formatPace(45)).toBe('0:45');
      expect(service.formatPace(30)).toBe('0:30');
    });
  });

  describe('parsePace', () => {
    it('should parse mm:ss to seconds', () => {
      expect(service.parsePace('1:45')).toBe(105);
      expect(service.parsePace('1:30')).toBe(90);
      expect(service.parsePace('2:00')).toBe(120);
    });

    it('should return 0 for invalid format', () => {
      expect(service.parsePace('invalid')).toBe(0);
      expect(service.parsePace('1')).toBe(0);
    });
  });

  describe('calculateCSS', () => {
    it('should calculate CSS correctly', () => {
      // CSS = (D2 - D1) / (T2 - T1)
      // CSS = (400 - 200) / (360 - 150) = 200 / 210 = 0.952 m/s
      const t400 = 360; // 6:00
      const t200 = 150; // 2:30

      const result = service.calculateCSS(t400, t200);

      expect(result.css).toBeCloseTo(0.952, 2);
      // Pace per 100m = 100 / 0.952 = 105 seconds = 1:45
      expect(result.cssPace100m).toBeCloseTo(105, 0);
      expect(result.cssPaceFormatted).toBe('1:45');
    });

    it('should throw error if t400 <= t200', () => {
      expect(() => service.calculateCSS(150, 200)).toThrow('400m time must be greater than 200m time');
      expect(() => service.calculateCSS(200, 200)).toThrow('400m time must be greater than 200m time');
    });

    it('should throw error for non-positive times', () => {
      expect(() => service.calculateCSS(0, 150)).toThrow('Times must be positive numbers');
      expect(() => service.calculateCSS(360, 0)).toThrow('Times must be positive numbers');
      expect(() => service.calculateCSS(-360, 150)).toThrow('Times must be positive numbers');
    });

    it('should calculate realistic CSS values', () => {
      // Good amateur swimmer: 400m in 5:30 (330s), 200m in 2:30 (150s)
      const result = service.calculateCSS(330, 150);

      // CSS = 200 / 180 = 1.11 m/s
      expect(result.css).toBeCloseTo(1.11, 1);
      // Pace = 100 / 1.11 = 90 seconds = 1:30/100m
      expect(result.cssPace100m).toBeCloseTo(90, 0);
    });
  });

  describe('calculateSwimZones', () => {
    it('should calculate 5 swim zones from CSS pace', () => {
      const cssPace100m = 90; // 1:30/100m
      const zones = service.calculateSwimZones(cssPace100m);

      expect(zones).toHaveLength(5);
      expect(zones[0].name).toBe('Recovery');
      expect(zones[3].name).toBe('Threshold');
      expect(zones[4].name).toBe('VO2max');
    });

    it('should include formatted paces in zones', () => {
      const cssPace100m = 100; // seconds per 100m
      const zones = service.calculateSwimZones(cssPace100m);

      zones.forEach(zone => {
        expect(zone.paceMin).toMatch(/^\d+:\d{2}$/);
        expect(zone.paceMax).toMatch(/^\d+:\d{2}$/);
      });
    });

    it('should throw error for invalid pace', () => {
      expect(() => service.calculateSwimZones(0)).toThrow('CSS pace must be a positive number');
      expect(() => service.calculateSwimZones(-100)).toThrow('CSS pace must be a positive number');
    });
  });

  describe('getTrainingPaces', () => {
    it('should return all training pace categories', () => {
      const css = 1.1; // m/s
      const paces = service.getTrainingPaces(css);

      expect(paces).toHaveProperty('recovery');
      expect(paces).toHaveProperty('endurance');
      expect(paces).toHaveProperty('tempo');
      expect(paces).toHaveProperty('threshold');
      expect(paces).toHaveProperty('interval');
      expect(paces).toHaveProperty('sprint');
    });

    it('should have threshold pace equal to CSS', () => {
      const css = 1.1;
      const paces = service.getTrainingPaces(css);

      expect(paces.threshold.speed).toBeCloseTo(css, 2);
    });

    it('should have recovery slower than threshold', () => {
      const css = 1.1;
      const paces = service.getTrainingPaces(css);

      expect(paces.recovery.speed).toBeLessThan(paces.threshold.speed);
    });

    it('should have sprint faster than threshold', () => {
      const css = 1.1;
      const paces = service.getTrainingPaces(css);

      expect(paces.sprint.speed).toBeGreaterThan(paces.threshold.speed);
    });
  });

  describe('predictRaceTimes', () => {
    it('should return predictions for all race distances', () => {
      const css = 1.1; // m/s
      const predictions = service.predictRaceTimes(css);

      expect(predictions).toHaveProperty('t400');
      expect(predictions).toHaveProperty('t750');
      expect(predictions).toHaveProperty('t1500');
      expect(predictions).toHaveProperty('t1900');
      expect(predictions).toHaveProperty('t3800');
    });

    it('should have shorter times for shorter distances', () => {
      const css = 1.1;
      const predictions = service.predictRaceTimes(css);

      expect(predictions.t400.time).toBeLessThan(predictions.t750.time);
      expect(predictions.t750.time).toBeLessThan(predictions.t1500.time);
      expect(predictions.t1500.time).toBeLessThan(predictions.t1900.time);
      expect(predictions.t1900.time).toBeLessThan(predictions.t3800.time);
    });

    it('should format times correctly', () => {
      const css = 1.1;
      const predictions = service.predictRaceTimes(css);

      // Check format mm:ss or h:mm:ss
      expect(predictions.t400.formatted).toMatch(/^\d+:\d{2}(:\d{2})?$/);
      expect(predictions.t3800.formatted).toMatch(/^\d+:\d{2}(:\d{2})?$/);
    });
  });
});
