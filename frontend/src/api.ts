import type {
  UserPreference,
  RecommendationResult
} from "./types";

import { mockResult } from "./mockResult";

export async function recommendDrink(
  preference: UserPreference
): Promise<RecommendationResult> {
  console.log("送給後端的資料：", preference);

  await new Promise((resolve) =>
    setTimeout(resolve, 800)
  );

  return mockResult;
}