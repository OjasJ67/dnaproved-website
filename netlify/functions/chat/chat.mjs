// POST /api/chat — streams the DNAProved assistant's reply as plain text.
// Needs ANTHROPIC_API_KEY in the Netlify site's environment variables.
// Optional: CHAT_MODEL to use a different Claude model.
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./knowledge.mjs";

const MODEL = process.env.CHAT_MODEL || "claude-opus-5-5";
const MAX_TURNS = 12;
const MAX_CHARS = 1500;
const RATE_LIMIT = 20; // requests per IP per window, per function instance
const RATE_WINDOW_MS = 10 * 60 * 1000;

const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

// Keep only well-formed, alternating user/assistant turns that start with the user.
function clean(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const m of raw.slice(-MAX_TURNS)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (!content) continue;
    if (!out.length && m.role !== "user") continue;
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += "\n\n" + content;
    else out.push({ role: m.role, content });
  }
  return out.length && out[out.length - 1].role === "user" ? out : null;
}

const text = (body, status) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export default async (req, context) => {
  if (req.method !== "POST") return text("Method not allowed", 405);
  if (!process.env.ANTHROPIC_API_KEY) return text("Chat is not configured", 503);

  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return text("Forbidden", 403);
  if (limited(context?.ip || "unknown")) return text("Too many requests", 429);

  let body;
  try { body = await req.json(); } catch { return text("Bad request", 400); }
  const messages = clean(body?.messages);
  if (!messages) return text("Bad request", 400);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let sent = false;
      try {
        const stream = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 2000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          cache_control: { type: "ephemeral" },
          system: SYSTEM_PROMPT,
          messages,
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
            sent = true;
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode((sent ? "\n\n" : "") + "I can't help with that here. For anything about our tests, email dna.proved@gmail.com."));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("…"));
        }
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) console.error("Claude rate limit", err.status);
        else if (err instanceof Anthropic.AuthenticationError) console.error("Claude API key rejected");
        else if (err instanceof Anthropic.APIError) console.error("Claude API error", err.status, err.message);
        else console.error("Chat stream failed", err);
        // With nothing sent, the widget falls back to its built-in answers.
        if (sent) controller.enqueue(encoder.encode("\n\nSorry, the assistant was cut off. Email dna.proved@gmail.com for help."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
};

export const config = { path: "/api/chat" };
