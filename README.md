# How to Run / 專案執行方式

## 1. Clone repository

```bash
git clone https://github.com/yehray7217/taiwan-drink-ai-recommender.git
cd taiwan-drink-ai-recommender
```

## 2. Install dependencies

```bash
npm install
```

## 3. Create `.env.local`

在專案根目錄新增 `.env.local`：

```env
GROQ_API_KEY=your_groq_api_key
```

如果你的 Windows 電腦要用 `py` 才能執行 Python，請再加上：

```env
PYTHON_BIN=py
```

如果 `python` 指令可以正常使用，就不用設定 `PYTHON_BIN`。

## 4. Test rule engine

先確認 Python 規則引擎可以正常讀取飲料資料並輸出篩選結果：

```bash
python src/rule_engine/rule_engine.py --drinks data/drinks.json --output filter_result.json
```

Windows 如果 `python` 指令不能用，可以改用：

```bash
py src/rule_engine/rule_engine.py --drinks data/drinks.json --output filter_result.json
```

## 5. Run web app

```bash
npm run dev
```

打開瀏覽器：

```text
http://localhost:3000
```

## 6. Notes

以下檔案或資料夾不需要從 GitHub clone 下來，會由本機安裝或執行時自動產生：

```text
node_modules/
.next/
filter_result.json
auto_test_outputs/
```

`.env.local` 內含 API Key，不應該 commit 到 GitHub。

---

# 台灣手搖飲 AI 推薦與多 Agent 對抗式決策系統

## 1. 專案簡介

本專案目標是做一個「台灣手搖飲 AI 推薦系統」。使用者輸入需求，例如：

- 不想太甜
- 晚上不想攝取太多咖啡因
- 有過敏原限制
- 預算上限
- 可接受條件
- 想喝清爽、水果、奶類、茶感重等風味

系統會先根據飲料資料庫做硬性篩選，再透過三個 AI Agent 進行推薦、質疑與總結，最後產生最適合的飲料推薦、客製化點法與不推薦原因。

本專案重點不是讓 LLM 隨便推薦飲料，而是透過：

1. 結構化飲料資料庫
2. 規則引擎硬性篩選
3. 多 Agent 對抗式決策
4. 前端輸入與結果呈現

來提高推薦結果的可信度與可解釋性。

---

## 2. 系統整體流程

```text
使用者輸入需求
        ↓
D：前端整理成 UserPreference
        ↓
B：規則引擎產生 FilterConfig
        ↓
A：飲料資料庫提供 Drink 資料
        ↓
B：硬性篩選與排序，產生 CandidateDrink[]
        ↓
C：三 Agent 對抗式推薦
        ↓
D：前端顯示 FinalRecommendation
```

簡化資料流：

```text
UserPreference
    → FilterConfig
    → CandidateDrink[]
    → AgentDecisionResult
    → FinalRecommendation
```

---

## 3. 小組分工與串接格式

| 成員 | 負責模組 | 接收格式 | 輸出格式 | 交給誰 |
|---|---|---|---|---|
| A | 飲料資料庫與資料清洗 | 原始品牌與品項資料 | `Drink[]` / `drinks.json` | B、C |
| B | 規則引擎與硬性篩選 | `UserPreference` + `Drink[]` | `FilterConfig` + `CandidateDrink[]` | C |
| C | 三 Agent 對抗式推薦 | `UserPreference` + `CandidateDrink[]` | `FinalRecommendation` | D |
| D | 前端 UI 與整合 | 使用者輸入 + `FinalRecommendation` | UI 畫面 / API request | B、使用者 |

---

## 4. 各成員具體工作

### A：飲料資料庫與資料清洗

負責蒐集手搖飲品牌與品項資料，整理成 `drinks.json` 或資料庫。

#### A 要做的事

- 蒐集至少 3～5 家台灣手搖飲品牌
- 每家整理 10～20 個飲料品項
- 整理價格、茶基底、是否含奶、配料、咖啡因等級、過敏原、甜度冰量選項
- 統一欄位名稱與資料格式
- 提供測試資料給 B 與 C 使用

#### A 的輸出：`Drink[]`

