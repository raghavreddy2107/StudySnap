// src/services/passportStrategy.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../utils/prisma.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatarUrl = profile.photos?.[0]?.value;

        let user = await prisma.user.findUnique({ where: { googleId } });

        if (!user) {
          // If a user already exists with the same email (e.g. local signup),
          // link the Google account to that user.
          const existingByEmail = email
            ? await prisma.user.findUnique({ where: { email } })
            : null;

          if (existingByEmail) {
            user = await prisma.user.update({
              where: { id: existingByEmail.id },
              data: { googleId, name, avatarUrl },
            });
          } else {
            user = await prisma.user.create({
              data: { googleId, email, name, avatarUrl },
            });
          }
        } else {
          // Update avatar/name if changed
          user = await prisma.user.update({
            where: { id: user.id },
            data: { name, avatarUrl },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
