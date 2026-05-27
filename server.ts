import express from "express";
import cors from "cors";
import drinks from "./data/drinks.json" with { type: "json" };

const app = express();

app.use(cors());
app.use(express.json());

type CaffeineLevel = "none" | "low" | "medium" | "high" | "no_limit";

type UserPreference = {
  query?: string;
  sweetnessMax?: string;
  icePreference?: string;
  budgetMax?: number;
  caffeineLimit?: CaffeineLevel;
  allergens?: string[];
  avoidIngredients?: string[];
  preferredFlavors?: string[];
  dislikedFlavors?: string[];
  timeOfDay?: string;
  brandPreference?: string[];
};

const brandAliases: Record<string, string[]> = {
  "可不可熟成紅茶": ["可不可", "kebuke", "熟成紅茶"],
  "50嵐": ["五十嵐", "50嵐", "50lan", "50"],
  "龜記": ["龜記", "龜記茗品", "guiji"],
  "一沐日": ["一沐日", "yimuri"],
  "迷客夏": ["迷客夏", "milksha"],
  "麻古茶坊": ["麻古", "麻古茶坊", "macu"],
};

const flavorAliases: Record<string, string[]> = {
  清爽: ["清爽", "爽口", "不膩", "淡一點", "輕盈"],
  水果: ["水果", "果香", "果茶", "鮮果", "水果茶"],
  酸甜: ["酸", "酸甜", "檸檬", "百香", "柳丁"],
  茶感: ["茶感", "茶味", "茶香", "純茶"],
  奶香: ["奶香", "奶茶", "鮮奶", "歐蕾", "拿鐵"],
  甜感: ["甜", "甜一點", "古早味", "冬瓜"],
  咀嚼感: ["珍珠", "波霸", "白玉", "蘆薈", "椰果", "料"],
  濃郁: ["濃", "濃郁", "厚", "厚奶", "重口味"],
  蜂蜜: ["蜂蜜", "蜜"],
};

function normalizeText(text = "") {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，,。.!！?？、]/g, "");
}

function caffeineRank(level: string) {
  const rank: Record<string, number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
    no_limit: 99,
  };

  return rank[level] ?? 99;
}

function normalizeSweetness(value?: string) {
  const map: Record<string, string> = {
    normal: "正常糖",
    full: "正常糖",
    less: "少糖",
    half: "半糖",
    low: "微糖",
    micro: "微糖",
    none: "無糖",
    sugar_free: "無糖",
    "0": "無糖",
    "10": "微糖",
    "30": "三分糖",
    "50": "半糖",
    "80": "少糖",
    "100": "正常糖",
  };

  if (!value) return "微糖";
  return map[value] ?? value;
}

function normalizeIce(value?: string) {
  const map: Record<string, string> = {
    normal: "正常冰",
    full: "正常冰",
    less: "少冰",
    low: "微冰",
    micro: "微冰",
    none: "去冰",
    no_ice: "去冰",
    "0": "去冰",
    "30": "微冰",
    "80": "少冰",
    "100": "正常冰",
  };

  if (!value) return "少冰";
  return map[value] ?? value;
}

function includesAny(source: string[] = [], targets: string[] = []) {
  return targets.some((target) =>
    source.some((item) => item.includes(target) || target.includes(item))
  );
}

function queryHasAny(query: string, words: string[]) {
  return words.some((word) => query.includes(word));
}

function brandMatches(inputBrand: string, actualBrand: string) {
  const input = normalizeText(inputBrand);
  const actual = normalizeText(actualBrand);

  if (!input) return false;
  if (actual.includes(input) || input.includes(actual)) return true;

  const aliases = brandAliases[actualBrand] ?? [];

  return aliases.some((alias) => {
    const normalizedAlias = normalizeText(alias);
    return normalizedAlias.includes(input) || input.includes(normalizedAlias);
  });
}