```json
[
  {
    "id": "kebuke_001",
    "brand": "可不可熟成紅茶",
    "name": "熟成紅茶",
    "category": "純茶",
    "base": "紅茶",
    "price": 35,
    "caffeineLevel": "medium",
    "containsMilk": false,
    "ingredients": ["紅茶"],
    "allergens": [],
    "availableSweetness": ["無糖", "微糖", "半糖", "少糖", "正常"],
    "availableIce": ["去冰", "微冰", "少冰", "正常冰"],
    "flavorTags": ["茶感", "清爽", "微澀"],
    "healthTags": ["低熱量", "無奶"],
    "note": "晚上若避免咖啡因，不建議作為首選"
  }
]
```

#### 欄位說明

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | string | 飲料唯一 ID |
| `brand` | string | 品牌名稱 |
| `name` | string | 飲料名稱 |
| `category` | string | 類別，例如純茶、奶茶、水果茶、特調 |
| `base` | string | 茶基底或主成分 |
| `price` | number | 價格 |
| `caffeineLevel` | string | `none` / `low` / `medium` / `high` |
| `containsMilk` | boolean | 是否含奶 |
| `ingredients` | string[] | 主要成分 |
| `allergens` | string[] | 過敏原，例如 `milk`, `peanut`, `soy` |
| `availableSweetness` | string[] | 可選甜度 |
| `availableIce` | string[] | 可選冰量 |
| `flavorTags` | string[] | 風味標籤 |
| `healthTags` | string[] | 健康或限制標籤 |
| `note` | string | 備註 |

---

### B：規則引擎與硬性篩選

負責把使用者需求轉成篩選規則，並從飲料資料庫中篩出候選飲料。

#### B 要做的事

- 接收 D 傳來的 `UserPreference`
- 產生 `FilterConfig`
- 根據硬性條件篩選 A 的 `Drink[]`
- 排除違反限制的飲料
- 將符合條件的飲料排序
- 輸出 `CandidateDrink[]` 給 C

#### B 的輸入：`UserPreference`

```json
{
  "query": "晚上不想喝太多咖啡因，不要太甜，預算70元內，不能喝牛奶，預算70元內",
  "sweetnessMax": "微糖",
  "icePreference": "少冰",
  "budgetMax": 70,
  "caffeineLimit": "low",
  "allergens": ["milk"],
  "avoidIngredients": ["牛奶", "奶精", "奶蓋"],
  "preferredFlavors": ["清爽", "水果"],
  "dislikedFlavors": ["太甜", "太濃", "奶味"],
  "timeOfDay": "night",
  "brandPreference": []
}
```

#### B 的中間輸出：`FilterConfig`

```json
{
  "mustExclude": {
    "allergens": ["milk"],
    "ingredients": ["牛奶", "奶精", "奶蓋"]
  },
  "mustMatch": {
    "priceMax": 70,
    "caffeineMax": "low"
  },
  "softPreferences": {
    "sweetnessMax": "微糖",
    "icePreference": "少冰",
    "flavors": ["清爽", "水果"],
    "timeOfDay": "night"
  }
}
```

#### B 的輸出：`CandidateDrink[]`

```json
[
  {
    "id": "wushiland_002",
    "brand": "五十嵐",
    "name": "檸檬冬瓜",
    "price": 50,
    "caffeineLevel": "none",
    "containsMilk": false,
    "ingredients": ["冬瓜", "檸檬"],
    "allergens": [],
    "availableSweetness": ["微糖", "半糖", "正常"],
    "availableIce": ["去冰", "微冰", "少冰", "正常冰"],
    "flavorTags": ["清爽", "酸甜"],
    "recommendedOrder": "微糖、少冰",
    "matchScore": 86,
    "matchedReasons": [
      "無咖啡因",
      "無奶類",
      "符合70元以內",
      "外送時間30分鐘內"
    ],
    "warnings": [
      "冬瓜基底即使微糖仍可能偏甜"
    ]
  }
]
```

#### 硬性規則範例

| 使用者條件 | 系統規則 |
|---|---|
| 過敏原包含 `milk` | 排除 `allergens` 包含 `milk` 或 `containsMilk = true` 的飲料 |
| 預算 70 元內 | 排除 `price > 70` |
| 預算 70 元內 | 排除 `deliveryTime > 30` |
| 晚上低咖啡因 | 優先排除 `caffeineLevel = medium/high` |
| 不要太甜 | `recommendedOrder` 不得高於 `微糖` |
| 不喝奶 | 排除牛奶、鮮奶、奶精、奶蓋、奶霜相關飲料 |

