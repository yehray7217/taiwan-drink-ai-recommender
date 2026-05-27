"use client";

import { FormEvent, useState } from "react";

type DrinkChoice = {
  id?: string;
  brand?: string;
  name?: string;
  customOrder?: string;
  price?: number;
  reason?: string;
};

type ApiResult = {
  filterResult?: {
    summary?: {
      totalDrinks: number;
      candidateCount: number;
      topCandidateCount: number;
      notRecommendedCount: number;
    };
    topCandidates?: Array<{
      id?: string;
      brand?: string;
      name?: string;
      price?: number;
      recommendedOrder?: string;
      matchScore?: number;
      matchedReasons?: string[];
      warnings?: string[];
    }>;
  };
  recommendation?: {
    bestChoice?: DrinkChoice | null;
    alternatives?: DrinkChoice[];
    criticNotes?: string[];
    notRecommended?: Array<{
      id?: string;
      name?: string;
      reason?: string;
    }>;
    agentTrace?: {
      recommenderSummary?: string;
      criticSummary?: string;
      judgeSummary?: string;
    };
  };
  error?: string;
  detail?: string;
};

function splitList(value: string) {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function makeDrinkKey(drink: DrinkChoice, index: number, prefix: string) {
  return (
    drink.id ||
    `${prefix}-${drink.brand || "unknown-brand"}-${drink.name || "unknown-name"}-${index}`
  );
}

export default function HomePage() {
  const [query, setQuery] = useState(
    "晚上不想喝太多咖啡因，不要太甜，預算70元內，不能喝牛奶"
  );
  const [sweetnessMax, setSweetnessMax] = useState("微糖");
  const [icePreference, setIcePreference] = useState("少冰");
  const [budgetMax, setBudgetMax] = useState(70);
  const [caffeineLimit, setCaffeineLimit] = useState("low");
  const [allergens, setAllergens] = useState("milk");
  const [avoidIngredients, setAvoidIngredients] = useState("牛奶,奶精,鮮乳,奶蓋");
  const [preferredFlavors, setPreferredFlavors] = useState("清爽,水果");
  const [dislikedFlavors, setDislikedFlavors] = useState("太甜,太濃,奶味");
  const [timeOfDay, setTimeOfDay] = useState("night");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const body = {
      query,
      sweetnessMax,
      icePreference,
      budgetMax,
      caffeineLimit,
      allergens: splitList(allergens),
      avoidIngredients: splitList(avoidIngredients),
      preferredFlavors: splitList(preferredFlavors),
      dislikedFlavors: splitList(dislikedFlavors),
      timeOfDay,
      brandPreference: [],
      topK: 5,
      maxSameBrandInTopK: 1,
      agentCandidateLimit: 20
    };

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        error: "Fetch failed",
        detail: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setLoading(false);
    }
  }

  const best = result?.recommendation?.bestChoice;
  const alternatives = result?.recommendation?.alternatives || [];
  const criticNotes = result?.recommendation?.criticNotes || [];
  const notRecommended = result?.recommendation?.notRecommended || [];
  const agentTrace = result?.recommendation?.agentTrace;

  return (
    <main className="container">
      <section className="hero">
        <p className="badge">Taiwan Drink AI Recommender</p>
        <h1>台灣手搖飲 AI 推薦系統</h1>
        <p className="subtitle">
          先用規則引擎篩選飲料，再用三個 AI Agent 推薦、質疑與裁判。
        </p>
      </section>

      <form className="card form" onSubmit={handleSubmit}>
        <label>
          自然語言需求
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
          />
        </label>

        <div className="grid">
          <label>
            最高甜度
            <select
              value={sweetnessMax}
              onChange={(e) => setSweetnessMax(e.target.value)}
            >
              <option>無糖</option>
              <option>微糖</option>
              <option>半糖</option>
              <option>少糖</option>
              <option>正常</option>
            </select>
          </label>

          <label>
            冰量
            <select
              value={icePreference}
              onChange={(e) => setIcePreference(e.target.value)}
            >
              <option>去冰</option>
              <option>微冰</option>
              <option>少冰</option>
              <option>正常冰</option>
            </select>
          </label>

          <label>
            預算上限
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(Number(e.target.value))}
            />
          </label>

          <label>
            咖啡因限制
            <select
              value={caffeineLimit}
              onChange={(e) => setCaffeineLimit(e.target.value)}
            >
              <option value="no_limit">不限</option>
              <option value="none">無咖啡因</option>
              <option value="low">低咖啡因以下</option>
              <option value="medium">中咖啡因以下</option>
              <option value="high">高咖啡因以下</option>
            </select>
          </label>

          <label>
            飲用時間
            <select
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            >
              <option value="">不限</option>
              <option value="morning">早上</option>
              <option value="afternoon">下午</option>
              <option value="night">晚上</option>
            </select>
          </label>

          <label>
            過敏原，逗號分隔
            <input
              value={allergens}
              onChange={(e) => setAllergens(e.target.value)}
              placeholder="milk,soy,peanut"
            />
          </label>
        </div>

        <label>
          避免成分，逗號分隔
          <input
            value={avoidIngredients}
            onChange={(e) => setAvoidIngredients(e.target.value)}
            placeholder="牛奶,奶精,鮮乳,奶蓋"
          />
        </label>

        <div className="grid">
          <label>
            喜歡風味，逗號分隔
            <input
              value={preferredFlavors}
              onChange={(e) => setPreferredFlavors(e.target.value)}
              placeholder="清爽,水果"
            />
          </label>

          <label>
            不喜歡風味，逗號分隔
            <input
              value={dislikedFlavors}
              onChange={(e) => setDislikedFlavors(e.target.value)}
              placeholder="太甜,太濃,奶味"
            />
          </label>
        </div>

        <button disabled={loading} type="submit">
          {loading ? "推薦中..." : "開始推薦"}
        </button>
      </form>

      {result?.error && (
        <section className="card error">
          <h2>發生錯誤</h2>
          <p>{result.error}</p>
          {result.detail ? <pre>{result.detail}</pre> : null}
        </section>
      )}

      {result?.filterResult?.summary && (
        <section className="card">
          <h2>規則引擎篩選結果</h2>
          <div className="stats">
            <span>總飲料：{result.filterResult.summary.totalDrinks}</span>
            <span>候選：{result.filterResult.summary.candidateCount}</span>
            <span>Top：{result.filterResult.summary.topCandidateCount}</span>
            <span>排除：{result.filterResult.summary.notRecommendedCount}</span>
          </div>
        </section>
      )}

      {best ? (
        <section className="card best">
          <h2>最佳推薦</h2>
          <h3>
            {best.brand || "未知品牌"} - {best.name || "未知飲料"}
          </h3>
          <p className="order">建議點法：{best.customOrder || "依店家預設"}</p>
          <p>價格：{best.price ?? "未知"} 元</p>
          <p>{best.reason || "沒有提供推薦理由"}</p>
        </section>
      ) : null}

      {alternatives.length > 0 ? (
        <section className="card">
          <h2>備選飲料</h2>
          <div className="list">
            {alternatives.map((drink, index) => (
              <div
                key={makeDrinkKey(drink, index, "alternative")}
                className="item"
              >
                <strong>
                  {drink.brand || "未知品牌"} - {drink.name || "未知飲料"}
                </strong>
                <p>
                  {drink.customOrder || "依店家預設"}｜
                  {drink.price ?? "未知"} 元
                </p>
                <p>{drink.reason || "沒有提供理由"}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {criticNotes.length > 0 ? (
        <section className="card">
          <h2>質疑 Agent 注意事項</h2>
          <ul>
            {criticNotes.map((note, index) => (
              <li key={`critic-note-${index}`}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {notRecommended.length > 0 ? (
        <section className="card">
          <h2>不推薦飲料</h2>
          <div className="list">
            {notRecommended.slice(0, 8).map((drink, index) => (
              <div
                key={
                  drink.id ||
                  `not-recommended-${drink.name || "unknown"}-${index}`
                }
                className="item"
              >
                <strong>{drink.name || "未知飲料"}</strong>
                <p>{drink.reason || "沒有提供原因"}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {agentTrace ? (
        <section className="card">
          <h2>三 Agent 討論摘要</h2>
          <p>
            <strong>推薦 Agent：</strong>
            {agentTrace.recommenderSummary || "無"}
          </p>
          <p>
            <strong>質疑 Agent：</strong>
            {agentTrace.criticSummary || "無"}
          </p>
          <p>
            <strong>裁判 Agent：</strong>
            {agentTrace.judgeSummary || "無"}
          </p>
        </section>
      ) : null}
    </main>
  );
}