function inferBrandPreferenceFromQuery(query = "") {
  const normalizedQuery = normalizeText(query);
  const result: string[] = [];

  for (const [officialBrand, aliases] of Object.entries(brandAliases)) {
    const normalizedOfficial = normalizeText(officialBrand);

    if (normalizedQuery.includes(normalizedOfficial)) {
      result.push(officialBrand);
      continue;
    }

    const matchedAlias = aliases.some((alias) =>
      normalizedQuery.includes(normalizeText(alias))
    );

    if (matchedAlias) {
      result.push(officialBrand);
    }
  }

  return Array.from(new Set(result));
}

function hasBrandPreference(drink: any, preference: UserPreference) {
  const inputBrands = [
    ...(preference.brandPreference ?? []),
    ...inferBrandPreferenceFromQuery(preference.query ?? ""),
  ];

  return inputBrands.some((brand) => brandMatches(brand, drink.brand));
}

function tagMatches(input: string, tag: string) {
  const normalizedInput = normalizeText(input);
  const normalizedTag = normalizeText(tag);

  if (!normalizedInput) return false;

  if (
    normalizedInput.includes(normalizedTag) ||
    normalizedTag.includes(normalizedInput)
  ) {
    return true;
  }

  const aliases = flavorAliases[tag] ?? [];

  return aliases.some((alias) => {
    const normalizedAlias = normalizeText(alias);
    return (
      normalizedAlias.includes(normalizedInput) ||
      normalizedInput.includes(normalizedAlias)
    );
  });
}

function inferPreferredFlavorsFromQuery(query = "") {
  const normalizedQuery = normalizeText(query);
  const result: string[] = [];

  for (const [tag, aliases] of Object.entries(flavorAliases)) {
    const normalizedTag = normalizeText(tag);

    if (normalizedQuery.includes(normalizedTag)) {
      result.push(tag);
      continue;
    }

    const matchedAlias = aliases.some((alias) =>
      normalizedQuery.includes(normalizeText(alias))
    );

    if (matchedAlias) {
      result.push(tag);
    }
  }

  return Array.from(new Set(result));
}

function userAvoidsMilk(preference: UserPreference) {
  const avoidIngredients = preference.avoidIngredients ?? [];
  const query = normalizeText(preference.query ?? "");

  return (
    preference.allergens?.includes("milk") ||
    avoidIngredients.some(
      (x) =>
        x.includes("奶") ||
        x.includes("牛奶") ||
        x.toLowerCase().includes("milk")
    ) ||
    query.includes("不能喝奶") ||
    query.includes("不要奶") ||
    query.includes("不喝奶") ||
    query.includes("乳糖不耐")
  );
}

function userWantsMilk(preference: UserPreference) {
  const query = normalizeText(preference.query ?? "");

  return (
    query.includes("奶茶") ||
    query.includes("鮮奶") ||
    query.includes("奶香") ||
    query.includes("歐蕾") ||
    query.includes("拿鐵") ||
    query.includes("想喝奶")
  );
}

