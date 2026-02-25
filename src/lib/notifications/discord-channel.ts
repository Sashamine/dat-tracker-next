/**
 * Minimal Discord channel messaging via Bot token.
 *
 * Used when we need to post to a specific channel (e.g. #updates) rather than a webhook.
 */

export async function sendDiscordChannelMessage(
  channelId: string,
  content: string
): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.log('[DiscordChannel] No DISCORD_BOT_TOKEN configured, skipping');
    return false;
  }

  if (!channelId) {
    console.log('[DiscordChannel] Missing channelId, skipping');
    return false;
  }

  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[DiscordChannel] Failed: ${res.status} ${res.statusText} ${text}`);
    return false;
  }

  return true;
}
