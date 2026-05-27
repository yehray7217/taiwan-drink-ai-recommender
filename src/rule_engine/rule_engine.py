#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
B 模組：台灣手搖飲 AI 推薦系統 - 規則引擎與硬性篩選

功能：
1. 讀取 drinks.json
2. 讀取 UserPreference
3. 產生 FilterConfig
4. 進行硬性篩選：預算、咖啡因、過敏原、避免成分、無奶需求
5. 進行軟性評分：甜度、冰量、口味偏好、不喜歡口味、晚上低咖啡因
6. 固定甜不硬性排除，只加 warning 並降低優先序
7. 輸出：
   - candidates：完整候選池，給 C Agent 使用
   - topCandidates：品牌多樣性 Top K，給前端/demo 顯示
   - notRecommended：被硬性排除的飲料與原因

執行範例：
python src/rule_engine.py --drinks data/drinks.json --preference test_preference.json --output filter_result.json
"""

import argparse
import json
import os
from typing import Any, Dict, List, Optional, Tuple
import warnings


# =========================
# 甜度轉百分比
# =========================

SWEETNESS_PERCENT = {
    "無糖": 0,
    "0糖": 0,
    "0%": 0,
    "微糖": 30,
    "三分糖": 30,
    "三分甜": 30,
    "3分糖": 30,
    "3分甜": 30,
    "30%": 30,
    "半糖": 50,
    "五分糖": 50,
    "五分甜": 50,
    "5分糖": 50,
    "5分甜": 50,
    "50%": 50,
    "少糖": 70,
    "七分糖": 70,
    "七分甜": 70,
    "7分糖": 70,
    "7分甜": 70,
    "70%": 70,
    "八分糖": 80,
    "八分甜": 80,
    "8分糖": 80,
    "8分甜": 80,
    "80%": 80,
    "正常": 100,
    "正常糖": 100,
    "正常甜": 100,
    "全糖": 100,
    "100%": 100,
}

FIXED_SWEETNESS = {"固定甜"}


# =========================
# 咖啡因等級
# =========================

CAFFEINE_RANK = {
    "none": 0,
    "無": 0,
    "無咖啡因": 0,
    "low": 1,
    "低": 1,
    "低咖啡因": 1,
    "medium": 2,
    "中": 2,
    "中等": 2,
    "high": 3,
    "高": 3,
}


# =========================
# 自然語句關鍵字抽取
# =========================
# 說明：
# 前端會送 UserPreference.query，例如「想喝珍珠」、「我要波霸」、「不要珍珠」。
# 原本規則引擎幾乎沒有使用 query，因此只打自然語句時，珍珠不會被轉成 preferredFlavors。
# 這裡把常見配料/口味字詞轉成軟性偏好，讓「要珍珠」可以命中資料中的「珍珠」與「波霸」。

QUERY_PREFERENCE_SYNONYMS = {
    "珍珠": ["珍珠", "波霸", "粉圓", "boba", "Boba", "tapioca", "咀嚼感"],
    "波霸": ["波霸", "珍珠", "粉圓", "boba", "Boba", "tapioca", "咀嚼感"],
    "粉圓": ["粉圓", "珍珠", "波霸", "boba", "Boba", "tapioca", "咀嚼感"],
    "椰果": ["椰果", "咀嚼感"],
    "茶凍": ["茶凍", "凍", "咀嚼感"],
    "仙草": ["仙草", "仙草凍", "咀嚼感"],
    "布丁": ["布丁", "咀嚼感"],
    "奶蓋": ["奶蓋", "奶霜", "起司奶蓋", "鹹奶蓋"],
    "檸檬": ["檸檬", "酸甜", "水果", "清爽"],
    "水果": ["水果", "果茶", "清爽", "酸甜"],
    "清爽": ["清爽", "茶感", "水果"],
    "茶感": ["茶感", "純茶", "紅茶", "綠茶", "青茶", "烏龍茶"],
}

NEGATION_PREFIXES = [
    "不要", "不想要", "不想", "不喝", "避免", "不加", "去掉", "無", "不含"
]


def unique_keep_order(items: List[str]) -> List[str]:
    seen = set()
    result = []
    for item in items:
        item = str(item).strip()
        if not item or item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


def query_has_negated_term(query: str, terms: List[str]) -> bool:
    compact_query = query.replace(" ", "")
    for term in terms:
        term = str(term).strip()
        if not term:
            continue
        for prefix in NEGATION_PREFIXES:
            if f"{prefix}{term}" in compact_query:
                return True
    return False


def query_has_positive_term(query: str, terms: List[str]) -> bool:
    query_lower = query.lower()
    for term in terms:
        term = str(term).strip()
        if term and term.lower() in query_lower:
            return True
    return False


def extract_query_preferences(preference: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    從自然語句 query 裡抽出偏好。

    例如：
    - query = "我想喝珍珠" -> preferredFlavors / requestedIngredients 加入 珍珠、波霸、粉圓
    - query = "不要珍珠" -> dislikedFlavors / avoidIngredients 加入 珍珠、波霸、粉圓
    """
    query = str(preference.get("query", "") or "")

    preferred_flavors: List[str] = []
    disliked_flavors: List[str] = []
    requested_ingredients: List[str] = []
    avoid_ingredients: List[str] = []

    for canonical, synonyms in QUERY_PREFERENCE_SYNONYMS.items():
        terms = unique_keep_order([canonical] + synonyms)
        if not query_has_positive_term(query, terms):
            continue

        if query_has_negated_term(query, terms):
            disliked_flavors.extend(terms)
            avoid_ingredients.extend(terms)
        else:
            preferred_flavors.extend(terms)
            # 配料類需求要比一般口味偏好更強，例如「要珍珠」應該優先推有珍珠/波霸的品項。
            if canonical in {"珍珠", "波霸", "粉圓", "椰果", "茶凍", "仙草", "布丁", "奶蓋"}:
                requested_ingredients.extend(terms)

    return {
        "preferredFlavors": unique_keep_order(preferred_flavors),
        "dislikedFlavors": unique_keep_order(disliked_flavors),
        "requestedIngredients": unique_keep_order(requested_ingredients),
        "avoidIngredients": unique_keep_order(avoid_ingredients),
    }


