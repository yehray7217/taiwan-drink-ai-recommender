# 🥤 C 模組：三 Agent 對抗式手搖飲推薦系統 (說明文件)

本文件為 **C 模組 (AI 對抗決策大腦)** 的完整說明書（適用於 TypeScript / Next.js 架構）。本模組已全面將原本的 Python 核心邏輯重構移植至前端/後端整合生態系中，並實作了標準的 API Route，方便團隊協作與無縫對接。

---

## 🚀 專案變更與檔案結構 (File Changes)

在系統整合階段，C 模組主要負責、建置與調整的檔案路徑如下：

```text
taiwan-drink-ai-recommender/
├── .env.example              # 環境變數範本檔（提供給組員複製使用）
├── package.json              # 新增 `groq-sdk` 依賴套件與環境設定
├── package-lock.json         # 鎖定套件與子套件之精確版本號
└── src/
    ├── api/
    │   └── recommend.ts      # 後端 API 進入點 (POST /api/recommend)
    └── lib/
        └── agentPipeline.ts  # C 模組核心大腦（3 Agent 對抗推理邏輯）
```

---

## 🛠️ 組員本地端環境建置步驟 (Setup Instructions)

當 **B 同學 (規則篩選)** 或 **D 同學 (前端 UI)** 下載或切換至包含此核心的開發分支後，請務必按照以下步驟更新本地端環境：

### 1. 安裝新引入的依賴套件
由於 C 模組引入了 Groq 官方的 Node.js SDK，請在專案根目錄（包含 `package.json` 的最外層資料夾）執行以下指令，自動補齊與同步環境所需的套件：
```bash
npm install
```

### 2. 設定本地端環境變數
1. 請在專案根目錄下，複製 `.env.example` 並重新命名為 **`.env.local`**（Next.js 專案預設讀取的本地環境變數隱藏檔）。
2. 打開 `.env.local`，並填入你的 Groq API 金鑰：
   ```env
   GROQ_API_KEY=gsk_你的真實金鑰貼在這裡
   ```
   *⚠️ 注意：`.env.local` 已受到 `.gitignore` 的嚴格保護，絕對不會被推上 GitHub 雲端儲存庫，請安心填寫個人金鑰。*

### 3. 啟動 Next.js 開發伺服器
於根目錄終端機執行：
```bash
npm run dev
```
啟動成功後，本地端 API 服務將會掛載於：`http://localhost:3000/api/recommend`

---

## 🔗 介面串接合約 (API Contract Specification)

為了讓 **B 同學（負責硬性規則篩選）**與 **D 同學（負責前端 UI 呈現）**能高效整合，本模組定義了嚴格的輸入與輸出 JSON 格式合約。

### 📌 後端 API 資訊
* **API 路由網址**：`/api/recommend`
* **HTTP 請求方法**：`POST`
* **請求標頭 (Headers)**：`Content-Type: application/json`

### 📥 請求主體格式 (Request Body - Input Spec)
前端或後端整合層呼叫此 API 時，必須傳入一個包含 `userPref` (使用者偏好物件) 與 `candidates` (B 模組篩選後的候選飲料陣列) 的 JSON 結構：

```json
{
  "userPref": {
    "query": "晚上不想喝太多咖啡因，不要太甜，預算70元內，不能喝牛奶",
    "sweetnessMax": "微糖",
    "budgetMax": 70,
    "caffeineLimit": "low",
    "allergens": ["milk"],
    "timeOfDay": "night"
  },
  "candidates": [
    {
      "id": "kebuke_004",
      "brand": "可不可",
      "name": "雪花冷露",
      "price": 35,
      "caffeineLevel": "none",
      "containsMilk": false,
      "flavorTags": ["甜感", "古早味", "清爽"]
    },
    {
      "id": "guiji_001",
      "brand": "龜記",
      "name": "極品紅茶",
      "price": 40,
      "caffeineLevel": "medium",
      "containsMilk": false,
      "flavorTags": ["茶感", "清爽", "經典"]
    }
  ]
}
```

### 📤 回傳回應格式 (Response Body - Output Spec)
API 執行成功後，會回傳 **HTTP 200** 狀態碼，並吐出由最終裁判 Agent 綜合評估、分類與排版後的結構化推薦資料。D 同學可以直接拿此結構進行前端元件的資料綁定與 UI 渲染：

```json
{
  "bestChoice": {
    "id": "kebuke_004",
    "brand": "可不可",
    "name": "雪花冷露",
    "customOrder": "微糖少冰",
    "price": 35,
    "reason": "完美符合使用者夜間、無咖啡因且無牛奶過敏原的要求，古早味清爽消暑。"
  },
  "alternatives": [
    {
      "id": "guiji_001",
      "brand": "龜記",
      "name": "極品紅茶",
      "customOrder": "微糖微冰",
      "price": 40,
      "reason": "作為備選方案，茶感經典。唯獨其含有中等咖啡因，夜間飲用建議斟酌。"
    }
  ],
  "criticNotes": [
    "稽查員警告：極品紅茶含有中等咖啡因，夜間飲用可能影響睡眠品質。",
    "稽查員警告：雪花冷露為冬瓜茶基底，本身帶有固定甜度，點微糖即可。"
  ],
  "notRecommended": [
    {
      "name": "波霸奶茶",
      "reason": "含有牛奶成分，嚴重觸犯使用者牛奶過敏原限制；且咖啡因與熱量在夜間偏高。"
    }
  ],
  "agentTrace": {
    "recommenderSummary": "初步推薦了雪花冷露與極品紅茶，認為兩者皆在預算內且口感清爽。",
    "criticSummary": "強烈質疑紅茶的咖啡因風險，並細心叮嚀冬瓜茶的基底固定甜度。",
    "judgeSummary": "最終裁定以完全無咖啡因的雪花冷露獲勝，並將紅茶列為第二備選。"
  }
}
```

---

## 🛡️ 異常容錯與防禦性機制 (Robustness & Error Handling)

1. **Markdown 標籤自動清理**：大語言模型 (LLM) 有時會在輸出 JSON 時，自作聰明加上 \`\`\`json ... \`\`\` 的 Markdown 區塊標記。本模組在解析前已實作正則清理機制，確保 JSON 結構能被穩定解析。
2. **JSON 解析防崩潰**：若 LLM 輸出格式嚴重異常導致 `JSON.parse` 失敗，本 API 設有完整的 `try-catch` 防禦性快取機制。此時 API 不會中斷或崩潰，而是會回傳以下結構，並附上 `raw_output` 原始文字供開發者除錯：
   ```json
   {
     "error": "JSON_PARSE_FAILED",
     "raw_output": "...模型輸出的原始混亂文字..."
   }
   ```
3. **HTTP 方法限制**：本 API 路由僅接受 `POST` 請求。若誤用 `GET`、`PUT` 等其他 HTTP Method 呼叫，系統會自動阻斷並回傳 **HTTP 405 Method Not Allowed**。