const { getAdminClient } = require('./supabase');

const USER_PROFILES_TABLE = 'user_profiles';

async function upsertUserProfile({
  id,
  fullName,
  languagesKnown = [],
  organizationEmail,
}) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .upsert(
      {
        id,
        full_name: fullName || null,
        organization_email: organizationEmail || null,
        languages_known: languagesKnown,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to save user profile: ${error.message}`);
  }

  return data;
}

async function getUserProfileById(id) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user profile: ${error.message}`);
  }

  return data;
}

module.exports = {
  getUserProfileById,
  upsertUserProfile,
};
