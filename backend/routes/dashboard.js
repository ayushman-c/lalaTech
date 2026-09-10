const express = require('express');
const supabase = require('../config/supabase');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', auth, async (req, res) => {
  try {
    // Get task counts by status using RPC
    const { data: statusCounts } = await supabase.rpc('get_task_stats', {
      p_user_id: req.user.id,
      p_role: req.user.role
    });

    const counts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0, total: 0 };
    if (statusCounts) {
      statusCounts.forEach(row => {
        counts[row.status] = parseInt(row.count);
        counts.total += parseInt(row.count);
      });
    }

    // Base query filter for employees
    let baseFilter = supabase.from('tasks').select('*', { count: 'exact', head: true });
    if (req.user.role === 'employee') {
      baseFilter = baseFilter.eq('assigned_to', req.user.id);
    }

    // Overdue tasks
    const { count: overdue } = await baseFilter
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', new Date().toISOString());

    // Due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: dueToday } = await baseFilter
      .in('status', ['pending', 'in_progress'])
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString());

    // Due this week
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { count: dueThisWeek } = await baseFilter
      .in('status', ['pending', 'in_progress'])
      .gte('due_date', today.toISOString())
      .lt('due_date', weekEnd.toISOString());

    // User count (admin/manager only)
    let userCount = 0;
    if (req.user.role !== 'employee') {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      userCount = count || 0;
    }

    res.json({
      counts,
      overdue: overdue || 0,
      dueToday: dueToday || 0,
      dueThisWeek: dueThisWeek || 0,
      userCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/activity
router.get('/activity', auth, async (req, res) => {
  try {
    const { data: activity, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user:users(id, name, email, avatar),
        task:tasks(id, title, status)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ activity: activity || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/my-tasks
router.get('/my-tasks', auth, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_to:users!assigned_to(id, name, email, avatar),
        createdBy:users!created_by(id, name, email)
      `)
      .eq('assigned_to', req.user.id)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ tasks: tasks || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
