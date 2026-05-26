"""
auto_test_rule_engine.py

用途：
1. 自動產生多組 UserPreference 測資
2. 呼叫 B 模組 src/rule_engine.py
3. 讀取 B 輸出的 filter_result JSON
4. 自動檢查：
   - 輸出格式是否對齊
   - candidates 是否符合硬性條件
   - topCandidates 是否符合品牌多樣性
   - fixed sweet / 固定甜 是否有 warnings
   - notRecommended 是否有排除原因

使用方式：
在專案根目錄執行：

python auto_test_rule_engine.py

或指定路徑：

python auto_test_rule_engine.py --rule-engine src/rule_engine.py --drinks data/drinks.json
"""

import argparse
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path


REQUIRED_RESULT_KEYS = [
    "userPreference",
    "filterConfig",
    "candidates",
    "topCandidates",
    "notRecommended",
    "summary",
]

REQUIRED_CANDIDATE_KEYS = [
    "id",
    "brand",
    "name",
    "price",
    "caffeineLevel",
    "containsMilk",
    "ingredients",
    "allergens",
    "availableSweetness",
    "availableIce",
    "flavorTags",
    "recommendedOrder",
    "matchScore",
    "matchedReasons",
    "warnings",
]

CAFFEINE_RANK = {
    "none": 0,
    "low": 1,
    "medium": 2,
    "high": 3,
    "no_limit": 99,
}


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def generate_test_preferences():
    """
    這裡自動產生多種測資：
    - 寬鬆條件
    - 預算限制
    - 無奶 / milk 過敏
    - 晚上低咖啡因
    - 甜度低
    - 偏好水果清爽
    - 嚴格到可能沒有候選
    """
    return [
        {
            "caseName": "basic_relaxed",
            "preference": {
                "query": "一般推薦，不要太貴",
                "sweetnessMax": "微糖",
                "icePreference": "少冰",
                "budgetMax": 100,
                "caffeineLimit": "no_limit",
                "allergens": [],
                "avoidIngredients": [],
                "preferredFlavors": [],
                "dislikedFlavors": [],
                "timeOfDay": None,
                "brandPreference": [],
                "topK": 5,
                "maxSameBrandInTopK": 1,
            },
        },
        {
            "caseName": "budget_under_40",
            "preference": {
                "query": "預算40元以內，不要太甜",
                "sweetnessMax": "微糖",
                "icePreference": "少冰",
                "budgetMax": 40,
                "caffeineLimit": "no_limit",
                "allergens": [],
                "avoidIngredients": [],
                "preferredFlavors": ["清爽"],
                "dislikedFlavors": ["太甜"],
                "timeOfDay": None,
                "brandPreference": [],
                "topK": 5,
                "maxSameBrandInTopK": 1,
            },
        },
        {
            "caseName": "no_milk_allergy",
            "preference": {
                "query": "不能喝牛奶，避開奶精鮮乳",
                "sweetnessMax": "微糖",
                "icePreference": "少冰",
                "budgetMax": 70,
                "caffeineLimit": "no_limit",
                "allergens": ["milk"],
                "avoidIngredients": ["牛奶", "奶精", "鮮乳", "奶蓋"],
                "preferredFlavors": ["清爽"],
                "dislikedFlavors": ["奶味"],
                "timeOfDay": None,
                "brandPreference": [],
                "topK": 5,
                "maxSameBrandInTopK": 1,
            },
        },
        {
            "caseName": "night_low_caffeine",
            "preference": {
                "query": "晚上不想喝太多咖啡因，不要太甜，預算70元內，不能喝牛奶",
                "sweetnessMax": "微糖",
                "icePreference": "少冰",
                "budgetMax": 70,
                "caffeineLimit": "low",
                "allergens": ["milk"],
                "avoidIngredients": ["牛奶", "奶精", "鮮乳", "奶蓋"],
                "preferredFlavors": ["清爽", "水果"],
                "dislikedFlavors": ["太甜", "太濃", "奶味"],
                "timeOfDay": "night",
                "brandPreference": [],
                "topK": 5,
                "maxSameBrandInTopK": 1,
            },
        },
        {
            "caseName": "fruit_refreshing",
            "preference": {
                "query": "想喝清爽水果茶，少冰微糖，預算60內",
                "sweetnessMax": "微糖",
                "icePreference": "少冰",
                "budgetMax": 60,
                "caffeineLimit": "no_limit",
                "allergens": [],
                "avoidIngredients": [],
                "preferredFlavors": ["清爽", "水果", "酸甜"],
                "dislikedFlavors": ["奶味", "太濃"],
                "timeOfDay": None,
                "brandPreference": [],
                "topK": 5,
                "maxSameBrandInTopK": 1,
            },
        },
        {
            "caseName": "strict_impossible_or_few",
            "preference": {
                "query": "超嚴格測試：低咖啡因、無奶、30元內",
                "sweetnessMax": "無糖",
                "icePreference": "少冰",
                "budgetMax": 30,
                "caffeineLimit": "low",
                "allergens": ["milk"],
                "avoidIngredients": ["牛奶", "奶精", "鮮乳", "奶蓋", "多多"],
                "preferredFlavors": ["清爽"],
                "dislikedFlavors": ["太甜", "奶味"],
                "timeOfDay": "night",
                "brandPreference": [],
                "topK": 5,
                "maxSameBrandInTopK": 1,
            },
        },
    ]


