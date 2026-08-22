import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "admin@demo.com" },
        password: { label: "Password", type: "password" },
        phone: { label: "Phone", type: "text" },
        isCustomer: { label: "Is Customer", type: "text" },
        restaurantSlug: { label: "Restaurant Slug", type: "text" }
      },
      async authorize(credentials) {
        if (credentials?.isCustomer === "true") {
          const { phone, password, restaurantSlug } = credentials;
          if (!phone || !password || !restaurantSlug) throw new Error("Missing phone, password or restaurant");

          const restaurant = await prisma.restaurant.findUnique({
            where: { slug: restaurantSlug }
          });

          if (!restaurant) throw new Error("Restaurant not found");

          const customer = await prisma.customer.findFirst({
            where: { phone, restaurantId: restaurant.id }
          });

          if (!customer) {
            throw new Error("No customer found with that phone number");
          }

          if (customer.password) {
            const isValid = await bcrypt.compare(password, customer.password);
            if (!isValid) {
              throw new Error("Invalid password");
            }
          } else {
            // Existing customers without a password might fail here depending on requirements.
            // For now, if they don't have a password, we enforce they cannot log in via the new flow,
            // or we could allow them. Let's enforce password since it's the new flow.
            throw new Error("Invalid password");
          }

          return {
            id: customer.id,
            email: customer.phone, // using phone as email for session mapping
            name: customer.name || "Guest",
            role: "CUSTOMER",
            restaurantId: restaurant.id,
            restaurantSlug: restaurant.slug
          };
        }

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { restaurant: true }
        });

        if (!user) {
          throw new Error("No user found with that email");
        }

        if (user.status !== "ACTIVE") {
          throw new Error("Your account is inactive. Please contact an administrator.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          restaurantId: user.restaurantId,
          restaurantSlug: user.restaurant?.slug
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role | "CUSTOMER";
        token.restaurantId = user.restaurantId;
        token.restaurantSlug = user.restaurantSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.restaurantId = token.restaurantId;
        session.user.restaurantSlug = token.restaurantSlug;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
