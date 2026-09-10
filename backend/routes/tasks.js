const express = require('express');
const supabase = require('../config/supabase');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/tasks
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, assignedTo, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_to:users!assigned_to(id, name, email, avatar),
        createdBy:users!created_by(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // If employee, only show their tasks
    if (req.user.role === 'employee') {
      query = query.eq('assigned_to', req.user.id);
    }

    // Filters
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);

    // Search
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Pagination
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: tasks, count, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      tasks,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_to:users!assigned_to(id, name, email, avatar),
        createdBy:users!created_by(id, name, email)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get comments
    const { data: comments } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(id, name, email, avatar)
      `)
      .eq('task_id', task.id)
      .order('created_at', { ascending: false });

    // Get activity log
    const { data: activity } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user:users(id, name, email),
        task:tasks(id, title, status)
      `)
      .eq('task_id', task.id)
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({ task, comments: comments || [], activity: activity || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignedTo, tags } = req.body;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description: description || '',
        priority: priority || 'medium',
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
        created_by: req.user.id,
        tags: tags || []
      })
      .select(`
        *,
        assigned_to:users!assigned_to(id, name, email, avatar),
        createdBy:users!created_by(id, name, email)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      task_id: task.id,
      user_id: req.user.id,
      action: 'created',
      details: { title: task.title }
    });

    // Create notification if assigned
    if (assignedTo && assignedTo !== req.user.id) {
      await supabase.from('notifications').insert({
        user_id: assignedTo,
        type: 'task_assigned',
        message: `${req.user.name} assigned you to "${task.title}"`,
        task_id: task.id
      });
    }

    res.status(201).json({ task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, priority, dueDate, tags } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.due_date = dueDate;
    if (tags !== undefined) updates.tags = tags;

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', req.params.id)
      .select(`
        *,
        assigned_to:users!assigned_to(id, name, email, avatar),
        createdBy:users!created_by(id, name, email)
      `)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      task_id: task.id,
      user_id: req.user.id,
      action: 'updated',
      details: { changes: updates }
    });

    res.json({ task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check task exists and user has permission
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only admin, manager, or creator can delete
    if (req.user.role === 'employee' && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this task' });
    }

    // Delete task (CASCADE handles comments, activity_logs, notifications)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tasks/:id/assign
router.put('/:id/assign', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const { data: task, error } = await supabase
      .from('tasks')
      .update({ assigned_to: assignedTo || null })
      .eq('id', req.params.id)
      .select(`
        *,
        assigned_to:users!assigned_to(id, name, email, avatar),
        createdBy:users!created_by(id, name, email)
      `)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      task_id: task.id,
      user_id: req.user.id,
      action: 'assigned',
      details: { assignedTo }
    });

    // Create notification
    if (assignedTo) {
      await supabase.from('notifications').insert({
        user_id: assignedTo,
        type: 'task_assigned',
        message: `${req.user.name} assigned you to "${task.title}"`,
        task_id: task.id
      });
    }

    res.json({ task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/tasks/:id/status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    // Get current task
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!currentTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const oldStatus = currentTask.status;

    const { data: task, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', req.params.id)
      .select(`
        *,
        assigned_to:users!assigned_to(id, name, email, avatar),
        createdBy:users!created_by(id, name, email)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      task_id: task.id,
      user_id: req.user.id,
      action: 'status_changed',
      details: { oldStatus, newStatus: status }
    });

    // Notify task creator if changed by someone else
    if (task.createdBy?.id !== req.user.id) {
      await supabase.from('notifications').insert({
        user_id: task.createdBy.id,
        type: 'status_changed',
        message: `${req.user.name} changed "${task.title}" status to ${status}`,
        task_id: task.id
      });
    }

    res.json({ task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;

    // Check task exists
    const { data: task } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, created_by')
      .eq('id', req.params.id)
      .single();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        task_id: task.id,
        user_id: req.user.id,
        content
      })
      .select(`
        *,
        user:users(id, name, email, avatar)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      task_id: task.id,
      user_id: req.user.id,
      action: 'commented',
      details: { content: content.substring(0, 100) }
    });

    // Notify task assignee and creator
    const notifyUsers = new Set();
    if (task.assigned_to && task.assigned_to !== req.user.id) {
      notifyUsers.add(task.assigned_to);
    }
    if (task.created_by !== req.user.id) {
      notifyUsers.add(task.created_by);
    }

    const notifications = Array.from(notifyUsers).map(userId => ({
      user_id: userId,
      type: 'commented',
      message: `${req.user.name} commented on "${task.title}"`,
      task_id: task.id
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    res.status(201).json({ comment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/tasks/:id/comments
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(id, name, email, avatar)
      `)
      .eq('task_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ comments: comments || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
