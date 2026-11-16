export const metrics = {
  household_wealth: "Household wealth",
  health_insurance_coverage: "Health insurance coverage",
  drought_month_share_12m: "Drought month share",
  health_decision_participation: "Health decision participation",
  literacy: "Literacy",
  household_electricity: "Household electricity",
  household_high_quality_water: "High-quality household water",
  household_high_quality_toilet: "High-quality household toilet",
  women_currently_working: "Women currently working",
  modern_contraceptive_use: "Modern contraceptive use",
} as const;

export type Metric = keyof typeof metrics;
export type Delta = `${Metric}_delta`;
export type Region = {
  region_id: string;
  region_name: string;
  country_code: string;
  country_name: string;
  year: number;
} & Partial<Record<Metric | Delta, number | null>>;
