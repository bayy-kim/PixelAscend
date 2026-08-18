import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
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
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
          throw new Error("Missing admin credentials in environment variables");
        }

        if (
          credentials?.email === adminEmail &&
          credentials?.password === adminPassword
        ) {
          // Find or create admin user in db to sync sessions
          let user = await db.user.findUnique({
            where: { email: adminEmail },
          });

          if (!user) {
            user = await db.user.create({
              data: {
                email: adminEmail,
                name: "Admin Bayu",
                role: "ADMIN",
                status: "ACTIVE",
              },
            });
          } else if (user.role !== "ADMIN") {
            user = await db.user.update({
              where: { email: adminEmail },
              data: { role: "ADMIN" },
            });
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
          };
        }

        return null;
      },
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
