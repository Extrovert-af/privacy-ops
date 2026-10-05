import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  checkLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
  clientIp,
} from "@/lib/rate-limit";

declare module "next-auth" {
  interface User {
    role: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const rawEmail = credentials?.email;
        const password = credentials?.password;

        if (typeof rawEmail !== "string" || typeof password !== "string") return null;

        const email = rawEmail.trim().toLowerCase();
        const ipKey = `ip:${clientIp(request as Request)}`;
        const accountKey = `acct:${email}`;

        // Throttle by source address and lock the individual account.
        const [ipAllowed, accountAllowed] = await Promise.all([
          checkLoginAllowed(ipKey),
          checkLoginAllowed(accountKey),
        ]);

        if (!ipAllowed || !accountAllowed) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        // Always run a bcrypt comparison so response timing does not reveal
        // whether the account exists.
        const hash =
          user?.password ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
        const isValid = await bcrypt.compare(password, hash);

        if (!user || !user.active || !isValid) {
          await recordLoginFailure(accountKey);
          await recordLoginFailure(ipKey);
          return null;
        }

        await clearLoginFailures(ipKey);
        await clearLoginFailures(accountKey);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (!user.id) return;

      await prisma.activityLog
        .create({
          data: {
            action: "Signed in",
            entity: user.email ?? user.name ?? "Unknown user",
            entityType: "auth",
            userId: user.id,
            details: "Successful login",
          },
        })
        .catch(() => undefined);
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);