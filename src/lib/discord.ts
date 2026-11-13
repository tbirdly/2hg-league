import "server-only";

/**
 * Posts a message to the league's Discord channel through a channel webhook.
 * Set DISCORD_WEBHOOK_URL in Vercel (Discord: Edit Channel > Integrations > Webhooks > New Webhook > Copy URL).
 * Returns false (and never throws) if Discord isn't set up or the post fails, so the site keeps working.
 */
export async function postToDiscord(content: string, { ping = false } = {}): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: ping ? `@here ${content}` : content,
        username: "Cuck Classic",
        // Only allow the @here ping we add ourselves; never ping from player-entered text.
        allowed_mentions: { parse: ping ? ["everyone"] : [] },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[discord] webhook returned", res.status);
    return res.ok;
  } catch (err) {
    console.error("[discord] post failed", err);
    return false;
  }
}

export function discordConfigured() {
  return !!process.env.DISCORD_WEBHOOK_URL;
}
