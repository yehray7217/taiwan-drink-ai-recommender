export type CaffeineLevel =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "no_limit";

export type TimeOfDay =
  | "morning"
  | "afternoon"
  | "night";

export type UserPreference = {
  query: string;
  sweetnessMax: string;
  icePreference: string;
  budgetMax: number;
  caffeineLimit: CaffeineLevel;
  allergens: string[];
  avoidIngredients: string[];
  preferredFlavors: string[];
  dislikedFlavors: string[];
  timeOfDay: TimeOfDay;
  brandPreference: string[];
};

export type DrinkChoice = {
  id?: string;
  brand: string;
  name: string;
  customOrder: string;
  price: number;
  reason: string;
};

export type FinalRecommendation = {
  bestChoice: DrinkChoice;
  alternatives: DrinkChoice[];
  criticNotes: string[];
  notRecommended: {
    name: string;
    reason: string;
  }[];
  agentTrace: {
    recommenderSummary: string;
    criticSummary: string;
    judgeSummary: string;
  };
};

export type RecommendationResult = FinalRecommendation;