function getDrinkScore(drink: any, preference: UserPreference) {
  let score = 0;

  const query = preference.query ?? "";
  const flavorTags: string[] = drink.flavorTags ?? [];
  const healthTags: string[] = drink.healthTags ?? [];
  const ingredients: string[] = drink.ingredients ?? [];
  const avoidIngredients = preference.avoidIngredients ?? [];
  const sweetness = normalizeSweetness(preference.sweetnessMax);
  const avoidsMilk = userAvoidsMilk(preference);

  const inferredFlavors = inferPreferredFlavorsFromQuery(query);
  const allPreferredFlavors = Array.from(
    new Set([...(preference.preferredFlavors ?? []), ...inferredFlavors])
  );

  const dislikedFlavors = preference.dislikedFlavors ?? [];

  // 1. 預算
  if (preference.budgetMax && drink.price <= preference.budgetMax) {
    score += 10;
    score += Math.min(8, Math.max(0, preference.budgetMax - drink.price) / 10);
  }

  // 2. 咖啡因：none 硬排在 filter，low/medium 在這裡加權
  if (preference.caffeineLimit === "none") {
    if (drink.caffeineLevel === "none") score += 60;
  } else if (preference.caffeineLimit === "low") {
    if (drink.caffeineLevel === "none") score += 35;
    if (drink.caffeineLevel === "low") score += 45;
    if (drink.caffeineLevel === "medium") score -= 15;
    if (drink.caffeineLevel === "high") score -= 35;
  } else if (preference.caffeineLimit === "medium") {
    if (["none", "low", "medium"].includes(drink.caffeineLevel)) score += 20;
    if (drink.caffeineLevel === "high") score -= 20;
  } else {
    score += 5;
  }

  // 3. 飲用時間
  if (
    preference.timeOfDay === "night" ||
    query.includes("晚上") ||
    query.includes("睡前")
  ) {
    if (drink.caffeineLevel === "none") score += 20;
    if (drink.caffeineLevel === "medium") score -= 10;
    if (drink.caffeineLevel === "high") score -= 30;
  }

  // 4. 奶類
  if (avoidsMilk) {
    if (!drink.containsMilk) score += 35;
    if (drink.containsMilk) score -= 120;
  } else if (userWantsMilk(preference)) {
    if (drink.containsMilk) score += 40;
    if (drink.category?.includes("奶")) score += 30;
    if (drink.flavorTags?.includes("奶香")) score += 25;
  }

  // 5. 過敏原
  const allergens = preference.allergens ?? [];

  if (allergens.length > 0) {
    if (!includesAny(drink.allergens ?? [], allergens)) score += 15;
  }

  // 6. 品牌偏好
  if (hasBrandPreference(drink, preference)) {
    score += 80;
  }

  // 7. 喜歡風味，同義詞通融
  for (const flavor of allPreferredFlavors) {
    if (!flavor) continue;

    if (flavorTags.some((tag) => tagMatches(flavor, tag))) score += 30;
    if (drink.base && tagMatches(flavor, drink.base)) score += 20;
    if (drink.category && tagMatches(flavor, drink.category)) score += 20;
  }

  // 8. 不喜歡風味
  for (const flavor of dislikedFlavors) {
    if (!flavor) continue;

    if (flavorTags.some((tag) => tagMatches(flavor, tag))) score -= 30;
    if (drink.base && tagMatches(flavor, drink.base)) score -= 20;
    if (drink.category && tagMatches(flavor, drink.category)) score -= 20;
  }

  // 9. query 具體關鍵字
  if (query.includes("清爽") && flavorTags.includes("清爽")) score += 30;
  if (query.includes("水果") && flavorTags.includes("水果")) score += 35;
  if (query.includes("果茶") && flavorTags.includes("水果")) score += 35;
  if (query.includes("酸") && flavorTags.includes("酸甜")) score += 25;
  if (query.includes("茶感") && flavorTags.includes("茶感")) score += 25;
  if (query.includes("濃") && flavorTags.includes("濃郁")) score += 20;
  if (query.includes("蜂蜜") && flavorTags.includes("蜂蜜")) score += 25;

  if (query.includes("奶茶") && drink.category?.includes("奶茶")) score += 45;
  if (query.includes("鮮奶") && drink.category?.includes("鮮奶")) score += 45;
  if (query.includes("水果茶") && drink.category?.includes("水果")) score += 45;
  if (query.includes("純茶") && drink.category?.includes("純茶")) score += 35;

  if (query.includes("冬瓜") && drink.base?.includes("冬瓜")) score += 35;
  if (query.includes("紅茶") && drink.base?.includes("紅茶")) score += 30;
  if (query.includes("綠茶") && drink.base?.includes("綠茶")) score += 30;
  if (query.includes("烏龍") && drink.base?.includes("烏龍")) score += 30;
  if (query.includes("四季春") && drink.base?.includes("四季春")) score += 30;
  if (query.includes("檸檬") && ingredients.includes("檸檬")) score += 35;
  if (query.includes("珍珠") && ingredients.includes("珍珠")) score += 35;
  if (query.includes("波霸") && ingredients.includes("波霸")) score += 35;

  // 10. 不想太甜
  const wantsLowSweet =
    queryHasAny(query, ["不甜", "不要太甜", "低糖", "少糖", "微糖", "無糖"]) ||
    sweetness === "無糖" ||
    sweetness === "微糖";

  if (wantsLowSweet) {
    if (flavorTags.includes("甜感")) score -= 30;
    if (drink.base?.includes("冬瓜")) score -= 20;
    if (drink.availableSweetness?.includes("固定甜")) score -= 35;
  }

  // 11. 想喝甜 / 古早味
  if (
    query.includes("甜") &&
    !query.includes("不甜") &&
    !query.includes("不要太甜")
  ) {
    if (flavorTags.includes("甜感")) score += 15;
  }

  if (query.includes("古早味") && flavorTags.includes("古早味")) {
    score += 30;
  }

  // 12. 避免成分
  if (includesAny(ingredients, avoidIngredients)) score -= 80;

  // 13. 健康標籤
  if (query.includes("低負擔") && healthTags.includes("低熱量")) score += 20;
  if (query.includes("無咖啡因") && healthTags.includes("無咖啡因")) score += 25;
  if (query.includes("無奶") && healthTags.includes("無奶")) score += 20;

  return score;
}