def contains_any_text(search_text: str, terms: List[str]) -> List[str]:
    search_lower = search_text.lower()
    hits = []
    for term in terms:
        term = str(term).strip()
        if term and term.lower() in search_lower:
            hits.append(term)
    return unique_keep_order(hits)


def load_json(path: str) -> Any:
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"找不到 {path}。請確認你在 repo 根目錄執行，且檔案存在。"
        )

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def save_json(data: Any, path: str) -> None:
    output_dir = os.path.dirname(path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def normalize_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x) for x in value]
    return [str(value)]


def get_first_existing(d: Dict[str, Any], keys: List[str], default: Any = None) -> Any:
    for key in keys:
        if key in d and d[key] is not None:
            return d[key]
    return default


def get_price_max(preference: Dict[str, Any]) -> Optional[int]:
    value = get_first_existing(preference, ["budgetMax", "maxPrice", "priceMax", "max_price"])
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def get_caffeine_limit(preference: Dict[str, Any]) -> str:
    # 支援兩種格式：
    # 1. caffeineLimit: "low"
    # 2. lowCaffeine: true
    direct = get_first_existing(preference, ["caffeineLimit", "caffeineMax"])
    if direct:
        return str(direct)

    if preference.get("lowCaffeine") is True:
        return "low"

    return "no_limit"


def get_sweetness_max(preference: Dict[str, Any]) -> Optional[str]:
    return get_first_existing(preference, ["sweetnessMax", "sweetness_max"])


def get_ice_preference(preference: Dict[str, Any]) -> Optional[str]:
    return get_first_existing(preference, ["icePreference", "ice_preference"])


