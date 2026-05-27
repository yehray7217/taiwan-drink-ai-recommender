export type UserPreference = {
  budget: string;
  sweetness: string;
  caffeineLimit: string;
  avoidMilk: boolean;
  allergen: string;
  deliveryTime: string;
  note: string;
};

export type RecommendationResult = {
  bestRecommendation: {
    brand: string;
    name: string;
    price: number;
    customOrder: string;
    reason: string;
  };

  alternatives: {
    brand: string;
    name: string;
    customOrder: string;
  }[];

  rejectedReasons: string[];

  agentSummary: {
    agent1: string;
    agent2: string;
    agent3: string;
  };
};