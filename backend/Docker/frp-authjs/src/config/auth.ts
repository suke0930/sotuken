import Discord from "@auth/express/providers/discord";
import { env } from "./env.js";

export const authConfig = {
  providers: [
    Discord({
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
    }),
  ],
  secret: env.AUTH_SECRET,
  trustHost: true,
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
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
