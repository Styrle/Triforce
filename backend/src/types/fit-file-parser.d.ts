declare module 'fit-file-parser' {
  interface FitParserOptions {
    force?: boolean;
    speedUnit?: 'km/h' | 'm/s' | 'mph';
    lengthUnit?: 'm' | 'km' | 'mi';
    temperatureUnit?: 'celsius' | 'fahrenheit' | 'kelvin';
    elapsedRecordField?: boolean;
    mode?: 'cascade' | 'list' | 'both';
  }

  interface FitRecord {
    timestamp?: Date;
    elapsed_time?: number;
    heart_rate?: number;
    power?: number;
    cadence?: number;
    speed?: number;
    altitude?: number;
    position_lat?: number;
    position_long?: number;
    temperature?: number;
    stance_time?: number;
    vertical_oscillation?: number;
    step_length?: number;
    distance?: number;
    [key: string]: any;
  }

  interface FitLap {
    start_time?: Date;
    timestamp?: Date;
    total_elapsed_time?: number;
    total_timer_time?: number;
    total_distance?: number;
    avg_heart_rate?: number;
    max_heart_rate?: number;
    avg_power?: number;
    max_power?: number;
    avg_speed?: number;
    max_speed?: number;
    avg_cadence?: number;
    [key: string]: any;
  }

  interface FitSession {
    sport?: string;
    sub_sport?: string;
    start_time?: Date;
    timestamp?: Date;
    total_elapsed_time?: number;
    total_timer_time?: number;
    total_distance?: number;
    total_ascent?: number;
    total_descent?: number;
    avg_heart_rate?: number;
    max_heart_rate?: number;
    avg_power?: number;
    max_power?: number;
    normalized_power?: number;
    avg_speed?: number;
    max_speed?: number;
    avg_cadence?: number;
    training_stress_score?: number;
    intensity_factor?: number;
    [key: string]: any;
  }

  interface FitActivity {
    sessions?: FitSession[];
    laps?: FitLap[];
    records?: FitRecord[];
    events?: any[];
    hrv?: any[];
    [key: string]: any;
  }

  interface ParsedFitData {
    activity?: FitActivity;
    sessions?: FitSession[];
    laps?: FitLap[];
    records?: FitRecord[];
    [key: string]: any;
  }

  class FitParser {
    constructor(options?: FitParserOptions);
    parse(content: Buffer, callback: (error: Error | null, data: ParsedFitData) => void): void;
  }

  export default FitParser;
}