def get_no_milk(preference: Dict[str, Any]) -> bool:
    if preference.get("noMilk") is True or preference.get("no_milk") is True:
        return True

    allergens = normalize_list(get_first_existing(preference, ["allergens", "avoidAllergens"], []))
    avoid_ingredients = normalize_list(get_first_existing(preference, ["avoidIngredients", "avoid_ingredients"], []))

    milk_terms = {"milk", "牛奶", "鮮乳", "奶精", "奶蓋", "奶類", "乳製品"}
    if any(x in milk_terms for x in allergens):
        return True
    if any(x in milk_terms for x in avoid_ingredients):
        return True

    return False


def build_filter_config(preference: Dict[str, Any]) -> Dict[str, Any]:
    query_preferences = extract_query_preferences(preference)

    allergens = normalize_list(get_first_existing(preference, ["allergens", "avoidAllergens"], []))
    avoid_ingredients = normalize_list(
        get_first_existing(preference, ["avoidIngredients", "avoid_ingredients"], [])
    )
    avoid_ingredients = unique_keep_order(avoid_ingredients + query_preferences["avoidIngredients"])

    preferred_flavors = unique_keep_order(
        normalize_list(preference.get("preferredFlavors", []))
        + query_preferences["preferredFlavors"]
    )
    disliked_flavors = unique_keep_order(
        normalize_list(preference.get("dislikedFlavors", []))
        + query_preferences["dislikedFlavors"]
    )

    price_max = get_price_max(preference)
    caffeine_limit = get_caffeine_limit(preference)

    return {
        "userQuery": str(preference.get("query", "") or ""),
        "queryPreferences": query_preferences,
        "mustExclude": {
            "allergens": allergens,
            "ingredients": avoid_ingredients,
            "noMilk": get_no_milk(preference),
        },
        "mustMatch": {
            "priceMax": price_max,
            "caffeineMax": caffeine_limit,
        },
        "softPreferences": {
            "sweetnessMax": get_sweetness_max(preference),
            "icePreference": get_ice_preference(preference),
            "preferredFlavors": preferred_flavors,
            "dislikedFlavors": disliked_flavors,
            "requestedIngredients": query_preferences["requestedIngredients"],
            "timeOfDay": preference.get("timeOfDay"),
            "brandPreference": normalize_list(preference.get("brandPreference", [])),
            "topK": int(preference.get("topK", 5)),
            "maxSameBrandInTopK": int(preference.get("maxSameBrandInTopK", 1)),
        },
    }


def caffeine_value(level: Any) -> int:
    return CAFFEINE_RANK.get(str(level), 99)


def sweetness_value(label: str) -> Optional[int]:
    return SWEETNESS_PERCENT.get(str(label))


def get_drink_allergens(drink: Dict[str, Any]) -> List[str]:
    return normalize_list(drink.get("allergens", []))


def get_drink_ingredients(drink: Dict[str, Any]) -> List[str]:
    return normalize_list(drink.get("ingredients", []))


def drink_contains_milk(drink: Dict[str, Any]) -> bool:
    if drink.get("containsMilk") is True or drink.get("contains_milk") is True:
        return True

    allergens = get_drink_allergens(drink)
    ingredients = get_drink_ingredients(drink)
    health_tags = normalize_list(drink.get("healthTags", []))

    milk_terms = ["milk", "牛奶", "鮮乳", "奶精", "奶蓋", "奶類", "乳製品", "含奶", "歐蕾", "拿鐵"]

    combined = allergens + ingredients + health_tags + [
        str(drink.get("name", "")),
        str(drink.get("category", "")),
        str(drink.get("base", "")),
    ]

    return any(any(term in item for term in milk_terms) for item in combined)


