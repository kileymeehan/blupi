import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

// AI first draft for flows captured by the Chrome extension. All screenshots
// go to Claude in one request, so it sees the whole flow: step names stay
// consistent, friction that builds across steps is visible, and it can group
// steps into meaningful phases.
//
// Enabled when ANTHROPIC_API_KEY is set. Roughly $0.01-0.02 per captured
// step at Claude Opus 5.5 prices (each ~1600px screenshot is ~2K input tokens).

const MODEL = "claude-opus-5-5";

export type DraftInputStep = {
  title: string;
  url: string;
  note?: string;
  screenshotUrl?: string; // /uploads/captures/... saved by the extension API
};

export type FlowDraft = {
  phases: { name: string; firstStepIndex: number }[];
  steps: { stepName: string; touchpoint: string; frictions: string[]; questions: string[] }[];
};

export class AiDraftError extends Error {}

export function aiDraftAvailable() {
  return !!process.env.ANTHROPIC_API_KEY;
}

const SYSTEM_PROMPT = `You are a senior UX researcher helping a product team start a customer journey map (a "blueprint") from screenshots of a flow someone just walked through on a website.

For each step, write:
- stepName: what the user is doing at this point, as a short action phrase (2-5 words, e.g. "Choose a plan", "Verify email"). Name the user's task, not the page.
- touchpoint: one or two plain sentences on what the user sees and is asked to do on this screen.
- frictions: up to three specific problems visible on this screen or created by the flow so far: confusing copy, too many fields, unexpected requests (like a phone number), unclear next steps, missing reassurance, dark patterns, accessibility issues. Only include what the screenshot actually supports; an empty list is fine for a smooth step.
- questions: up to two open research questions a team should validate with real users, for example why people hesitate here or what they expected to happen.

Then group the steps into phases: a few contiguous stages of the journey with short names (e.g. "Discover", "Sign up", "Set up account", "Checkout"). Give each phase's first step index (0-based); the first phase starts at 0 and indices increase.

Write for the team that will edit this draft: concrete and specific to what's on screen, no generic UX advice, no marketing language.`;

// Matches FlowDraft; the API constrains the response to this schema
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    phases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          firstStepIndex: { type: "integer" },
        },
        required: ["name", "firstStepIndex"],
        additionalProperties: false,
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stepName: { type: "string" },
          touchpoint: { type: "string" },
          frictions: { type: "array", items: { type: "string" } },
          questions: { type: "array", items: { type: "string" } },
        },
        required: ["stepName", "touchpoint", "frictions", "questions"],
        additionalProperties: false,
      },
    },
  },
  required: ["phases", "steps"],
  additionalProperties: false,
};

// Same shape, checked again here, with limits on what we'll put on a board
const draftSchema = z.object({
  phases: z.array(z.object({ name: z.string().trim().min(1).max(80), firstStepIndex: z.number().int() })),
  steps: z.array(
    z.object({
      stepName: z.string().trim().min(1).max(120),
      touchpoint: z.string().trim().max(1000),
      frictions: z.array(z.string().trim().min(1).max(500)).max(5),
      questions: z.array(z.string().trim().min(1).max(500)).max(5),
    }),
  ),
});

async function screenshotBlock(screenshotUrl: string): Promise<Anthropic.Beta.BetaImageBlockParam | null> {
  // Only files the extension API saved; the URL was validated against this shape
  const relative = screenshotUrl.replace(/^\/uploads\//, "");
  const file = path.join(process.cwd(), "uploads", relative);
  try {
    const data = (await fs.readFile(file)).toString("base64");
    return {
      type: "image",
      source: { type: "base64", media_type: screenshotUrl.endsWith(".png") ? "image/png" : "image/jpeg", data },
    };
  } catch {
    return null; // a missing screenshot shouldn't sink the whole draft
  }
}

// Phases must start at step 0 and move forward; otherwise ignore them
function validPhases(phases: FlowDraft["phases"], stepCount: number) {
  if (phases.length === 0 || phases[0].firstStepIndex !== 0) return false;
  return phases.every(
    (p, i) => p.firstStepIndex < stepCount && (i === 0 || p.firstStepIndex > phases[i - 1].firstStepIndex),
  );
}

export async function draftFlow(steps: DraftInputStep[]): Promise<FlowDraft> {
  if (!aiDraftAvailable()) throw new AiDraftError("AI drafting isn't set up on this server");

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const details = [`Step ${i}`, `Page title: ${step.title || "(none)"}`, `URL: ${step.url}`];
    if (step.note) details.push(`Note from the person who captured it: ${step.note}`);
    content.push({ type: "text", text: details.join("\n") });
    const image = step.screenshotUrl ? await screenshotBlock(step.screenshotUrl) : null;
    if (image) content.push(image);
    else content.push({ type: "text", text: "(No screenshot for this step.)" });
  }
  content.push({
    type: "text",
    text: `Draft the journey for these ${steps.length} steps, in order. Return exactly ${steps.length} items in "steps".`,
  });

  const client = new Anthropic();
  let message: Anthropic.Beta.BetaMessage;
  try {
    // Streaming avoids HTTP timeouts on large flows; we only need the final message
    message = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default", // re-run a declined request on Anthropic's recommended fallback model
        output_config: { effort: "medium", format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      })
      .finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AiDraftError("The server's Anthropic API key was rejected");
    if (err instanceof Anthropic.RateLimitError) throw new AiDraftError("AI drafting is busy right now; try again in a minute");
    if (err instanceof Anthropic.BadRequestError) throw new AiDraftError(`AI request was rejected: ${err.message}`);
    if (err instanceof Anthropic.APIError) throw new AiDraftError(`AI service error (${err.status ?? "network"})`);
    throw err;
  }

  if (message.stop_reason === "refusal") throw new AiDraftError("The AI declined to draft this flow");
  if (message.stop_reason === "max_tokens") throw new AiDraftError("The flow was too long to draft in one go");

  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let parsed: z.infer<typeof draftSchema>;
  try {
    parsed = draftSchema.parse(JSON.parse(text));
  } catch {
    throw new AiDraftError("The AI's response wasn't in the expected format");
  }
  if (parsed.steps.length !== steps.length) {
    throw new AiDraftError(`The AI drafted ${parsed.steps.length} steps instead of ${steps.length}`);
  }

  console.log(
    `[AI draft] ${steps.length} steps: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out tokens`,
  );
  return { phases: validPhases(parsed.phases, steps.length) ? parsed.phases : [], steps: parsed.steps };
}
