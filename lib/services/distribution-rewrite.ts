import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import type { DistributionPlatform } from "@/types/momentum";
import { z } from "zod";

export type RewriteTone = "casual" | "bold" | "story_driven";

const resultSchema = z.object({
  title: z.string().max(220),
  body: z.string().min(1).max(12000),
  hook_explanation: z.string().max(600).optional(),
});

export type RewriteResult = z.infer<typeof resultSchema>;

function stripJsonFence(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "").trim();
  }
  return t;
}

const TONE_GUIDE: Record<RewriteTone, string> = {
  casual:
    "Tone: casual — warm, conversational, natural contractions, like talking to a friend who gets it.",
  bold: "Tone: bold — confident, direct, strong verbs, clear stance; avoid hedging and filler.",
  story_driven:
    "Tone: story-driven — open with a concrete moment or tension, thread a narrative, land the takeaway.",
};

export function mockRewriteResult(
  sourceText: string,
  tone: RewriteTone | null
): RewriteResult {
  const snippet = sourceText.trim().slice(0, 280);
  const toneBit = tone ? ` (${tone.replace("_", " ")})` : "";
  return {
    title: `Sharper hook${toneBit}`,
    body: `[Demo rewrite — connect OpenAI for real output]\n\n${snippet}${sourceText.length > 280 ? "…" : ""}`,
    hook_explanation:
      "Preview mode: placeholder rewrite. Add OPENAI_API_KEY for real output; Pro unlocks tone controls.",
  };
}

export async function rewriteDistributionPost(params: {
  sourceText: string;
  platformLabel: string;
  /** When null, run the free “basic” rewrite (no tone steering). */
  tone: RewriteTone | null;
  /** Pro rewrites can use a slightly richer model instruction path. */
  tier: "basic" | "pro";
}): Promise<{ result: RewriteResult } | { error: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      error:
        "AI is not configured (missing OPENAI_API_KEY). Add it to your environment to rewrite posts.",
    };
  }

  const isPro = params.tier === "pro";
  const toneBlock =
    params.tone != null
      ? `${TONE_GUIDE[params.tone]}\n`
      : "Tone: balanced and clear — engaging but not gimmicky; keep the author’s voice.\n";

  const tierHint = isPro
    ? "This is a Pro rewrite: prioritize a memorable hook, tight pacing, and platform-appropriate length."
    : "This is a basic rewrite: improve clarity and hook; keep structure similar to the original length class.";

  const userPrompt = `Platform context: ${params.platformLabel}
${tierHint}

${toneBlock}
Original post text:
---
${params.sourceText.trim()}
---

Return JSON only (no markdown fences) with this shape:
{"title":"short headline or hook line for the post (under 100 chars ideally)","body":"full rewritten post the user can publish; preserve intent and facts","hook_explanation":"one or two sentences: what changed in the hook and why it works better"}

Rules:
- Do not invent metrics, testimonials, or facts not implied by the original.
- Sound human; avoid corporate jargon unless the original uses it.
- Title should be the strongest single-line hook; body is the full post text.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: isPro ? 0.78 : 0.55,
        max_completion_tokens: isPro ? 900 : 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You rewrite distribution and social posts for independent makers. Output valid JSON only. No markdown.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        error: `AI request failed (${res.status}). ${errText.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return { error: "AI returned an empty response." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFence(content));
    } catch {
      return { error: "AI returned invalid JSON." };
    }

    const validated = resultSchema.safeParse(parsed);
    if (!validated.success) {
      return { error: "AI response did not match the expected format." };
    }

    return { result: validated.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Could not reach AI: ${msg}` };
  }
}

export function platformLabelForRewrite(platform: DistributionPlatform): string {
  return DISTRIBUTION_PLATFORM_LABELS[platform];
}
