# B 模組：規則引擎與硬性篩選

B 模組負責將使用者需求轉換成明確的篩選規則，並從 `data/drinks.json` 中篩選出符合條件的候選飲料。  
此模組不依賴 AI 判斷，而是使用 Python 規則邏輯處理硬性條件，避免推薦到不符合預算、過敏原、奶類或咖啡因限制的飲料。

---

## 功能

B 模組主要負責：

1. 接收使用者偏好 `UserPreference`
2. 產生中間規則設定 `FilterConfig`
3. 根據硬性條件篩選飲料資料
4. 排除違反限制的飲料
5. 根據甜度、冰量、風味等條件計算 `matchScore`
6. 產生候選飲料 `candidates`
7. 產生品牌多樣化後的 `topCandidates`
8. 輸出結果給 C 模組與前端使用

---

## 輸入格式：UserPreference

```json
{
  "query": "晚上不想喝太多咖啡因，不要太甜，預算70元內，不能喝牛奶",
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

---

## 中間輸出：FilterConfig

```json
{
  "mustExclude": {
    "allergens": ["milk"],
    "ingredients": ["牛奶", "奶精", "奶蓋"],
    "noMilk": true
  },
  "mustMatch": {
    "priceMax": 70,
    "caffeineMax": "low"
  },
  "softPreferences": {
    "sweetnessMax": "微糖",
    "icePreference": "少冰",
    "preferredFlavors": ["清爽", "水果"],
    "dislikedFlavors": ["太甜", "太濃", "奶味"],
    "timeOfDay": "night",
    "brandPreference": [],
    "topK": 5,
    "maxSameBrandInTopK": 1
  }
}
```

---

## 輸出格式

B 模組最後會輸出一個 JSON 物件，包含：

```json
{
  "userPreference": {},
  "filterConfig": {},
  "candidates": [],
  "topCandidates": [],
  "notRecommended": [],
  "summary": {}
}
```

---

## CandidateDrink 格式

```json
{
  "id": "50lan_001",
  "brand": "50嵐",
  "name": "茉莉綠茶",
  "price": 30,
  "caffeineLevel": "medium",
  "containsMilk": false,
  "ingredients": ["綠茶"],
  "allergens": [],
  "availableSweetness": ["無糖", "微糖", "半糖", "少糖", "正常"],
  "availableIce": ["去冰", "微冰", "少冰", "正常冰"],
  "flavorTags": ["清爽", "茶感", "茉莉香"],
  "recommendedOrder": "微糖、少冰",
  "matchScore": 70,
  "matchedReasons": [
    "無奶類",
    "符合70元以內",
    "可點 微糖",
    "可點 少冰"
  ],
  "warnings": [
    "含中等咖啡因"
  ]
}
```

---

## 品牌多樣性處理

為了避免推薦結果全部來自同一間飲料店，B 模組會額外產生 `topCandidates`。

預設規則：

```json
{
  "topK": 5,
  "maxSameBrandInTopK": 1
}
```

---

## 與 C 模組串接方式

```js
const cInput = {
  userPref: bResult.userPreference,
  candidates: bResult.topCandidates
};
```

---

## 執行方式

```bash
python src/rule_engine.py --drinks data/drinks.json --preference test_preference.json --output filter_result.json
```

---

## B 模組設計重點

B 模組的核心精神是：

> 先用程式規則保證推薦安全與正確，再把符合條件的候選飲料交給 AI Agent 做進一步推薦。
