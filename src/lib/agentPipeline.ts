import Groq from "groq-sdk";
import * as dotenv from "dotenv";

// 載入環境變數
dotenv.config();

// 初始化 Groq 客戶端
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// 通用的 Groq API 呼叫函式 (注意這裡必須加 async)
async function callLlm(systemPrompt: string, userContent: string): Promise<string> {
    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ],
        temperature: 0.7
    });
    
    // TypeScript 型別保護，確保回傳的是字串
    return response.choices[0]?.message?.content || "";
}

// C 模組的核心進入點（API Contract）
export async function runAgentPipeline(userPref: any, candidates: any[]): Promise<any> {
    // --- Agent 1: 推薦專家 ---
    const sysPromptRec = "你是一個熱情的手搖飲推薦專家。請根據使用者的偏好與候選名單，強力推薦最適合的2-3款飲料，並說明推薦理由。候選名單的Score僅供簡單參考，請以使用者偏好(尤其是query)為主，從candidate中做選擇。另外過敏原或有無奶類只要使用者偏好沒提到就不用太過在意";
    const userContentRec = `使用者偏好: ${JSON.stringify(userPref)}\n候選名單: ${JSON.stringify(candidates)}`;
    const recResult = await callLlm(sysPromptRec, userContentRec);

    // --- Agent 2: 稽查員找碴 ---
    const sysPromptCri = "你是一個極度挑剔的飲料稽查員、健康魔人。請對比使用者偏好，挑出推薦專家的建議中潛在的風險或缺點（如咖啡因、過敏原、甜度）。另外過敏原或有無奶類只要使用者偏好沒提到就不用太過在意";
    const userContentCri = `使用者偏好: ${JSON.stringify(userPref)}\n推薦專家的建議: ${recResult}`;
    const criticResult = await callLlm(sysPromptCri, userContentCri);

    // --- Agent 3: 最終裁判 ---
    const sysPromptJud = `你是一位客觀睿智的裁判。請綜合「推薦專家」與「稽查員」的意見，做出最終決定。
請務必以純 JSON 格式輸出，不要包含 \`\`\`json 的 markdown 標記。
必須包含以下欄位：
{
  "bestChoice": {"id": "", "brand": "", "name": "", "customOrder": "", "price": 0, "reason": ""},
  "alternatives": [{"id": "", "brand": "", "name": "", "customOrder": "", "price": 0, "reason": ""}],
  "criticNotes": ["警告1", "警告2"],
  "notRecommended": [{"name": "", "reason": ""}],
  "agentTrace": {
    "recommenderSummary": "推薦專家的文字摘要",
    "criticSummary": "稽查員的文字摘要",
    "judgeSummary": "裁判的決策摘要"
  }
}`;
    const userContentJud = `使用者偏好: ${JSON.stringify(userPref)}\n候選名單: ${JSON.stringify(candidates)}\n推薦專家意見: ${recResult}\n稽查員意見: ${criticResult}`;
    const judgeResult = await callLlm(sysPromptJud, userContentJud);

    // 解析並回傳標準物件格式
    try {
        // 清理 LLM 可能多輸出的 markdown 符號
        const cleanJsonStr = judgeResult.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJsonStr);
    } catch (error) {
        return {
            error: "JSON_PARSE_FAILED",
            raw_output: judgeResult,
            bestChoice: { reason: "解析失敗，請重新嘗試" }
        };
    }
}