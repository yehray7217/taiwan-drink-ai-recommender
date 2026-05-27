import type { RecommendationResult } from "./types";

export const mockResult: RecommendationResult = {
  bestRecommendation: {
    brand: "五十嵐",
    name: "四季春青茶",
    price: 35,
    customOrder: "微糖、少冰",
    reason: "低咖啡因、價格符合、適合晚上喝",
  },
  alternatives: [
    {
      brand: "可不可熟成紅茶",
      name: "春芽冷露",
      customOrder: "微糖、少冰",
    },
  ],
  rejectedReasons: [
    "珍珠奶茶：含奶且糖分偏高",
    "紅茶拿鐵：晚上咖啡因較高",
  ],
  agentSummary: {
    agent1: "推薦清爽茶飲。",
    agent2: "排除奶類與高糖飲料。",
    agent3: "最終選擇四季春青茶。",
  },
};