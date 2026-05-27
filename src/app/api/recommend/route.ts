import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readFile, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { runAgentPipeline } from "../../../lib/agentPipeline";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type AnyObject = Record<string, any>;

async function runRuleEngine(userPreference: unknown) {
  const tempDir = await mkdtemp(join(tmpdir(), "drink-recommender-"));
  const preferencePath = join(tempDir, "preference.json");
  const outputPath = join(tempDir, "filter_result.json");

  try {
    await writeFile(
      preferencePath,
      JSON.stringify(userPreference, null, 2),
      "utf-8"
    );

    const pythonBin = process.env.PYTHON_BIN || "python";

    await execFileAsync(
      pythonBin,
      [
        "src/rule_engine/rule_engine.py",
        "--drinks",
        "data/drinks.json",
        "--preference",
        preferencePath,
        "--output",
        outputPath
      ],
      {
        cwd: process.cwd()
      }
    );

    const raw = await readFile(outputPath, "utf-8");
    return JSON.parse(raw);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function normalizeDrinkChoice(drink: AnyObject, index: number, prefix: string) {
  const brand = drink?.brand || "";
  const name = drink?.name || "";
  const id =
    drink?.id ||
    `${prefix}-${index}-${brand || "unknown-brand"}-${name || "unknown-name"}`;

  return {
    ...drink,
    id,
    brand: brand || "未知品牌",
    name: name || "未知飲料",
    customOrder: drink?.customOrder || drink?.recommendedOrder || "依店家預設",
    price: typeof drink?.price === "number" ? drink.price : 0,
    reason: drink?.reason || "沒有提供理由"
  };
}

function normalizeRecommendation(result: AnyObject) {
  const bestChoice = result?.bestChoice
    ? normalizeDrinkChoice(result.bestChoice, 0, "best")
    : null;

  const alternatives = Array.isArray(result?.alternatives)
    ? result.alternatives.map((drink: AnyObject, index: number) =>
        normalizeDrinkChoice(drink, index, "alternative")
      )
    : [];

  const notRecommended = Array.isArray(result?.notRecommended)
    ? result.notRecommended.map((drink: AnyObject, index: number) => ({
        ...drink,
        id:
          drink?.id ||
          `not-recommended-${index}-${drink?.name || "unknown-name"}`,
        name: drink?.name || "未知飲料",
        reason: drink?.reason || "沒有提供原因"
      }))
    : [];

  return {
    ...result,
    bestChoice,
    alternatives,
    criticNotes: Array.isArray(result?.criticNotes) ? result.criticNotes : [],
    notRecommended,
    agentTrace: {
      recommenderSummary: result?.agentTrace?.recommenderSummary || "無",
      criticSummary: result?.agentTrace?.criticSummary || "無",
      judgeSummary: result?.agentTrace?.judgeSummary || "無"
    }
  };
}

function buildNoCandidateRecommendation(filterResult: AnyObject) {
  return {
    bestChoice: null,
    alternatives: [],
    criticNotes: [
      "沒有飲料符合所有硬性條件，建議放寬預算、咖啡因或過敏原限制。"
    ],
    notRecommended: filterResult.notRecommended || [],
    agentTrace: {
      recommenderSummary: "沒有可推薦候選飲料。",
      criticSummary: "所有飲料都被硬性規則排除。",
      judgeSummary: "建議使用者放寬限制後重新查詢。"
    }
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const userPreference = await req.json();

    const filterResult = await runRuleEngine(userPreference);

    const allCandidates = Array.isArray(filterResult.candidates)
      ? filterResult.candidates
      : [];

    if (allCandidates.length === 0) {
      return NextResponse.json({
        filterResult,
        recommendation: buildNoCandidateRecommendation(filterResult)
      });
    }

    const agentCandidateLimit =
      typeof userPreference.agentCandidateLimit === "number"
        ? userPreference.agentCandidateLimit
        : 20;

    const agentCandidates = allCandidates.slice(0, agentCandidateLimit);

    const rawRecommendation = await runAgentPipeline(
      filterResult.userPreference,
      agentCandidates
    );

    const recommendation = normalizeRecommendation(rawRecommendation);

    return NextResponse.json({
      filterResult,
      recommendation
    });
  } catch (error) {
    console.error("Recommend API failed:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}