import type { RecommendationResult } from "./types";

export const mockResult: RecommendationResult = {
  bestChoice: {
    brand: "五十嵐",
    name: "四季春青茶",
    price: 35,
    customOrder: "微糖、少冰、不加料",
    reason: "符合低咖啡因、低甜度與預算限制，適合晚上想喝清爽飲品的情境。",
  },
  alternatives: [
    {
      brand: "可不可熟成紅茶",
      name: "春芽冷露",
      price: 40,
      customOrder: "微糖、少冰",
      reason: "口感清爽，甜度可調整，也符合預算。",
    },
  ],
  criticNotes: [
    "已確認推薦飲品未超出預算。",
    "已排除含奶或高糖負擔較重的飲品。",
  ],
  notRecommended: [
    {
      name: "珍珠奶茶",
      reason: "含奶且糖分較高，不符合目前需求。",
    },
    {
      name: "紅茶拿鐵",
      reason: "含奶且晚上飲用可能較有負擔。",
    },
  ],
  agentTrace: {
    recommenderSummary: "推薦者優先選擇清爽、低負擔的茶類飲品。",
    criticSummary: "質疑者檢查預算、奶類、甜度與咖啡因限制。",
    judgeSummary: "總結者整合後選擇四季春青茶作為最佳推薦。",
  },
};