function buildReason(drink: any, preference: UserPreference) {
  const reasons: string[] = [];

  if (hasBrandPreference(drink, preference)) {
    reasons.push(`符合品牌偏好：${drink.brand}`);
  }

  if (preference.budgetMax && drink.price <= preference.budgetMax) {
    reasons.push(`價格 ${drink.price} 元在預算內`);
  }

  if (
    preference.caffeineLimit &&
    preference.caffeineLimit !== "no_limit" &&
    caffeineRank(drink.caffeineLevel) <= caffeineRank(preference.caffeineLimit)
  ) {
    reasons.push(`咖啡因等級符合限制：${drink.caffeineLevel}`);
  }

  if (userAvoidsMilk(preference) && !drink.containsMilk) {
    reasons.push("不含奶類");
  }

  const inferredFlavors = inferPreferredFlavorsFromQuery(preference.query ?? "");
  const allPreferredFlavors = Array.from(
    new Set([...(preference.preferredFlavors ?? []), ...inferredFlavors])
  );

  const matchedFlavors = allPreferredFlavors.filter((flavor) =>
    (drink.flavorTags ?? []).some((tag: string) => tagMatches(flavor, tag))
  );

  if (matchedFlavors.length > 0) {
    reasons.push(`符合偏好風味：${matchedFlavors.join("、")}`);
  }

  if (reasons.length === 0) {
    reasons.push(`風味標籤：${drink.flavorTags?.join("、") || "無"}`);
  }

  return `${reasons.join("，")}。matchScore=${
    drink.matchScore?.toFixed?.(2) ?? drink.matchScore
  }`;
}

function getNotRecommendedReason(drink: any, preference: UserPreference) {
  if (preference.budgetMax && drink.price > preference.budgetMax) {
    return `價格 ${drink.price} 元超出預算 ${preference.budgetMax} 元。`;
  }

  if (
    preference.caffeineLimit === "none" &&
    drink.caffeineLevel !== "none"
  ) {
    return "使用者要求無咖啡因，但此飲品含咖啡因。";
  }

  if (
    preference.allergens?.some((a: string) => drink.allergens?.includes(a))
  ) {
    return "含有使用者指定的過敏原。";
  }

  if (userAvoidsMilk(preference) && drink.containsMilk) {
    return "使用者避免奶類，但此飲品含奶。";
  }

  return "條件符合度較低，未進入最終推薦。";
}

