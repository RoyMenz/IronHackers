const express = require('express');

const env = require('../config/env');
const { getAuthClient } = require('../lib/supabase');
const { getAdminClient } = require('../lib/supabase');
const { getUserProfileById, upsertUserProfile } = require('../lib/userProfiles');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

function validateEmailPassword(req, res) {
  const { email, password, name, languagesKnown } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return null;
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'email and password must be strings' });
    return null;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'password must be at least 6 characters' });
    return null;
  }

  if (languagesKnown != null && !Array.isArray(languagesKnown)) {
    res.status(400).json({ error: 'languagesKnown must be an array of strings' });
    return null;
  }

  const normalizedLanguagesKnown = Array.isArray(languagesKnown)
    ? languagesKnown
        .filter((language) => typeof language === 'string')
        .map((language) => language.trim())
        .filter(Boolean)
    : [];

  return {
    email,
    password,
    languagesKnown: normalizedLanguagesKnown,
    name: typeof name === 'string' ? name.trim() : '',
  };
}

function isEmailRateLimitError(error) {
  return Boolean(error?.message && error.message.toLowerCase().includes('email rate limit exceeded'));
}

async function createConfirmedUserAndSession(payload) {
  const adminClient = getAdminClient();
  const { data: createdUserData, error: createError } = await adminClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: payload.name ? { full_name: payload.name } : undefined,
  });

  if (createError) {
    throw createError;
  }

  const authClient = getAuthClient();
  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword(payload);

  if (signInError) {
    throw signInError;
  }

  return {
    user: signInData.user ?? createdUserData.user,
    session: signInData.session,
  };
}

async function saveProfileForUser(user, payload) {
  if (!user?.id) {
    return null;
  }

  return upsertUserProfile({
    id: user.id,
    fullName: payload.name,
    languagesKnown: payload.languagesKnown,
    organizationEmail: payload.email,
  });
}

async function buildAuthResponse({ message, session, user }) {
  const profile = user?.id ? await getUserProfileById(user.id) : null;

  return {
    message,
    profile,
    session,
    user,
  };
}

router.post('/signup', async (req, res, next) => {
  try {
    const payload = validateEmailPassword(req, res);
    if (!payload) {
      return;
    }

    const supabaseAuth = getAuthClient();
    const signUpPayload = {
      email: payload.email,
      password: payload.password,
      options: payload.name
        ? {
            data: {
              full_name: payload.name,
            },
          }
        : undefined,
    };
    const { data, error } = await supabaseAuth.auth.signUp(signUpPayload);

    if (error) {
      if (env.allowDevAutoConfirmSignup && isEmailRateLimitError(error)) {
        try {
          const fallback = await createConfirmedUserAndSession(payload);
          await saveProfileForUser(fallback.user, payload);
          res.status(201).json(
            await buildAuthResponse({
              message: 'Signup successful',
              session: fallback.session,
              user: fallback.user,
            })
          );
          return;
        } catch (fallbackError) {
          res.status(400).json({ error: fallbackError.message });
          return;
        }
      }

      res.status(400).json({ error: error.message });
      return;
    }

    await saveProfileForUser(data.user, payload);

    res.status(201).json(
      await buildAuthResponse({
        message: 'Signup successful',
        session: data.session,
        user: data.user,
      })
    );
  } catch (error) {
    next(error);
  }
});

router.post('/signin', async (req, res, next) => {
  try {
    const payload = validateEmailPassword(req, res);
    if (!payload) {
      return;
    }

    const supabaseAuth = getAuthClient();
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    res.status(200).json(
      await buildAuthResponse({
        message: 'Signin successful',
        session: data.session,
        user: data.user,
      })
    );
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (_req, res, next) => {
  try {
    res.status(200).json(
      await buildAuthResponse({
        message: 'Current user loaded successfully',
        session: null,
        user: _req.user,
      })
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
