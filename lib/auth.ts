import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/auth-schema";

/**
 * Auth model (CDSOIMEME):
 *   - Identities live in `auth_users` (email + bcrypt `password`).
 *   - Roles live in `user_roles` (enum app_role: `praticienne` | `cliente`).
 * The session carries `role` so guards and redirects can branch by portal.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.auth_users.findUnique({ where: { email } });
        if (!user || !user.password) return null;
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;
        const roleRow = await prisma.user_roles.findFirst({ where: { user_id: user.id } });
        const role = roleRow?.role ?? "cliente";
        return { id: user.id, email: user.email, name: user.name, role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "praticienne") throw new Error("Unauthorized");
  return session;
}

export async function requireClient() {
  const session = await auth();
  if (!session?.user || session.user.role !== "cliente") throw new Error("Unauthorized");
  return session;
}
