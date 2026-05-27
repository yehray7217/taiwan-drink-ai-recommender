import { useState } from "react";
import { recommendDrink } from "./api";
import type { UserPreference, RecommendationResult } from "./types";
import "./App.css";

function App() {

  const [result, setResult] = useState<RecommendationResult | null>(null);

  const [loading, setLoading] =
  useState(false);

  const [preference, setPreference] = useState<UserPreference>({

    budget: "",

    sweetness: "less",

    caffeineLimit: "low",

    avoidMilk: false,

    allergen: "",

    deliveryTime: "",

    note: ""

  });

  const handleRecommend = async () => {

    setLoading(true);

    console.log(preference);

    const response =
      await recommendDrink(preference);

    setResult(response);

    setLoading(false);

  };

  return (
    <div className="app">
      <h1 className="title">

        🧋 DrinkMind AI

      </h1>

      <p className="subtitle">

        台灣手搖飲智能推薦系統

      </p>
      <div className="badge-row">
        <span className="badge">Rule Engine</span>
        <span className="badge">Multi-Agent</span>
        <span className="badge">Drink Recommendation</span>
      </div>

      <div className="card form-card">
        <h2>使用者需求</h2>

        <div className="form-grid">
          <div className="form-item">
            <label>預算</label>
            <input
              type="number"
              placeholder="例如：70"
              value={preference.budget}
              onChange={(e) =>
                setPreference({ ...preference, budget: e.target.value })
              }
            />
          </div>

          <div className="form-item">
            <label>甜度偏好</label>
            <select
              value={preference.sweetness}
              onChange={(e) =>
                setPreference({ ...preference, sweetness: e.target.value })
              }
            >
              <option value="none">無糖</option>
              <option value="less">微糖</option>
              <option value="normal">正常糖</option>
            </select>
          </div>

          <div className="form-item">
            <label>咖啡因限制</label>
            <select
              value={preference.caffeineLimit}
              onChange={(e) =>
                setPreference({ ...preference, caffeineLimit: e.target.value })
              }
            >
              <option value="low">低咖啡因</option>
              <option value="medium">中咖啡因</option>
              <option value="none">不限</option>
            </select>
          </div>

          <div className="form-item">
            <label>過敏原</label>
            <input
              type="text"
              placeholder="例如：牛奶、花生"
              value={preference.allergen}
              onChange={(e) =>
                setPreference({ ...preference, allergen: e.target.value })
              }
            />
          </div>

          <div className="form-item">
            <label>最大外送時間</label>
            <input
              type="number"
              placeholder="例如：30"
              value={preference.deliveryTime}
              onChange={(e) =>
                setPreference({ ...preference, deliveryTime: e.target.value })
              }
            />
          </div>

          <div className="form-item checkbox-row">
            <input
              type="checkbox"
              checked={preference.avoidMilk}
              onChange={(e) =>
                setPreference({ ...preference, avoidMilk: e.target.checked })
              }
            />
            <label>不要奶類</label>
          </div>
        </div>

        <div className="form-item" style={{ marginTop: "20px" }}>
          <label>其他需求</label>
          <textarea
            placeholder="例如：晚上想喝清爽一點"
            value={preference.note}
            onChange={(e) =>
              setPreference({ ...preference, note: e.target.value })
            }
          />
        </div>

        <button className="recommend-button" onClick={handleRecommend}>
          {loading ? (
            <span className="loading-content">
              <span className="spinner"></span>
              AI 分析中...
            </span>
          ) : (
            "🔍 推薦飲料"
          )}
        </button>
      </div>

      {result && (
        <div className="card result-card">
          <h2 className="section-title">⭐ 最佳推薦</h2>

          <div className="best-card">
            <p className="drink-name">

            🧋

            {" "}

            {result.bestRecommendation.brand}

            {" "}

            {result.bestRecommendation.name}

          </p>
            <p className="info-row">價格：{result.bestRecommendation.price}</p>
            <p className="info-row">點法：{result.bestRecommendation.customOrder}</p>
            <p className="info-row">理由：{result.bestRecommendation.reason}</p>
          </div>

          <h2 className="section-title">🥤 備選飲料</h2>
          {result.alternatives.map((drink, index) => (
            <div className="list-card" key={index}>
              {drink.brand} {drink.name}：{drink.customOrder}
            </div>
          ))}

          <h2 className="section-title">❌ 不推薦原因</h2>
          {result.rejectedReasons.map((reason, index) => (
            <div className="list-card reject-card" key={index}>
              {reason}
            </div>
          ))}

          <h2 className="section-title">🤖 三 Agent 摘要</h2>
          <div className="agent-grid">
            <div className="agent-card">
              <h3>Agent 1 推薦者</h3>
              <p>{result.agentSummary.agent1}</p>
            </div>
            <div className="agent-card">
              <h3>Agent 2 質疑者</h3>
              <p>{result.agentSummary.agent2}</p>
            </div>
            <div className="agent-card">
              <h3>Agent 3 總結者</h3>
              <p>{result.agentSummary.agent3}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;