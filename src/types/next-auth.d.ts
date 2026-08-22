import { DefaultSession, DefaultUser } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role | "CUSTOMER";
      restaurantId: string;
      restaurantSlug?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role | "CUSTOMER";
    restaurantId: string;
    restaurantSlug?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role | "CUSTOMER";
    restaurantId: string;
    restaurantSlug?: string;
  }
}
