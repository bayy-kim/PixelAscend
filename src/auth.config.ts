import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

// Edge-compatible constant-time comparison helper using Web Crypto API
async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const dataA = encoder.encode(a);
  const dataB = encoder.encode(b);
  const hashA = new Uint8Array(await crypto.subtle.digest("SHA-256", dataA));
  const hashB = new Uint8Array(await crypto.subtle.digest("SHA-256", dataB));

  let result = 0;
  for (let i = 0; i < hashA.length; i++) {
    result |= hashA[i] ^ hashB[i];
  }
  return result === 0;
}

export const authConfig = {
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
        const adminEmail = (process.env.ADMIN_EMAIL || "").trim();
        const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();

        const inputEmail = typeof credentials?.email === "string" ? credentials.email.trim() : "";
        const inputPassword = typeof credentials?.password === "string" ? credentials.password.trim() : "";

        if (!adminEmail || !adminPassword) {
          console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in environment variables");
          return null;
        }

        const { db } = await import("@/lib/db");

        // DB-based rate limiting & cleanup for serverless Vercel environment
        try {
          // Cleanup old login attempts older than 24 hours
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          await db.adminLoginAttempt.deleteMany({
            where: { createdAt: { lt: oneDayAgo } },
          });

          // Count failed login attempts for this email identifier in the last 15 minutes
          const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
          const attemptCount = await db.adminLoginAttempt.count({
            where: {
              identifier: inputEmail || "unknown",
              createdAt: { gte: fifteenMinsAgo },
            },
          });

          // Block if >= 5 failed attempts in last 15 mins
          if (attemptCount >= 5) {
            console.warn(`Admin login rate limited for identifier: ${inputEmail}`);
            return null;
          }
        } catch (dbErr) {
          console.error("Admin login rate-limit DB check error:", dbErr);
        }

        // Constant-time comparison using SHA-256 digests to prevent timing attacks
        const isEmailMatch = await constantTimeCompare(inputEmail, adminEmail);
        const isPasswordMatch = await constantTimeCompare(inputPassword, adminPassword);

        if (isEmailMatch && isPasswordMatch) {
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
        } else {
          // Record failed login attempt to DB for rate limiting
          try {
            await db.adminLoginAttempt.create({
              data: {
                identifier: inputEmail || "unknown",
              },
            });
          } catch (logErr) {
            console.error("Failed to record AdminLoginAttempt:", logErr);
          }
        }

        return null;
      },
    }),
  ],
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
      const isPusherAuthRoute = nextUrl.pathname.startsWith("/api/pusher");
      const isPublicRoute =
        nextUrl.pathname === "/" ||
        nextUrl.pathname === "/admin/login" ||
        nextUrl.pathname.startsWith("/_next") ||
        nextUrl.pathname.startsWith("/static") ||
        nextUrl.pathname.startsWith("/themes") ||
        nextUrl.pathname.startsWith("/sprites");

      // Protect admin routes
      if (nextUrl.pathname.startsWith("/admin") && nextUrl.pathname !== "/admin/login") {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/admin/login", nextUrl));
        }
        const adminEmail = process.env.ADMIN_EMAIL;
        const isAdminUser =
          auth?.user?.role === "ADMIN" ||
          (adminEmail && auth?.user?.email === adminEmail);

        if (!isAdminUser) {
          return Response.redirect(new URL("/admin/login?error=AccessDenied", nextUrl));
        }
      }

      // Protect other dashboard / gameplay routes
      if (!isPublicRoute && !isApiAuthRoute && !isPusherAuthRoute && !isLoggedIn) {
        return false;
      }

      // Redirect logged in users away from landing page to dashboard
      if (nextUrl.pathname === "/" && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