---

### C：三 Agent 對抗式推薦

負責實作三個 Agent 的推薦、質疑與總結流程。

#### C 要做的事

- 接收 B 輸出的 `CandidateDrink[]`
- 接收 D 原始的 `UserPreference`
- 實作三個 Agent：
  - Agent 1：推薦 Agent
  - Agent 2：質疑 Agent
  - Agent 3：裁判 Agent
- 統整最終推薦結果
- 輸出固定格式 `FinalRecommendation` 給 D

#### C 的輸入

```json
{
  "userPreference": {
    "sweetnessMax": "微糖",
    "budgetMax": 70,
    "caffeineLimit": "low",
    "allergens": ["milk"],
    "preferredFlavors": ["清爽", "水果"],
    "timeOfDay": "night"
  },
  "candidates": [
    {
      "brand": "五十嵐",
      "name": "檸檬冬瓜",
      "price": 50,
      "caffeineLevel": "none",
      "containsMilk": false,
      "flavorTags": ["清爽", "酸甜"],
      "recommendedOrder": "微糖、少冰",
      "matchScore": 86
    }
  ]
}
```

#### Agent 1：推薦 Agent

任務：根據候選清單選出 3 個推薦選項，並說明推薦理由。

輸出格式：

```json
{
  "agent": "recommender",
  "recommendations": [
    {
      "drinkId": "wushiland_002",
      "rank": 1,
      "reason": "無咖啡因、無奶類，符合晚上飲用與乳糖限制，價格也在預算內",
      "customOrder": "微糖、少冰"
    }
  ]
}
```

#### Agent 2：質疑 Agent

任務：檢查 Agent 1 的推薦是否有問題，包含甜度、咖啡因、過敏原、價格與使用者偏好。

輸出格式：

```json
{
  "agent": "critic",
  "criticNotes": [
    {
      "drinkId": "wushiland_002",
      "issue": "冬瓜基底可能偏甜",
      "severity": "medium",
      "suggestion": "提醒使用者點微糖，或改選水果茶類"
    }
  ],
  "alternativeSuggestions": [
    {
      "drinkId": "yimuri_003",
      "reason": "同樣無咖啡因，但甜感可能較低"
    }
  ]
}
```

#### Agent 3：裁判 Agent

任務：整合推薦 Agent 和質疑 Agent 的結果，產生最終最佳推薦。

輸出格式：

```json
{
  "agent": "judge",
  "bestChoiceId": "yimuri_003",
  "decisionReason": "相較於冬瓜類飲品，該飲品更符合清爽、低咖啡因、低甜感與無奶限制",
  "finalCustomOrder": "微糖、少冰"
}
```

#### C 的最終輸出：`FinalRecommendation`

```json
{
  "bestChoice": {
    "id": "yimuri_003",
    "brand": "一沐日",
    "name": "荔枝蘆薈",
    "customOrder": "微糖、少冰",
    "price": 65,
    "reason": "符合低咖啡因、無奶、清爽水果風味與70元預算限制"
  },
  "alternatives": [
    {
      "id": "wushiland_002",
      "brand": "五十嵐",
      "name": "檸檬冬瓜",
      "customOrder": "微糖、少冰",
      "price": 50,
      "reason": "無咖啡因且價格較低，但冬瓜基底可能偏甜"
    }
  ],
  "criticNotes": [
    "已排除奶茶、奶蓋與鮮奶類飲品",
    "已排除中高咖啡因茶類",
    "冬瓜類飲品即使微糖仍可能偏甜"
  ],
  "notRecommended": [
    {
      "name": "熟成紅茶",
      "reason": "紅茶含咖啡因，晚上低咖啡因需求下不建議"
    },
    {
      "name": "珍珠鮮奶茶",
      "reason": "含奶且咖啡因偏高，不符合限制"
    }
  ],
  "agentTrace": {
    "recommenderSummary": "推薦無咖啡因、無奶且價格在預算內的飲品",
    "criticSummary": "提醒冬瓜基底偏甜，並建議選擇水果茶類",
    "judgeSummary": "最終選擇清爽水果風味且限制符合度最高的飲品"
  }
}
```

---