def normalize_budget(pref):
    return pref.get("budgetMax", pref.get("maxPrice"))


def normalize_allergens(pref):
    return pref.get("allergens", pref.get("avoidAllergens", [])) or []


def normalize_avoid_ingredients(pref):
    return pref.get("avoidIngredients", []) or []


def normalize_caffeine_limit(pref):
    if "caffeineLimit" in pref:
        return pref["caffeineLimit"]
    if pref.get("lowCaffeine"):
        return "low"
    return "no_limit"


def check_result_schema(result):
    errors = []

    for key in REQUIRED_RESULT_KEYS:
        if key not in result:
            errors.append(f"缺少 result 欄位：{key}")

    for list_key in ["candidates", "topCandidates"]:
        if list_key in result and not isinstance(result[list_key], list):
            errors.append(f"{list_key} 應該是 list")

    for idx, drink in enumerate(result.get("candidates", [])):
        for key in REQUIRED_CANDIDATE_KEYS:
            if key not in drink:
                errors.append(f"candidates[{idx}] 缺少欄位：{key}")

    for idx, drink in enumerate(result.get("topCandidates", [])):
        for key in REQUIRED_CANDIDATE_KEYS:
            if key not in drink:
                errors.append(f"topCandidates[{idx}] 缺少欄位：{key}")

    return errors


def check_hard_constraints(result, pref):
    errors = []

    budget = normalize_budget(pref)
    allergens = set(normalize_allergens(pref))
    avoid_ingredients = normalize_avoid_ingredients(pref)
    caffeine_limit = normalize_caffeine_limit(pref)

    for drink in result.get("candidates", []):
        drink_name = f"{drink.get('brand')} - {drink.get('name')}"

        if budget is not None and drink.get("price", 0) > budget:
            errors.append(f"{drink_name} 超過預算：{drink.get('price')} > {budget}")

        drink_allergens = set(drink.get("allergens", []))
        hit_allergens = allergens & drink_allergens
        if hit_allergens:
            errors.append(f"{drink_name} 含過敏原：{sorted(hit_allergens)}")

        ingredients_text = " ".join(drink.get("ingredients", []))
        for avoid in avoid_ingredients:
            if avoid and avoid in ingredients_text:
                errors.append(f"{drink_name} 含避免成分：{avoid}")

        if caffeine_limit != "no_limit":
            drink_caf = drink.get("caffeineLevel", "no_limit")
            if CAFFEINE_RANK.get(drink_caf, 99) > CAFFEINE_RANK.get(caffeine_limit, 99):
                errors.append(f"{drink_name} 咖啡因超標：{drink_caf} > {caffeine_limit}")

    return errors


def check_top_candidate_diversity(result):
    errors = []

    soft = result.get("filterConfig", {}).get("softPreferences", {})
    max_same_brand = soft.get("maxSameBrandInTopK", 1)

    brands = [d.get("brand") for d in result.get("topCandidates", [])]
    counter = Counter(brands)

    for brand, count in counter.items():
        if count > max_same_brand:
            errors.append(f"topCandidates 品牌多樣性失敗：{brand} 出現 {count} 次，限制 {max_same_brand} 次")

    return errors


