const express = require('express');

const env = require('../config/env');
const { getAuthClient } = require('../lib/supabase');
const { getAdminClient } = require('../lib/supabase');

const router = express.Router();

function validateEmailPassword(req, res) {
  const { email, password } = req.body || {};

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

  return { email, password };
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

router.post('/signup', async (req, res, next) => {
  try {
    const payload = validateEmailPassword(req, res);
    if (!payload) {
      return;
    }

    const supabaseAuth = getAuthClient();
    const { data, error } = await supabaseAuth.auth.signUp(payload);

    if (error) {
      if (env.allowDevAutoConfirmSignup && isEmailRateLimitError(error)) {
        try {
          const fallback = await createConfirmedUserAndSession(payload);
          res.status(201).json({
            message: 'Signup successful',
            user: fallback.user,
            session: fallback.session,
          });
          return;
        } catch (fallbackError) {
          res.status(400).json({ error: fallbackError.message });
          return;
        }
      }

      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({
      message: 'Signup successful',
      user: data.user,
      session: data.session,
    });
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
    const { data, error } = await supabaseAuth.auth.signInWithPassword(payload);

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    res.status(200).json({
      message: 'Signin successful',
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
