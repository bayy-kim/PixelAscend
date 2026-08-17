import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  trustHost: true,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Inject custom fields like role & status from db
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true, status: true, nickname: true },
        });

        if (dbUser) {
          session.user.role = dbUser.role;
          session.user.status = dbUser.status;
          session.user.nickname = dbUser.nickname;
        }
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
        return false; // blocks login
      }
      return true;
    },
  },
});
