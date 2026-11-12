// Every number the simulation uses lives here, tagged with where it came from.
//   kind 'cited'      -> value copied from the source named by source_id (content/sources.json)
//   kind 'simplified' -> a teaching value chosen for gameplay; shown to players as "simplified"
// The UI renders this table as the "How the model works" card, so nothing is hidden.

export type ConstKind = 'cited' | 'simplified';
export interface Constant {
  readonly value: number;
  readonly unit: string;
  readonly kind: ConstKind;
  readonly source_id: string;
  readonly note: string;
}

const c = (value: number, unit: string, kind: ConstKind, source_id: string, note: string): Constant => ({ value, unit, kind, source_id, note });

export const K = {
  // --- Physics and astronomy (cited) ---
  SOLAR_IRRADIANCE_1AU: c(1361.0, 'W/m^2', 'cited', 'nssdc-earth-fact', 'Solar irradiance at Earth (1 au)'),
  MARS_SOLAR_IRRADIANCE_MEAN: c(586.2, 'W/m^2', 'cited', 'nssdc-mars-fact', 'Mean solar irradiance at Mars (used as a test check)'),
  MARS_OBLIQUITY_DEG: c(25.19, 'deg', 'cited', 'nssdc-mars-fact', 'Mars axial tilt'),
  MARS_SOL_EARTH_DAYS: c(1.0274912517, 'day', 'cited', 'giss-mars24', 'Length of a Mars solar day in Earth days (Mars24 step C-2)'),
  MARS_SOL_HOURS: c(24.6597, 'h', 'cited', 'nssdc-mars-fact', 'Length of a Mars day in hours'),
  SPEED_OF_LIGHT_KM_S: c(299792.458, 'km/s', 'cited', 'jpl-astro-par', 'Speed of light in vacuum'),
  AU_KM: c(149597870.7, 'km', 'cited', 'jpl-astro-par', 'Astronomical unit (IAU 2012)'),
  TT_MINUS_UTC_S: c(69.184, 's', 'cited', 'giss-mars24', 'TT minus UTC since 2017-01-01 (Mars24 step A-4)'),

  // --- Crew needs (cited) ---
  O2_PER_CREW_KG_DAY: c(0.895, 'kg/crew/day', 'cited', 'bvad-2022', 'Oxygen consumed per crew member per day'),
  FOOD_PER_CREW_KG_DAY: c(0.8, 'kg/crew/day', 'cited', 'bvad-2022', 'Food solids eaten per crew member per day (dry, no packaging)'),
  MOXIE_BEST_G_PER_HOUR: c(12, 'g/h', 'cited', 'nasa-moxie-2023', 'Best oxygen rate of MOXIE on Perseverance'),

  // --- Radiation (cited anchors) ---
  MARS_SURFACE_DOSE_MSV_DAY: c(0.67, 'mSv/day', 'cited', 'nasa-rad-2013', 'Average dose on the surface at Gale Crater, Aug 2012 to Jun 2013'),
  RECORD_STORM_DOSE_MGY: c(8.1, 'mGy', 'cited', 'nasa-may2024-storm', 'Biggest solar-storm dose Curiosity RAD measured (May 2024)'),
  CHEST_XRAY_MSV: c(0.02, 'mSv', 'cited', 'nasa-rad-2013', 'Typical chest X-ray dose, for comparison'),
  CAREER_LIMIT_MSV: c(600, 'mSv', 'cited', 'ntrs-career-limit', 'NASA career radiation limit for astronauts'),

  // --- Outpost engineering (simplified teaching values) ---
  CREW: c(4, 'people', 'simplified', 'model-card', 'Crew size'),
  MISSION_SOLS: c(30, 'sol', 'simplified', 'model-card', 'Mission length'),
  CAREERS_PER_LIMIT: c(20, 'missions', 'simplified', 'model-card', 'The 600 mSv career limit is shared across 20 missions, so one mission may use 30 mSv'),
  ARRAY_AREA_M2: c(75, 'm^2', 'simplified', 'model-card', 'Solar panel area'),
  ARRAY_EFFICIENCY: c(0.22, '', 'simplified', 'model-card', 'Solar panel efficiency'),
  DUST_EXTINCTION: c(0.4, '1/tau', 'simplified', 'model-card', 'Sunlight lost per unit of dust opacity: transmission = exp(-0.4 * tau)'),
  BATTERY_KWH_MAX: c(80, 'kWh', 'simplified', 'model-card', 'Battery size'),
  BATTERY_KWH_START: c(50, 'kWh', 'simplified', 'model-card', 'Battery charge at landing'),
  HAB_HEAT_LOSS_KW_PER_K: c(0.008, 'kW/K', 'simplified', 'model-card', 'How fast the habitat loses heat per degree of outside cold'),
  HAB_INSIDE_C: c(20, 'C', 'simplified', 'model-card', 'Habitat inside temperature'),
  O2_KWH_PER_KG: c(4, 'kWh/kg', 'simplified', 'model-card', 'Energy to make 1 kg of oxygen in the game air plant'),
  O2_TANK_START_KG: c(18, 'kg', 'simplified', 'model-card', 'Oxygen in the tank at landing (about 5 days)'),
  O2_TANK_MAX_KG: c(40, 'kg', 'simplified', 'model-card', 'Oxygen tank size'),
  FOOD_START_KG: c(55, 'kg', 'simplified', 'model-card', 'Food packed for landing (about 17 days)'),
  GREENHOUSE_KWH: c(12, 'kWh/sol', 'simplified', 'model-card', 'Greenhouse lights and heat'),
  GREENHOUSE_KG_PER_SOL: c(2.6, 'kg/sol', 'simplified', 'model-card', 'Food grown per sol with lights on and crew tending'),
  RADIO_KWH: c(4, 'kWh/sol', 'simplified', 'model-card', 'Radio link to Earth'),
  EVA_KWH: c(6, 'kWh/sol', 'simplified', 'model-card', 'Rover and suit charging for a science walk'),
  LAB_KWH: c(3, 'kWh/sol', 'simplified', 'model-card', 'Lab instruments'),
  SHELTER_KWH: c(2, 'kWh/sol', 'simplified', 'model-card', 'Fans and lights in the storm shelter'),
  EVA_SCIENCE: c(3, 'points', 'simplified', 'model-card', 'Science from a walk outside'),
  LAB_SCIENCE: c(1, 'points', 'simplified', 'model-card', 'Science from lab work'),
  SCIENCE_GOAL: c(45, 'points', 'simplified', 'model-card', 'Science sent to Earth for full marks'),
  HAB_GCR_FACTOR: c(0.8, '', 'simplified', 'model-card', 'Share of the surface dose that reaches you inside the habitat'),
  SHELTER_FACTOR: c(0.25, '', 'simplified', 'model-card', 'Share of storm dose that reaches you in the water-walled shelter'),
  EVA_STORM_FACTOR: c(1.5, '', 'simplified', 'model-card', 'Being outside during a storm: extra exposure'),
  STORM_MINOR_MSV: c(0.5, 'mSv', 'simplified', 'model-card', 'Extra dose from a glancing CME (forecast "glancing blow")'),
  STORM_MODERATE_MSV: c(1.5, 'mSv', 'simplified', 'model-card', 'Extra dose from a direct CME slower than 1000 km/s'),
  STORM_STRONG_MSV: c(4.0, 'mSv', 'simplified', 'model-card', 'Extra dose from a direct CME at 1000 km/s or faster (half the May 2024 record)'),
  STRONG_CME_KM_S: c(1000, 'km/s', 'simplified', 'model-card', 'Speed above which a direct CME counts as strong'),
  SLOPE_LIMIT_DEG: c(15, 'deg', 'simplified', 'model-card', 'Steepest ground the lander may touch down on (measured over 463 m pixels)'),
} as const;

export type ConstantKey = keyof typeof K;
export const v = (k: ConstantKey): number => K[k].value;
export const MISSION_DOSE_BUDGET_MSV = (): number => v('CAREER_LIMIT_MSV') / v('CAREERS_PER_LIMIT');
