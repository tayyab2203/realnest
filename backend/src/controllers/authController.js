import { supabase, supabaseAdmin } from '../lib/supabase.js';
import prisma from '../lib/prisma.js';

function checkSupabase(res) {
  if (!supabaseAdmin || !supabase) {
    console.error('Supabase not configured — check .env');
    res.status(503).json({ error: 'Auth service not configured' });
    return false;
  }
  return true;
}

async function findOrCreateProfile(userId, email, name, role) {
  // Try by userId first
  let profile = await prisma.profile.findUnique({ where: { userId } });
  if (profile) return profile;

  // Try by email (profile exists from a previous Supabase user ID)
  profile = await prisma.profile.findUnique({ where: { email } });
  if (profile) {
    // Link to the current Supabase user ID
    return prisma.profile.update({
      where: { email },
      data: { userId },
    });
  }

  // No profile at all — create one
  return prisma.profile.create({
    data: { userId, email, name, role },
  });
}

export const register = async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  if (!checkSupabase(res)) return;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Email, password, name, and role are required' });
  }
  if (!['BUYER', 'SELLER'].includes(role)) {
    return res.status(400).json({ error: 'Role must be BUYER or SELLER' });
  }

  try {
    // Try to create the user with admin (auto-confirms email)
    let supaUserId;
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (adminError) {
      // If user already exists in Supabase, try signing in instead
      if (adminError.message?.includes('already been registered') ||
          adminError.message?.includes('already exists')) {
        const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
        }
        supaUserId = signIn.user.id;

        const profile = await findOrCreateProfile(supaUserId, email, name, role);
        // Update name/phone/role on the existing profile
        const updated = await prisma.profile.update({
          where: { id: profile.id },
          data: { name, phone: phone || null, role },
        });

        return res.status(200).json({
          message: 'Logged in with existing account',
          needsVerification: false,
          user: signIn.user,
          session: signIn.session,
          profile: updated,
        });
      }
      return res.status(400).json({ error: adminError.message });
    }

    supaUserId = adminData.user.id;

    const profile = await findOrCreateProfile(supaUserId, email, name, role);
    // Ensure profile has latest data
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { name, phone: phone || null, role },
    });

    // Sign in to get a session token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return res.status(400).json({ error: signInError.message });
    }

    return res.status(201).json({
      message: 'Registration successful',
      needsVerification: false,
      user: signInData.user,
      session: signInData.session,
      profile: updated,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed: ' + (err.message || 'Unknown error') });
  }
};

/** After client-side Supabase sign-in: create/link profile if missing. */
export const ensureProfile = async (req, res) => {
  if (!checkSupabase(res)) return;

  try {
    const { role: intendedRole } = req.body || {};
    const u = req.supabaseUser;
    if (!u) return res.status(401).json({ error: 'Not authenticated' });
    const fallbackName = u.user_metadata?.name || u.email?.split('@')[0] || 'User';
    const fallbackRole = ['BUYER', 'SELLER'].includes(intendedRole) ? intendedRole : 'BUYER';

    const profile = await findOrCreateProfile(u.id, u.email, fallbackName, fallbackRole);

    return res.json({ profile, user: { id: u.id, email: u.email } });
  } catch (err) {
    console.error('ensureProfile error:', err);
    return res.status(500).json({ error: err.message || 'Failed to sync profile' });
  }
};

export const login = async (req, res) => {
  const { email, password, role: intendedRole } = req.body;

  if (!checkSupabase(res)) return;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    if (!data?.user) {
      return res.status(500).json({ error: 'Invalid response from auth service' });
    }

    const fallbackName = data.user.user_metadata?.name || email.split('@')[0] || 'User';
    const fallbackRole = ['BUYER', 'SELLER'].includes(intendedRole) ? intendedRole : 'BUYER';

    const profile = await findOrCreateProfile(data.user.id, data.user.email, fallbackName, fallbackRole);

    return res.json({
      user: data.user,
      session: data.session,
      profile,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
};

export const getProfile = async (req, res) => {
  try {
    return res.json({ profile: req.user.profile });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req, res) => {
  const { name, phone, avatar } = req.body;

  try {
    const updated = await prisma.profile.update({
      where: { id: req.user.profile.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(avatar && { avatar }),
      },
    });
    return res.json({ profile: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};
