const { getAuthClient } = require('../lib/supabase');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const supabaseAuth = getAuthClient();
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data?.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = data.user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAuth,
};