### D：前端 UI 與整合

負責使用者輸入、API 串接與結果呈現。

#### D 要做的事

- 設計使用者輸入表單
- 支援自然語言輸入與表單條件
- 呼叫後端推薦 API
- 顯示最佳推薦、備選、不推薦原因與 Agent 討論摘要
- 準備 demo 畫面與簡報截圖

#### D 的輸入欄位

| 欄位 | 型別 | 說明 |
|---|---|---|
| `query` | string | 使用者自然語言需求 |
| `sweetnessMax` | string | 最高可接受甜度 |
| `icePreference` | string | 冰量偏好 |
| `budgetMax` | number | 預算上限 |
| `caffeineLimit` | string | 咖啡因限制 |
| `allergens` | string[] | 過敏原 |
| `avoidIngredients` | string[] | 不想攝取的成分 |
| `preferredFlavors` | string[] | 喜歡的風味 |
| `dislikedFlavors` | string[] | 不喜歡的風味 |
| `timeOfDay` | string | 飲用時間 |
| `brandPreference` | string[] | 品牌偏好 |

#### D 呼叫 API

```http
POST /api/recommend
Content-Type: application/json
```

Request body：

```json
{
  "query": "晚上不想喝太多咖啡因，不要太甜，預算70元內，不能喝牛奶，預算70元內",
  "sweetnessMax": "微糖",
  "icePreference": "少冰",
  "budgetMax": 70,
  "caffeineLimit": "low",
  "allergens": ["milk"],
  "avoidIngredients": ["牛奶", "奶精", "奶蓋"],
  "preferredFlavors": ["清爽", "水果"],
  "dislikedFlavors": ["太甜", "太濃", "奶味"],
  "timeOfDay": "night",
  "brandPreference": []
}
```

Response body：

```json
{
  "bestChoice": {
    "id": "yimuri_003",
    "brand": "一沐日",
    "name": "荔枝蘆薈",
    "customOrder": "微糖、少冰",
    "price": 65,
    "reason": "符合低咖啡因、無奶、清爽水果風味與70元預算限制"
  },
  "alternatives": [],
  "criticNotes": [],
  "notRecommended": [],
  "agentTrace": {
    "recommenderSummary": "推薦無咖啡因、無奶且價格在預算內的飲品",
    "criticSummary": "提醒部分飲品甜度風險",
    "judgeSummary": "最終選擇限制符合度最高的飲品"
  }
}
```

#### 結果頁建議區塊

1. 最佳推薦
2. 客製化點法
3. 推薦理由
4. 備選飲料
5. 不推薦飲料與原因
6. Agent 討論摘要
7. 條件符合度標籤，例如低咖啡因、無奶、預算內內

---

## 5. API 設計

### `POST /api/recommend`

#### 功能

根據使用者需求產生最終飲料推薦。

#### Request

格式：`UserPreference`

```json
{
  "query": "string",
  "sweetnessMax": "string",
  "icePreference": "string",
  "budgetMax": 70,
  "caffeineLimit": "none | low | medium | high | no_limit",
  "allergens": ["string"],
  "avoidIngredients": ["string"],
  "preferredFlavors": ["string"],
  "dislikedFlavors": ["string"],
  "timeOfDay": "morning | afternoon | night",
  "brandPreference": ["string"]
}
```

#### Internal Flow

```text
1. Receive UserPreference
2. Load drinks.json
3. Convert UserPreference to FilterConfig
4. Filter Drink[] into CandidateDrink[]
5. Run multi-agent recommendation
6. Return FinalRecommendation
```

#### Response

格式：`FinalRecommendation`

```json
{
  "bestChoice": {},
  "alternatives": [],
  "criticNotes": [],
  "notRecommended": [],
  "agentTrace": {}
}
```

---

## 6. 建議資料夾結構

```text
taiwan-drink-ai-recommender/
├── README.md
├── data/
│   └── drinks.json
├── src/
│   ├── app/
│   │   └── page.tsx
│   ├── api/
│   │   └── recommend.ts
│   ├── types/
│   │   └── schema.ts
│   ├── lib/
│   │   ├── filterEngine.ts
│   │   ├── drinkRepository.ts
│   │   └── agentPipeline.ts
│   └── components/
│       ├── PreferenceForm.tsx
│       └── RecommendationResult.tsx
└── docs/
    ├── demo-cases.md
    └── prompts.md
```

