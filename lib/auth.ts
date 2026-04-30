import { betterAuth } from "better-auth";
import { Database } from "bun:sqlite";

export const auth = betterAuth({
  database: new Database("data/app.db"),
  emailAndPassword: {
    enabled: true,
  },
});