def check_hard_rules(drink: Dict[str, Any], filter_config: Dict[str, Any]) -> List[str]:
    reasons = []

    must_exclude = filter_config["mustExclude"]
    must_match = filter_config["mustMatch"]

    price_max = must_match.get("priceMax")
    drink_price = drink.get("price")
    if price_max is not None and drink_price is not None:
        try:
            if int(drink_price) > int(price_max):
                reasons.append(f"價格 {drink_price} 元超過預算 {price_max} 元")
        except (TypeError, ValueError):
            reasons.append("價格欄位格式錯誤")

    caffeine_max = must_match.get("caffeineMax", "no_limit")
    if caffeine_max != "no_limit":
        drink_caffeine = drink.get("caffeineLevel", drink.get("caffeine_level", "unknown"))
        if caffeine_value(drink_caffeine) > caffeine_value(caffeine_max):
            reasons.append(f"咖啡因為 {drink_caffeine}，超過限制 {caffeine_max}")

    avoid_allergens = set(must_exclude.get("allergens", []))
    drink_allergens = set(get_drink_allergens(drink))
    hit_allergens = avoid_allergens & drink_allergens
    if hit_allergens:
        reasons.append(f"含過敏原：{', '.join(sorted(hit_allergens))}")

    avoid_ingredients = must_exclude.get("ingredients", [])
    drink_ingredients = get_drink_ingredients(drink)
    hit_ingredients = []
    for avoid in avoid_ingredients:
        for ingredient in drink_ingredients:
            if avoid and avoid in ingredient:
                hit_ingredients.append(avoid)

    if hit_ingredients:
        reasons.append(f"含避免成分：{', '.join(sorted(set(hit_ingredients)))}")

    if must_exclude.get("noMilk") and drink_contains_milk(drink):
        reasons.append("含奶類，不符合不能喝牛奶/無奶需求")

    return reasons


def choose_sweetness(
    available_sweetness: List[str],
    sweetness_max: Optional[str],
) -> Tuple[Optional[str], List[str], int]:
    """
    回傳：
    recommended_sweetness, warnings, score_delta

    固定甜：不硬性排除，但 warning 並扣分。
    """
    warnings = []
    score_delta = 0

    if not available_sweetness:
        return None, ["沒有甜度資料"], -5

    # 沒有使用者甜度限制時，優先選正常，沒有就選第一個
    if not sweetness_max:
        for candidate in ["正常", "正常甜", "全糖", "少糖", "半糖", "五分糖", "微糖", "三分糖", "無糖"]:
            if candidate in available_sweetness:
                return candidate, warnings, score_delta
        if available_sweetness[0] in FIXED_SWEETNESS:
            return available_sweetness[0], ["固定甜，糖量無法調整"], -10
        return available_sweetness[0], warnings, score_delta

    max_value = sweetness_value(sweetness_max)

    # 使用者給的是未知甜度，嘗試直接找字串
    if max_value is None:
        if sweetness_max in available_sweetness:
            return sweetness_max, warnings, score_delta
        if any(x in FIXED_SWEETNESS for x in available_sweetness):
            return "固定甜", ["固定甜，糖量無法調整"], -15
        return available_sweetness[0], [f"無法解析甜度上限：{sweetness_max}"], -5

    valid_options = []
    fixed_options = []

    for s in available_sweetness:
        if s in FIXED_SWEETNESS:
            fixed_options.append(s)
            continue

        value = sweetness_value(s)
        if value is not None and value <= max_value:
            valid_options.append((value, s))

    if valid_options:
        # 選最接近上限者，例如上限微糖就選微糖/三分糖
        valid_options.sort(key=lambda x: x[0], reverse=True)
        selected_value, selected_label = valid_options[0]
        return selected_label, warnings, score_delta + 5

    if fixed_options:
        return fixed_options[0], ["固定甜，可能不適合低甜度需求"], -15

    return available_sweetness[0], [f"沒有符合 {sweetness_max} 以下的甜度選項"], -10


