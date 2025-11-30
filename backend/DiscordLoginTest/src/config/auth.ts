import Discord from "@auth/express/providers/discord";
import { env } from "./env.js";

/**
 * Auth.js configuration with Discord OAuth provider
 *
 * To add more providers (e.g., GitHub):
 * 1. Import the provider: import GitHub from "@auth/express/providers/github";
 * 2. Add to providers array: GitHub({ clientId: "...", clientSecret: "..." })
 * 3. Add environment variables for the new provider
 */
export const authConfig = {
  providers: [
    Discord({
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
    }),
    // Example: Add GitHub provider
    // GitHub({
    //   clientId: process.env.AUTH_GITHUB_ID,
    //   clientSecret: process.env.AUTH_GITHUB_SECRET,
    // }),
  ],
  secret: env.AUTH_SECRET,
  trustHost: true,
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      // Customize session object here if needed
      // For example, add user ID from token
      if (token?.sub) {
        session.user = {
          ...session.user,
          id: token.sub,
        };
      }
      return session;
    },
  },
};
