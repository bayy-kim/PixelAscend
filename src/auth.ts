import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" }, // Use JWT session strategy so edge middleware doesn't lookup db sessions
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.nickname = user.nickname;
      }
      
      // Periodically refresh role/status directly from DB to allow instant suspension checks
      if (token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
          select: { role: true, status: true, nickname: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.nickname = dbUser.nickname;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.status = token.status as any;
        session.user.nickname = token.nickname as string | null;
      }
      return session;
    },
    async signIn({ user }) {
      // Security guardrail: immediately reject suspended users at login stage
      const dbUser = await db.user.findUnique({
        where: { email: user.email ?? "" },
        select: { status: true },
      });
      if (dbUser && dbUser.status === "SUSPENDED") {
        return false;
      }
      return true;
    },
  },
});