def choose_ice(available_ice: List[str], ice_preference: Optional[str]) -> Tuple[Optional[str], List[str], int]:
    warnings = []
    score_delta = 0

    if not available_ice:
        return None, ["沒有冰量資料"], -3

    if ice_preference and ice_preference in available_ice:
        return ice_preference, warnings, 5

    if ice_preference and ice_preference not in available_ice:
        warnings.append(f"無法選擇 {ice_preference}，改用 {available_ice[0]}")
        return available_ice[0], warnings, -3

    for candidate in ["少冰", "微冰", "去冰", "正常冰"]:
        if candidate in available_ice:
            return candidate, warnings, score_delta

    return available_ice[0], warnings, score_delta


def score_soft_rules(drink: Dict[str, Any], filter_config: Dict[str, Any]) -> Dict[str, Any]:
    soft = filter_config["softPreferences"]

    score = 50
    matched_reasons = []
    warnings = []

    caffeine_level = drink.get("caffeineLevel", drink.get("caffeine_level", "unknown"))
    if caffeine_value(caffeine_level) == 0:
        score += 20
        matched_reasons.append("無咖啡因")
    elif caffeine_value(caffeine_level) == 1:
        score += 12
        matched_reasons.append("低咖啡因")
    elif caffeine_value(caffeine_level) == 2:
        warnings.append("含中等咖啡因")
    elif caffeine_value(caffeine_level) >= 3:
        score -= 15
        warnings.append("含高咖啡因")

    if soft.get("timeOfDay") == "night":
        if caffeine_value(caffeine_level) == 0:
            score += 8
            matched_reasons.append("適合晚上飲用")
        elif caffeine_value(caffeine_level) >= 2:
            score -= 10
            warnings.append("晚上飲用可能影響睡眠")

    if not drink_contains_milk(drink):
        score += 10
        matched_reasons.append("無奶類")

    price = drink.get("price")
    price_max = filter_config["mustMatch"].get("priceMax")
    if price_max is not None and price is not None:
        try:
            if int(price) <= int(price_max):
                score += 5
                matched_reasons.append(f"符合{price_max}元以內")
        except (TypeError, ValueError):
            pass

    available_sweetness = normalize_list(drink.get("availableSweetness", drink.get("sweetness_options", [])))
    sweetness, sweetness_warnings, sweetness_delta = choose_sweetness(
        available_sweetness,
        soft.get("sweetnessMax"),
    )
    score += sweetness_delta
    warnings.extend(sweetness_warnings)

    if sweetness:
        if sweetness == "固定甜":
            matched_reasons.append("甜度固定")
        else:
            matched_reasons.append(f"可點 {sweetness}")

    available_ice = normalize_list(drink.get("availableIce", drink.get("ice_options", [])))
    ice, ice_warnings, ice_delta = choose_ice(available_ice, soft.get("icePreference"))
    score += ice_delta
    warnings.extend(ice_warnings)

    if ice:
        matched_reasons.append(f"可點 {ice}")

    query = str(filter_config.get("userQuery", "") or "")
    requested = normalize_list(soft.get("requestedIngredients", []))
    preferred = normalize_list(soft.get("preferredFlavors", []))
    disliked = normalize_list(soft.get("dislikedFlavors", []))

    search_fields = [
        str(drink.get("name", "")),
        str(drink.get("brand", "")),
        str(drink.get("category", "")),
        str(drink.get("base", "")),
    ]
    search_fields += normalize_list(drink.get("ingredients", []))
    search_fields += normalize_list(drink.get("flavorTags", []))
    search_fields += normalize_list(drink.get("healthTags", []))

    search_text = " ".join(search_fields)

    # 指定配料比一般偏好更強。
    # 例如使用者輸入「要珍珠」，資料裡的「珍珠奶茶」與「波霸奶茶」都應該大幅加分。
    hit_requested = contains_any_text(search_text, requested)
    if requested:
        if hit_requested:
            score += 45 + 8 * min(3, len(hit_requested))
            matched_reasons.append(f"符合指定配料：{', '.join(hit_requested[:4])}")
        else:
            score -= 35
            warnings.append(f"未包含指定配料：{', '.join(requested[:3])}")

    hit_preferred = contains_any_text(search_text, preferred)

    if hit_preferred:
        score += 12 * len(set(hit_preferred))
        matched_reasons.append(f"符合偏好：{', '.join(sorted(set(hit_preferred)))}")

    hit_disliked = contains_any_text(search_text, disliked)

    if hit_disliked:
        score -= 12 * len(set(hit_disliked))
        warnings.append(f"包含不喜歡項目：{', '.join(sorted(set(hit_disliked)))}")

    brand_preference = set(soft.get("brandPreference", []))
    if brand_preference and drink.get("brand") in brand_preference:
        score += 8
        matched_reasons.append("符合品牌偏好")

    recommended_order_parts = []
    if sweetness:
        recommended_order_parts.append(sweetness)
    if ice:
        recommended_order_parts.append(ice)

    enriched = dict(drink)
    enriched["recommendedOrder"] = "、".join(recommended_order_parts) if recommended_order_parts else "依店家預設"
    enriched["matchScore"] = max(0, min(100, int(score)))
    enriched["matchedReasons"] = matched_reasons
    enriched["warnings"] = list(dict.fromkeys(warnings))

    return enriched