---

## 7. TypeScript 型別草案

```ts
export type CaffeineLevel = "none" | "low" | "medium" | "high" | "no_limit";

export interface UserPreference {
  query?: string;
  sweetnessMax?: string;
  icePreference?: string;
  budgetMax?: number;
  caffeineLimit?: CaffeineLevel;
  allergens?: string[];
  avoidIngredients?: string[];
  preferredFlavors?: string[];
  dislikedFlavors?: string[];
  timeOfDay?: "morning" | "afternoon" | "night";
  brandPreference?: string[];
}

export interface Drink {
  id: string;
  brand: string;
  name: string;
  category: string;
  base: string;
  price: number;
  caffeineLevel: Exclude<CaffeineLevel, "no_limit">;
  containsMilk: boolean;
  ingredients: string[];
  allergens: string[];
  availableSweetness: string[];
  availableIce: string[];
  flavorTags: string[];
  healthTags?: string[];
  note?: string;
}

export interface CandidateDrink extends Drink {
  recommendedOrder: string;
  matchScore: number;
  matchedReasons: string[];
  warnings: string[];
}

export interface FinalRecommendation {
  bestChoice: {
    id: string;
    brand: string;
    name: string;
    customOrder: string;
    price: number;
    reason: string;
  };
  alternatives: Array<{
    id: string;
    brand: string;
    name: string;
    customOrder: string;
    price: number;
    reason: string;
  }>;
  criticNotes: string[];
  notRecommended: Array<{
    name: string;
    reason: string;
  }>;
  agentTrace: {
    recommenderSummary: string;
    criticSummary: string;
    judgeSummary: string;
  };
}
```

---

## 8. 開發順序

### Step 1：先定 schema

四個人先確認以下格式：

- `Drink`
- `UserPreference`
- `CandidateDrink`
- `FinalRecommendation`

### Step 2：A 建立測試資料

先建立 10～20 筆 `drinks.json`，讓 B、C、D 可以開始測。

### Step 3：D 建立前端假資料版

D 先不用等後端，直接用假 `FinalRecommendation` 做結果頁。

### Step 4：B 完成規則篩選

B 使用 A 的 `drinks.json` 與 D 的 `UserPreference`，輸出 `CandidateDrink[]`。

### Step 5：C 完成三 Agent pipeline

C 使用 `CandidateDrink[]` 與 `UserPreference`，輸出 `FinalRecommendation`。

### Step 6：D 串接 API

D 呼叫 `/api/recommend`，顯示後端回傳結果。

---

## 9. Demo Cases

### Case 1：晚上低咖啡因

輸入：

```text
晚上 9 點，不想攝取太多咖啡因，想喝清爽一點，預算 70 元內。
```

預期：

- 排除紅茶、綠茶、烏龍茶、奶茶
- 推薦無咖啡因或低咖啡因飲品
- 點法建議微糖或無糖

### Case 2：乳糖不耐

輸入：

```text
我不能喝牛奶，但想喝有奶茶口感的飲料。
```

預期：

- 排除鮮奶茶、奶蓋、奶精
- 推薦無奶替代方案
- 提醒使用者確認店家是否有植物奶選項

### Case 3：預算限制

輸入：

```text
我只想花 60 元以內，不要太甜，預算 70 元內。
```

預期：

- 排除超過 60 元品項
- 推薦低價且甜度可調飲品

### Case 4：過敏原限制

輸入：

```text
我對堅果過敏，想喝水果類，不要奶。
```

預期：

- 排除可能含堅果或奶類品項
- 推薦水果茶或無奶飲品
- 輸出過敏原提醒

---

## 10. 專案亮點

- 不讓 LLM 直接亂編推薦，而是先根據資料庫與規則篩選
- 過敏原、咖啡因、價格等限制使用硬性規則處理
- 使用三 Agent 對抗式流程提高推薦可靠性
- 結果可解釋，包含推薦理由、質疑點與最終裁判理由
- 題目貼近台灣生活場景，容易展示與理解

---

## 11. 注意事項

本系統僅作為飲料推薦與資訊整理工具，資料可能不完整或因店家調整而變動。若涉及嚴重過敏原或健康限制，使用者仍應自行向店家確認實際成分。