app.post("/api/recommend", (req, res) => {
  const preference: UserPreference = req.body;

  console.log("Received preference:", preference);

  let candidates = (drinks as any[]).filter((drink: any) => {
    // 預算是硬性條件
    if (preference.budgetMax && drink.price > preference.budgetMax) {
      return false;
    }

    // 只有使用者明確要求 none 時，咖啡因才硬性排除
    // low / medium 交給 score 排序，不直接排掉，避免 Agent 候選太少
    if (
      preference.caffeineLimit === "none" &&
      drink.caffeineLevel !== "none"
    ) {
      return false;
    }

    // 過敏原是硬性條件
    if (
      preference.allergens?.some((a: string) => drink.allergens?.includes(a))
    ) {
      return false;
    }

    // 避免成分是硬性條件
    if (
      preference.avoidIngredients?.some((x: string) =>
        drink.ingredients?.some((ing: string) => ing.includes(x))
      )
    ) {
      return false;
    }

    // 明確避奶是硬性條件
    if (userAvoidsMilk(preference) && drink.containsMilk) {
      return false;
    }

    return true;
  });

  candidates = candidates
    .map((drink: any) => ({
      ...drink,
      matchScore: getDrinkScore(drink, preference),
    }))
    .sort((a: any, b: any) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.id.localeCompare(b.id);
    });

  console.log(
    "Top candidates:",
    candidates.slice(0, 10).map((d: any) => ({
      id: d.id,
      brand: d.brand,
      name: d.name,
      score: d.matchScore,
      caffeine: d.caffeineLevel,
      milk: d.containsMilk,
      tags: d.flavorTags,
    }))
  );

  const best = candidates[0];

  if (!best) {
    return res.json({
      bestChoice: {
        id: "",
        brand: "無符合飲品",
        name: "請放寬條件",
        price: 0,
        customOrder: "無",
        reason: "目前沒有飲料同時符合所有硬性條件。",
      },
      alternatives: [],
      criticNotes: [
        "條件過於嚴格，建議放寬咖啡因、預算、過敏原或奶類限制。",
      ],
      notRecommended: [],
      agentTrace: {
        recommenderSummary: "沒有找到符合條件的候選飲料。",
        criticSummary: "硬性條件篩選後候選清單為空。",
        judgeSummary: "建議使用者放寬限制後重新查詢。",
      },
    });
  }

  const customOrder = `${normalizeSweetness(
    preference.sweetnessMax
  )}、${normalizeIce(preference.icePreference)}`;

  const alternatives = candidates.slice(1, 5).map((d: any) => ({
    id: d.id,
    brand: d.brand,
    name: d.name,
    price: d.price,
    customOrder,
    reason: buildReason(d, preference),
  }));

  const candidateIds = new Set(candidates.map((d: any) => d.id));

  const notRecommended = (drinks as any[])
    .filter((d: any) => !candidateIds.has(d.id))
    .slice(0, 5)
    .map((d: any) => ({
      name: `${d.brand} ${d.name}`,
      reason: getNotRecommendedReason(d, preference),
    }));

  return res.json({
    bestChoice: {
      id: best.id,
      brand: best.brand,
      name: best.name,
      price: best.price,
      customOrder,
      reason: buildReason(best, preference),
    },
    alternatives,
    criticNotes: [
      "已先用規則引擎排除超預算、過敏原與明確不符合條件的飲品。",
      "咖啡因 low / medium 等偏好採用加權排序，不會過早排除候選品項。",
      "品牌與風味支援同義詞，例如可不可會對應到可不可熟成紅茶，酸會對應到酸甜。",
      "若涉及嚴重過敏，仍建議向店家確認實際成分。",
    ],
    notRecommended,
    agentTrace: {
      recommenderSummary:
        "推薦者根據預算、品牌、風味、咖啡因與成分限制選出高分候選。",
      criticSummary:
        "質疑者檢查過敏原、含奶、甜度風險、咖啡因與品牌偏好是否符合。",
      judgeSummary:
        "裁判根據加權分數與限制符合度選出最佳飲品，並保留多個備選。",
    },
  });
});

app.listen(8000, () => {
  console.log("API server running at http://localhost:8000");
});