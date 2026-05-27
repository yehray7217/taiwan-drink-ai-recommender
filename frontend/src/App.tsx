import { useState } from "react";
import { recommendDrink } from "./api";
import type { UserPreference, RecommendationResult } from "./types";

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
    <div
      style={{
        maxWidth:"1000px",
        margin:"0 auto",
        padding:"40px",
        fontFamily:"Arial"
      }}
    >

      <h1
        style={{
          textAlign:"center",
          color:"#0F766E"
        }}
      >
        🧋 台灣手搖飲 AI 推薦系統
      </h1>

      <div
        style={{
          background:"#F8FAFC",
          padding:"25px",
          borderRadius:"16px",
          boxShadow:"0 4px 12px rgba(0,0,0,0.08)"
        }}
      >
      <h2>使用者需求</h2>

      <input
        type="number"
        placeholder="預算"

        value={preference.budget}

        onChange={(e)=>
          setPreference({
            ...preference,
            budget: e.target.value
          })
        }
      />

      <br /><br />

      <h3>甜度偏好</h3>

      <select

        value={preference.sweetness}

        onChange={(e)=>
          setPreference({
            ...preference,
            sweetness: e.target.value
          })
        }

      >

        <option value="none">
          無糖
        </option>

        <option value="less">
          微糖
        </option>

        <option value="normal">
          正常糖
        </option>

      </select>

      <br /><br />

      <select

        value={preference.caffeineLimit}

        onChange={(e)=>
          setPreference({
            ...preference,
            caffeineLimit: e.target.value
          })
        }

      >

        <option value="low">
          低咖啡因
        </option>

        <option value="medium">
          中咖啡因
        </option>

        <option value="none">
          不限
        </option>

      </select>

      <br /><br />

      <label>

        <input
          type="checkbox"

          checked={preference.avoidMilk}

          onChange={(e)=>
            setPreference({
              ...preference,
              avoidMilk: e.target.checked
            })
          }
        />

        不要奶類

      </label>

      <br /><br />

      <input

        type="text"

        placeholder="過敏原 (例如: 牛奶、花生)"

        value={preference.allergen}

        onChange={(e)=>
          setPreference({
            ...preference,
            allergen: e.target.value
          })
        }

      />

      <br /><br />

      <input

        type="number"

        placeholder="最大外送時間(分鐘)"

        value={preference.deliveryTime}

        onChange={(e)=>
          setPreference({
            ...preference,
            deliveryTime: e.target.value
          })
        }

      />

      <br /><br />

      <textarea

        placeholder="其他需求"

        value={preference.note}

        onChange={(e)=>
          setPreference({
            ...preference,
            note: e.target.value
          })
        }

      />

      <br /><br />

      <button
        onClick={handleRecommend}
        style={{
          background:"#14B8A6",
          color:"white",
          border:"none",
          padding:"12px 20px",
          borderRadius:"10px",
          cursor:"pointer",
          fontSize:"16px"
        }}
      >
        {loading
          ? "AI 分析中..."
          : "🔍 推薦飲料"}
      </button>
      </div>
      {result && (
        <div
          style={{
            marginTop:"30px",
            background:"#FFFFFF",
            padding:"30px",
            borderRadius:"16px",
            boxShadow:"0 4px 14px rgba(0,0,0,0.1)"
          }}
        >

          <h2 style={{color:"#0F766E"}}>
            ⭐ 最佳推薦
          </h2>

          <p>
            {result.bestRecommendation.brand}
            {" "}
            {result.bestRecommendation.name}
          </p>

          <p>
            價格：
            {result.bestRecommendation.price}
          </p>

          <p>
            點法：
            {result.bestRecommendation.customOrder}
          </p>

          <p>
            理由：
            {result.bestRecommendation.reason}
          </p>

          <h2 style={{color:"#2563EB"}}>
            🥤 備選飲料
          </h2>

          {result.alternatives.map((drink: any, index: number) => (
            <p key={index}>
              {drink.brand} {drink.name}：{drink.customOrder}
            </p>
          ))}

          <h2 style={{color:"#DC2626"}}>
            ❌ 不推薦原因
          </h2>

          {result.rejectedReasons.map((reason: string, index: number) => (
            <p key={index}>{reason}</p>
          ))}

          <h2 style={{color:"#7C3AED"}}>
            🤖 三 Agent 摘要
          </h2>

          <p>{result.agentSummary.agent1}</p>
          <p>{result.agentSummary.agent2}</p>
          <p>{result.agentSummary.agent3}</p>

        </div>
      )}

    </div>
  );
}

export default App;