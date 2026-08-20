import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

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
            throw new Error("Missing admin credentials in environment variables");
          }

          if (
            inputEmail === adminEmail &&
            inputPassword === adminPassword
          ) {
          const { db } = await import("@/lib/db");
          
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
