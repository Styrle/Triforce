import { ZoneCalculator } from '../../src/services/zones/calculator';

describe('ZoneCalculator', () => {
  let calculator: ZoneCalculator;

  beforeEach(() => {
    calculator = new ZoneCalculator();
  });

  describe('calculateHRZones', () => {
    it('should calculate 7 HR zones from LTHR', () => {
      const lthr = 165;
      const zones = calculator.calculateHRZones(lthr);

      expect(zones).toHaveLength(7);
      expect(zones[0].name).toBe('Recovery');
      expect(zones[6].name).toBe('Anaerobic');
    });

    it('should calculate correct zone boundaries', () => {
      const lthr = 170;
      const zones = calculator.calculateHRZones(lthr);

      // Zone 1 max should be 81% of LTHR
      expect(zones[0].max).toBe(Math.round(170 * 0.81)); // 138

      // Zone 2 max should be 89% of LTHR
      expect(zones[1].max).toBe(Math.round(170 * 0.89)); // 151

      // Zone 4 max should be 99% of LTHR
      expect(zones[3].max).toBe(Math.round(170 * 0.99)); // 168
    });

    it('should throw error for invalid LTHR', () => {
      expect(() => calculator.calculateHRZones(0)).toThrow('LTHR must be a positive number');
      expect(() => calculator.calculateHRZones(-100)).toThrow('LTHR must be a positive number');
    });
  });

  describe('calculatePowerZones', () => {
    it('should calculate 7 power zones from FTP', () => {
      const ftp = 250;
      const zones = calculator.calculatePowerZones(ftp);

      expect(zones).toHaveLength(7);
      expect(zones[0].name).toBe('Active Recovery');
      expect(zones[3].name).toBe('Threshold');
      expect(zones[6].name).toBe('Neuromuscular');
    });

    it('should calculate correct zone boundaries', () => {
      const ftp = 250;
      const zones = calculator.calculatePowerZones(ftp);

      // Zone 1 max should be 55% of FTP
      expect(zones[0].max).toBe(Math.round(250 * 0.55)); // 138

      // Zone 4 max should be 105% of FTP (this is the threshold zone)
      expect(zones[3].max).toBe(Math.round(250 * 1.05)); // 263

      // Zone 5 max should be 120% of FTP
      expect(zones[4].max).toBe(Math.round(250 * 1.20)); // 300
    });

    it('should throw error for invalid FTP', () => {
      expect(() => calculator.calculatePowerZones(0)).toThrow('FTP must be a positive number');
    });
  });

  describe('calculatePaceZones', () => {
    it('should calculate 6 pace zones from threshold pace', () => {
      const thresholdPace = 4.5; // m/s (~3:42/km)
      const zones = calculator.calculatePaceZones(thresholdPace);

      expect(zones).toHaveLength(6);
      expect(zones[0].name).toBe('Recovery');
      expect(zones[3].name).toBe('Threshold');
      expect(zones[5].name).toBe('Anaerobic');
    });

    it('should throw error for invalid threshold pace', () => {
      expect(() => calculator.calculatePaceZones(0)).toThrow('Threshold pace must be a positive number');
    });
  });

  describe('calculateSwimZones', () => {
    it('should calculate 5 swim zones from CSS', () => {
      const css = 1.2; // m/s (100m in ~83 seconds = 1:23/100m)
      const zones = calculator.calculateSwimZones(css);

      expect(zones).toHaveLength(5);
      expect(zones[0].name).toBe('Recovery');
      expect(zones[3].name).toBe('Threshold');
      expect(zones[4].name).toBe('VO2max');
    });

    it('should throw error for invalid CSS', () => {
      expect(() => calculator.calculateSwimZones(0)).toThrow('CSS must be a positive number');
    });
  });

  describe('calculateTimeInZones', () => {
    it('should calculate time in each zone', () => {
      const records = [
        { heartRate: 120, power: null, speed: null },
        { heartRate: 130, power: null, speed: null },
        { heartRate: 140, power: null, speed: null },
        { heartRate: 150, power: null, speed: null },
        { heartRate: 160, power: null, speed: null },
      ];

      const zones = calculator.calculateHRZones(170);
      const timeInZones = calculator.calculateTimeInZones(records, zones, 'heartRate');

      expect(timeInZones).toHaveLength(7);
      expect(timeInZones.reduce((sum, z) => sum + z.seconds, 0)).toBe(5);
    });

    it('should handle empty records', () => {
      const zones = calculator.calculateHRZones(170);
      const timeInZones = calculator.calculateTimeInZones([], zones, 'heartRate');

      expect(timeInZones).toHaveLength(7);
      timeInZones.forEach(zone => {
        expect(zone.seconds).toBe(0);
        expect(zone.percentage).toBe(0);
      });
    });

    it('should calculate percentages correctly', () => {
      const records = Array(100).fill(null).map(() => ({
        heartRate: 150,
        power: null,
        speed: null,
      }));

      const zones = calculator.calculateHRZones(170);
      const timeInZones = calculator.calculateTimeInZones(records, zones, 'heartRate');

      const totalPercentage = timeInZones.reduce((sum, z) => sum + z.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });
  });
});
