import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db';
import bcrypt from 'bcryptjs';

// Extend types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}

// Check if email verification is required
const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'email@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);

        if (!passwordMatch) {
          return null;
        }

        // Check email verification if required
        if (REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
          throw new Error('EmailNotVerified');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign in
      if (account?.provider === 'google' && user.email) {
        try {
          // Check if user exists
          const existingUser = await db.user.findUnique({
            where: { email: user.email.toLowerCase() },
          });

          if (!existingUser) {
            // Create new user from Google profile
            const newUser = await db.user.create({
              data: {
                email: user.email.toLowerCase(),
                name: user.name || user.email.split('@')[0],
                image: user.image,
                role: 'user',
                emailVerified: new Date(), // Google emails are already verified
              },
            });

            // Get the free plan
            const freePlan = await db.plan.findFirst({
              where: { name: 'free' },
            });

            // Create free subscription if free plan exists
            if (freePlan) {
              const now = new Date();
              const periodEnd = new Date(now);
              periodEnd.setMonth(periodEnd.getMonth() + 1);

              const subscription = await db.subscription.create({
                data: {
                  userId: newUser.id,
                  planId: freePlan.id,
                  status: 'active',
                  currentPeriodStart: now,
                  currentPeriodEnd: periodEnd,
                },
              });

              // Create usage record
              await db.usage.create({
                data: {
                  subscriptionId: subscription.id,
                },
              });
            }

            console.log('[Auth] Created new user from Google:', newUser.email);

            // Update user object with new user data
            user.id = newUser.id;
            user.role = newUser.role;
          } else {
            // User exists, update their info if needed
            if (!existingUser.image && user.image) {
              await db.user.update({
                where: { id: existingUser.id },
                data: { image: user.image },
              });
            }

            // Update user object with existing user data
            user.id = existingUser.id;
            user.role = existingUser.role;
          }

          return true;
        } catch (error) {
          console.error('[Auth] Google sign in error:', error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'user';
      }
      // On Google OAuth sign-in, user.id may be Google's sub (not our DB id).
      // Re-fetch from DB by email to guarantee we store the correct CUID.
      if (account?.provider === 'google' && token.email) {
        try {
          const dbUser = await db.user.findUnique({
            where: { email: (token.email as string).toLowerCase() },
            select: { id: true, role: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } catch { /* ignore — token.id stays as-is */ }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  debug: false,
};