def format_candidate_drink(drink):
    return {
        "id": drink.get("id"),
        "brand": drink.get("brand"),
        "name": drink.get("name"),
        "price": drink.get("price"),
        "caffeineLevel": drink.get("caffeineLevel"),
        "containsMilk": drink.get("containsMilk"),
        "ingredients": drink.get("ingredients", []),
        "allergens": drink.get("allergens", []),
        "availableSweetness": drink.get("availableSweetness", []),
        "availableIce": drink.get("availableIce", []),
        "flavorTags": drink.get("flavorTags", []),
        "recommendedOrder": drink.get("recommendedOrder"),
        "matchScore": drink.get("matchScore", 0),
        "matchedReasons": drink.get("matchedReasons", []),
        "warnings": drink.get("warnings", [])
    }

def diversify_by_brand(candidates, top_k=5, max_same_brand=1):
    """
    嚴格品牌多樣性：
    同品牌超過限制就不再加入。
    如果品牌數不足，寧可少於 top_k，也不要洗版。
    """

    sorted_candidates = sorted(
        candidates,
        key=lambda x: x.get("matchScore", 0),
        reverse=True
    )

    selected = []
    brand_count = {}

    for drink in sorted_candidates:
        brand = drink.get("brand", "unknown")

        if brand_count.get(brand, 0) >= max_same_brand:
            continue

        selected.append(drink)
        brand_count[brand] = brand_count.get(brand, 0) + 1

        if len(selected) >= top_k:
            break

    return selected


def filter_drinks(drinks: List[Dict[str, Any]], preference: Dict[str, Any]) -> Dict[str, Any]:
    filter_config = build_filter_config(preference)

    candidates = []
    not_recommended = []

    for drink in drinks:
        hard_reasons = check_hard_rules(drink, filter_config)

        if hard_reasons:
            not_recommended.append({
                "id": drink.get("id"),
                "brand": drink.get("brand"),
                "name": drink.get("name"),
                "price": drink.get("price"),
                "caffeineLevel": drink.get("caffeineLevel", drink.get("caffeine_level")),
                "containsMilk": drink.get("containsMilk", drink.get("contains_milk")),
                "reason": "；".join(hard_reasons),
                "reasons": hard_reasons,
            })
            continue

        enriched = score_soft_rules(drink, filter_config)
        candidates.append(enriched)

    candidates.sort(
        key=lambda x: (
            x.get("matchScore", 0),
            -len(x.get("warnings", [])),
            -int(x.get("price", 999999)) if str(x.get("price", "")).isdigit() else 0,
        ),
        reverse=True,
    )

    soft = filter_config["softPreferences"]
    top_k = int(soft.get("topK", 5))
    max_same_brand = int(soft.get("maxSameBrandInTopK", 1))

    # 如果使用者明確指定配料，例如「要珍珠」，不要再用品牌多樣性把同品牌珍珠品項過濾掉。
    # 否則資料庫裡若只有某一個品牌有珍珠/波霸，topCandidates 可能只剩一筆珍珠，其它反而變成非珍珠飲料。
    if soft.get("requestedIngredients"):
        top_candidates = candidates[:top_k]
    else:
        top_candidates = diversify_by_brand(
            candidates,
            top_k=top_k,
            max_same_brand=max_same_brand,
        )

    return {
        "userPreference": preference,
        "filterConfig": filter_config,
        "candidates": candidates,
        "topCandidates": top_candidates,
        "notRecommended": not_recommended,
        "summary": {
            "totalDrinks": len(drinks),
            "candidateCount": len(candidates),
            "topCandidateCount": len(top_candidates),
            "notRecommendedCount": len(not_recommended),
            "topCandidateIds": [d.get("id") for d in top_candidates],
            "topCandidateBrands": [d.get("brand") for d in top_candidates],
        },
    }


