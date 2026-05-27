import type {
  UserPreference,
  RecommendationResult
} from "./types";

import { mockResult } from "./mockResult";

const USE_MOCK_API = true;

export async function recommendDrink(
  preference: UserPreference
): Promise<RecommendationResult> {
  console.log("送給後端的資料：", preference);

  if (USE_MOCK_API) {
    await new Promise((resolve) =>
      setTimeout(resolve, 800)
    );

    return mockResult;
  }

  const response = await fetch("http://localhost:8000/api/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preference),
  });

  if (!response.ok) {
    throw new Error("推薦 API 發生錯誤");
  }

  return await response.json();
}