import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
// Promoted to "owner" at signup (case-insensitive). Empty = nobody auto-promoted
// (seed manually instead — see Dashboard-plan M6 checklist).
const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase() ?? "";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    // Ride through Neon scale-to-zero cold starts instead of failing fast
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 30_000,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false, // server-owned — clients can never set their own role
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            role:
              ownerEmail && user.email?.trim().toLowerCase() === ownerEmail
                ? "owner"
                : "customer",
          },
        }),
      },
    },
  },
  plugins: [jwt()],
});