def default_preference() -> Dict[str, Any]:
    return {
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
        "brandPreference": [],
        "topK": 5,
        "maxSameBrandInTopK": 1,
    }


def print_result(result: Dict[str, Any]) -> None:
    summary = result["summary"]

    print("\n=== B 規則引擎篩選結果 ===")
    print(f"總飲料數：{summary['totalDrinks']}")
    print(f"候選飲料：{summary['candidateCount']}")
    print(f"多樣性 Top：{summary['topCandidateCount']}")
    print(f"排除飲料：{summary['notRecommendedCount']}")

    print("\n=== Top candidates 給前端顯示 / C Agent 優先參考 ===")
    display_candidates = result.get("topCandidates", [])[:5]

    if not display_candidates:
        print("\n沒有飲料符合所有硬性條件。可以考慮放寬咖啡因、甜度、品牌或過敏原限制。")
        return

    for i, drink in enumerate(display_candidates, start=1):
        print(
            f"{i}. {drink.get('brand')} - {drink.get('name')} ｜"
            f"{drink.get('price')}元｜score={drink.get('matchScore')}｜"
            f"點法：{drink.get('recommendedOrder')}"
        )
        if drink.get("matchedReasons"):
            print(f"   理由：{'、'.join(drink['matchedReasons'])}")
        if drink.get("warnings"):
            print(f"   注意：{'、'.join(drink['warnings'])}")


def main() -> None:
    parser = argparse.ArgumentParser(description="台灣手搖飲 AI 推薦系統 - B 規則引擎")
    parser.add_argument("--drinks", default="data/drinks.json", help="飲料資料庫 JSON 路徑")
    parser.add_argument("--preference", default=None, help="UserPreference JSON 路徑")
    parser.add_argument("--output", default="filter_result.json", help="輸出 JSON 路徑")
    args = parser.parse_args()

    drinks = load_json(args.drinks)

    if args.preference:
        preference = load_json(args.preference)
    else:
        preference = default_preference()

    result = filter_drinks(drinks, preference)

    formatted_candidates = [
        format_candidate_drink(d)
        for d in result.get("candidates", [])
    ]

    formatted_top_candidates = [
        format_candidate_drink(d)
        for d in result.get("topCandidates", [])
    ]

    formatted_not_recommended = result.get("notRecommended", [])

    result = {
        "userPreference": result.get("userPreference", preference),
        "filterConfig": result.get("filterConfig", {}),
        "candidates": formatted_candidates,
        "topCandidates": formatted_top_candidates,
        "notRecommended": formatted_not_recommended,
        "summary": result.get("summary", {})
    }
    save_json(result, args.output)
    print_result(result)

    print(f"\n完整輸出已寫入：{args.output}")
    print("C 模組可讀取 result['userPreference'] 與 result['candidates']。")
    print("前端/demo 請優先顯示 result['topCandidates']，避免同品牌連續洗版。")


if __name__ == "__main__":
    main()