def check_fixed_sweetness_warning(result):
    errors = []

    for drink in result.get("candidates", []):
        sweetness = drink.get("availableSweetness", [])
        if sweetness == ["固定甜"] or "固定甜" in sweetness:
            warnings_text = " ".join(drink.get("warnings", []))
            if "固定甜" not in warnings_text:
                errors.append(f"{drink.get('brand')} - {drink.get('name')} 是固定甜但沒有 warning")

    return errors


def run_rule_engine(rule_engine_path, drinks_path, pref_path, output_path):
    cmd = [
        sys.executable,
        str(rule_engine_path),
        "--drinks",
        str(drinks_path),
        "--preference",
        str(pref_path),
        "--output",
        str(output_path),
    ]

    completed = subprocess.run(
        cmd,
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    return completed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rule-engine", default="src/rule_engine.py")
    parser.add_argument("--drinks", default="data/drinks.json")
    parser.add_argument("--workdir", default="auto_test_outputs")
    args = parser.parse_args()

    rule_engine_path = Path(args.rule_engine)
    drinks_path = Path(args.drinks)
    workdir = Path(args.workdir)

    if not rule_engine_path.exists():
        raise FileNotFoundError(f"找不到 rule engine：{rule_engine_path}")

    if not drinks_path.exists():
        raise FileNotFoundError(f"找不到 drinks.json：{drinks_path}")

    test_cases = generate_test_preferences()

    all_reports = []
    total_errors = 0

    print("\n=== Auto Test B Rule Engine ===")
    print(f"Rule engine: {rule_engine_path}")
    print(f"Drinks data : {drinks_path}")
    print(f"Test cases  : {len(test_cases)}")
    print("-" * 70)

    for case in test_cases:
        case_name = case["caseName"]
        pref = case["preference"]

        pref_path = workdir / f"{case_name}_preference.json"
        output_path = workdir / f"{case_name}_result.json"

        write_json(pref_path, pref)

        completed = run_rule_engine(
            rule_engine_path=rule_engine_path,
            drinks_path=drinks_path,
            pref_path=pref_path,
            output_path=output_path,
        )

        case_errors = []

        if completed.returncode != 0:
            case_errors.append("rule_engine.py 執行失敗")
            case_errors.append(completed.stderr.strip())
            result = None
        else:
            if not output_path.exists():
                case_errors.append("執行成功但沒有產生 output JSON")
                result = None
            else:
                result = read_json(output_path)

                case_errors.extend(check_result_schema(result))
                case_errors.extend(check_hard_constraints(result, pref))
                case_errors.extend(check_top_candidate_diversity(result))
                case_errors.extend(check_fixed_sweetness_warning(result))

        status = "PASS" if not case_errors else "FAIL"
        total_errors += len(case_errors)

        if result:
            candidate_count = len(result.get("candidates", []))
            top_count = len(result.get("topCandidates", []))
            rejected_count = len(result.get("notRecommended", []))
        else:
            candidate_count = top_count = rejected_count = 0

        print(f"[{status}] {case_name}")
        print(f"  candidates={candidate_count}, topCandidates={top_count}, notRecommended={rejected_count}")

        if case_errors:
            for err in case_errors:
                print(f"  - {err}")

        print(f"  output: {output_path}")

        all_reports.append({
            "caseName": case_name,
            "status": status,
            "candidateCount": candidate_count,
            "topCandidateCount": top_count,
            "notRecommendedCount": rejected_count,
            "errors": case_errors,
            "outputPath": str(output_path),
            "preferencePath": str(pref_path),
        })

    report_path = workdir / "auto_test_report.json"
    write_json(report_path, {
        "totalCases": len(test_cases),
        "passedCases": sum(1 for r in all_reports if r["status"] == "PASS"),
        "failedCases": sum(1 for r in all_reports if r["status"] == "FAIL"),
        "totalErrors": total_errors,
        "reports": all_reports,
    })

    print("-" * 70)
    print(f"Report saved: {report_path}")

    if total_errors == 0:
        print("All tests passed.")
        sys.exit(0)

    print(f"Some tests failed. totalErrors={total_errors}")
    sys.exit(1)


if __name__ == "__main__":
    main()
