import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { metricsPreview, parseDistributionMetrics } from "@/lib/distribution-metrics";
import type { DistributionPlatform } from "@/types/momentum";
import { z } from "zod";

export type FollowUpAngle = "story" | "lesson" | "reflection";

export type FollowUpIdea = {
  angle: FollowUpAngle;
  title: string;
  body: string;
};

const ideaSchema = z.object({
  angle: z.enum(["story", "lesson", "reflection"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
});

const responseSchema = z.object({
  ideas: z.array(ideaSchema).length(3),
});

export function mockFollowUpIdeas(context: {
  platformLabel: string;
  projectName: string;
  title: string;
}): FollowUpIdea[] {
  const t = context.title.trim() || "your last post";
  return [
    {
      angle: "story",
      title: `What happened after: ${t.slice(0, 60)}${t.length > 60 ? "…" : ""}`,
      body: `I posted on ${context.platformLabel} for ${context.projectName} and wanted to share what happened next — the messy middle, not just the highlight reel.\n\nIf you saw the original thread, this is the follow-up: what surprised me, what I would tweak, and what I am doing tomorrow.\n\nHappy to answer questions in the comments.`,
    },
    {
      angle: "lesson",
      title: `One thing I learned from that ${context.platformLabel} post`,
      body: `Quick lesson from my last push for ${context.projectName}.\n\nThe post was about: ${t}.\n\nThe takeaway: distribution is less about perfect copy and more about showing up with something specific people can react to. Next time I am leading with a sharper hook and a single clear ask.\n\nWhat would you have tested differently?`,
    },
    {
      angle: "reflection",
      title: `Checking in on ${context.projectName}`,
      body: `Been thinking about that ${context.platformLabel} post and how it fits the bigger picture for ${context.projectName}.\n\nIt felt [authentic / scary / fun] to put out — and it reminded me why I care about this build.\n\nSharing a short reflection here; would love to hear if it resonates.`,
    },
  ];
}

function stripJsonFence(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "").trim();
  }
  return t;
}

function normalizeIdeas(raw: FollowUpIdea[]): FollowUpIdea[] {
  const order: FollowUpAngle[] = ["story", "lesson", "reflection"];
  const byAngle = new Map<FollowUpAngle, FollowUpIdea>();
  for (const idea of raw) {
    byAngle.set(idea.angle, idea);
  }
  return order.map((angle) => {
    const found = byAngle.get(angle);
    if (found) return found;
    return {
      angle,
      title: `Follow-up (${angle})`,
      body: "Regenerate for a fresh take — the model returned an unexpected shape.",
    };
  });
}

export type FollowUpGenerationInput = {
  platform: DistributionPlatform;
  projectName: string;
  postTitle: string;
  postNotes: string;
  metricsLine: string;
  datePosted: string;
};

export async function generateDistributionFollowUpIdeas(
  input: FollowUpGenerationInput
): Promise<{ ideas: FollowUpIdea[] } | { error: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      error:
        "AI is not configured (missing OPENAI_API_KEY). Add it to your environment to generate follow-ups.",
    };
  }

  const platformLabel = DISTRIBUTION_PLATFORM_LABELS[input.platform];
  const userPrompt = `Original post context:
- Platform: ${platformLabel}
- Project: ${input.projectName}
- Title: ${input.postTitle || "(none)"}
- Notes / content: ${input.postNotes.trim() || "(none)"}
- Metrics: ${input.metricsLine}
- Posted: ${input.datePosted}

Return JSON only with this exact shape (no markdown fences):
{"ideas":[{"angle":"story","title":"string","body":"string"},{"angle":"lesson","title":"string","body":"string"},{"angle":"reflection","title":"string","body":"string"}]}

Rules:
- Exactly three ideas, one per angle: story, lesson, reflection (each angle exactly once).
- Sound natural and human; build on the original without repeating it verbatim.
- Title: short working title (under 100 characters).
- Body: ready-to-post draft the creator can paste or edit; match typical length for ${platformLabel} (e.g. concise for Twitter, more room for Reddit).
- Vary hooks and structure across the three angles.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You help independent creators write authentic follow-up posts. Output valid JSON only. No markdown.",
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

    const validated = responseSchema.safeParse(parsed);
    if (!validated.success) {
      return { error: "AI response did not match the expected format." };
    }

    return { ideas: normalizeIdeas(validated.data.ideas) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Could not reach AI: ${msg}` };
  }
}

export function buildFollowUpMetricsLine(
  metrics: Record<string, unknown> | null
): string {
  const m = parseDistributionMetrics(metrics);
  const preview = metricsPreview(m);
  if (preview) return preview;
  const parts: string[] = [];
  if (typeof m.promo_spend === "number")
    parts.push(`promo spend $${m.promo_spend.toFixed(2)}`);
  if (m.notes_on_performance?.trim())
    parts.push(`performance notes: ${m.notes_on_performance.trim().slice(0, 200)}`);
  return parts.length ? parts.join(" · ") : "No metrics logged yet";
}
