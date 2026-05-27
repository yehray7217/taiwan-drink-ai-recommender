import { useState } from "react";
import { recommendDrink } from "./api";
import type { UserPreference, RecommendationResult } from "./types";
import "./App.css";

function App() {

  const [result, setResult] = useState<RecommendationResult | null>(null);

  const [loading, setLoading] =
  useState(false);

  const [preference, setPreference] =
  useState<UserPreference>({

    query: "",

    sweetnessMax: "less",

    icePreference: "less",

    budgetMax: 70,

    caffeineLimit: "low",

    allergens: [],

    avoidIngredients: [],

    preferredFlavors: [],

    dislikedFlavors: [],

    timeOfDay: "night",

    brandPreference: []

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
            <label>需求描述</label>
            <input
              type="text"
              placeholder="例如：晚上想喝清爽一點，不要太甜"
              value={preference.query}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  query: e.target.value,
                })
              }
            />
          </div>

          <div className="form-item">
            <label>預算上限</label>
            <input
              type="number"
              placeholder="例如：70"
              value={preference.budgetMax}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  budgetMax: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="form-item">
            <label>最高甜度</label>
            <select
              value={preference.sweetnessMax}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  sweetnessMax: e.target.value,
                })
              }
            >
              <option value="none">無糖</option>
              <option value="less">微糖</option>
              <option value="half">半糖</option>
              <option value="normal">正常糖</option>
            </select>
          </div>

          <div className="form-item">
            <label>冰量偏好</label>
            <select
              value={preference.icePreference}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  icePreference: e.target.value,
                })
              }
            >
              <option value="none">去冰</option>
              <option value="less">少冰</option>
              <option value="normal">正常冰</option>
              <option value="hot">熱飲</option>
            </select>
          </div>

          <div className="form-item">
            <label>咖啡因限制</label>
            <select
              value={preference.caffeineLimit}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  caffeineLimit: e.target.value as UserPreference["caffeineLimit"],
                })
              }
            >
              <option value="none">完全不要咖啡因</option>
              <option value="low">低咖啡因</option>
              <option value="medium">中咖啡因</option>
              <option value="high">可接受高咖啡因</option>
              <option value="no_limit">不限</option>
            </select>
          </div>

          <div className="form-item">
            <label>飲用時間</label>
            <select
              value={preference.timeOfDay}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  timeOfDay: e.target.value as UserPreference["timeOfDay"],
                })
              }
            >
              <option value="morning">早上</option>
              <option value="afternoon">下午</option>
              <option value="night">晚上</option>
            </select>
          </div>

          <div className="form-item">
            <label>過敏原</label>
            <input
              type="text"
              placeholder="例如：牛奶、花生"
              value={preference.allergens.join("、")}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  allergens: e.target.value
                    .split(/[、,，]/)
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div className="form-item">
            <label>避免成分</label>
            <input
              type="text"
              placeholder="例如：奶類、珍珠"
              value={preference.avoidIngredients.join("、")}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  avoidIngredients: e.target.value
                    .split(/[、,，]/)
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div className="form-item">
            <label>喜歡的風味</label>
            <input
              type="text"
              placeholder="例如：清爽、茶香、水果"
              value={preference.preferredFlavors.join("、")}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  preferredFlavors: e.target.value
                    .split(/[、,，]/)
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div className="form-item">
            <label>不喜歡的風味</label>
            <input
              type="text"
              placeholder="例如：太甜、奶味重"
              value={preference.dislikedFlavors.join("、")}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  dislikedFlavors: e.target.value
                    .split(/[、,，]/)
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div className="form-item">
            <label>品牌偏好</label>
            <input
              type="text"
              placeholder="例如：五十嵐、可不可"
              value={preference.brandPreference.join("、")}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  brandPreference: e.target.value
                    .split(/[、,，]/)
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
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
              🧋 {result.bestChoice.brand} {result.bestChoice.name}
            </p>
            <p className="info-row">價格：{result.bestChoice.price}</p>
            <p className="info-row">點法：{result.bestChoice.customOrder}</p>
            <p className="info-row">理由：{result.bestChoice.reason}</p>
          </div>

          <h2 className="section-title">🥤 備選飲料</h2>
          {result.alternatives.map((drink, index) => (
            <div className="list-card" key={index}>
              {drink.brand} {drink.name}：{drink.customOrder}
            </div>
          ))}

          <h2 className="section-title">🧠 質疑與檢查</h2>
          {result.criticNotes.map((note, index) => (
            <div className="list-card" key={index}>
              {note}
            </div>
          ))}

          <h2 className="section-title">❌ 不推薦原因</h2>
          {result.notRecommended.map((drink, index) => (
            <div className="list-card reject-card" key={index}>
              {drink.name}：{drink.reason}
            </div>
          ))}

          <h2 className="section-title">🤖 三 Agent 摘要</h2>
          <div className="agent-grid">
            <div className="agent-card">
              <h3>Agent 1 推薦者</h3>
              <p>{result.agentTrace.recommenderSummary}</p>
            </div>
            <div className="agent-card">
              <h3>Agent 2 質疑者</h3>
              <p>{result.agentTrace.criticSummary}</p>
            </div>
            <div className="agent-card">
              <h3>Agent 3 總結者</h3>
              <p>{result.agentTrace.judgeSummary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;