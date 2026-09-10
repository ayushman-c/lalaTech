const express = require('express');
const supabase = require('../config/supabase');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/users
router.get('/', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, avatar, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ users: users || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, avatar, is_active, created_at, updated_at')
      .eq('id', req.params.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, email, name, role, avatar, is_active, created_at, updated_at')
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
