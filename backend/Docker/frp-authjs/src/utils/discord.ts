/**
 * Discord Utility Functions
 * Helper functions for Discord-related operations
 */

/**
 * Generate Discord avatar URL from user ID and avatar hash
 * @param userId Discord user ID (snowflake)
 * @param avatarHash Avatar hash from Discord API (can be null)
 * @returns CDN URL for avatar, or default avatar URL if hash is null
 *
 * @see https://discord.com/developers/docs/reference#image-formatting
 */
export function getAvatarUrl(userId: string, avatarHash: string | null): string {
  if (!avatarHash) {
    // Default avatar (based on user ID)
    // Discord uses (user_id >> 22) % 6 for default avatar index
    const defaultIndex = (BigInt(userId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }

  // Determine file extension (GIF if animated, PNG otherwise)
  const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';

  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}`;
}
