import { Role, UserStatus } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: UserStatus;
      nickname: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    status?: UserStatus;
    nickname?: string | null;
  }
}
