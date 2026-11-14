import "server-only";

/** Discord user IDs are long numbers (a "snowflake"). */
export const DISCORD_ID = /^\d{15,21}$/;

/** "<@123>" tags for players that have a Discord user ID set. */
export function discordTags(players: { discordUserId: string | null }[]): string[] {
  return players.map((p) => p.discordUserId).filter((id): id is string => !!id && DISCORD_ID.test(id));
}

/**
 * Posts a message to the league's Discord channel through a channel webhook.
 * Set DISCORD_WEBHOOK_URL in Vercel (Discord: Edit Channel > Integrations > Webhooks > New Webhook > Copy URL).
 * `tag` lists Discord user IDs to mention; nobody else (no @here/@everyone) can be pinged.
 * Returns false (and never throws) if Discord isn't set up or the post fails, so the site keeps working.
 */
export async function postToDiscord(content: string, { tag = [] as string[] } = {}): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  const ids = [...new Set(tag.filter((id) => DISCORD_ID.test(id)))];
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: ids.length ? `${ids.map((id) => `<@${id}>`).join(" ")} ${content}` : content,
        username: "Cuck Classic",
        allowed_mentions: { parse: [], users: ids },
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
