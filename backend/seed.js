const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const supabase = require('./config/supabase');

dotenv.config();

const seedData = async () => {
  try {
    console.log('Connecting to Supabase...');

    // Test connection
    const { error: testError } = await supabase.from('users').select('id').limit(1);
    if (testError) {
      console.error('Connection failed:', testError.message);
      process.exit(1);
    }
    console.log('Connected to Supabase');

    // Clear existing data (order matters for foreign keys)
    console.log('Clearing existing data...');
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Also clear auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }

    console.log('Cleared existing data');

    // Create auth users (trigger auto-creates profiles)
    const password = 'employee123';
    const users = [
      { email: 'admin@lalatech.com', password: 'admin123', name: 'Rajesh Kumar', role: 'admin' },
      { email: 'manager@lalatech.com', password: 'manager123', name: 'Priya Sharma', role: 'manager' },
      { email: 'sarah@lalatech.com', password: 'employee123', name: 'Sarah Johnson', role: 'employee' },
      { email: 'james@lalatech.com', password: 'employee123', name: 'James Wilson', role: 'employee' },
      { email: 'maria@lalatech.com', password: 'employee123', name: 'Maria Garcia', role: 'employee' }
    ];

    const createdUsers = [];
    for (const u of users) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name, role: u.role }
      });
      if (error) {
        console.error(`Failed to create ${u.email}:`, error.message);
      } else {
        console.log(`Created auth user: ${u.email}`);
        createdUsers.push({ id: data.user.id, ...u });
      }
    }

    // Wait for triggers to fire
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify profiles were created by trigger
    const { data: profiles } = await supabase.from('users').select('*');
    console.log(`Profiles created: ${profiles?.length || 0}`);

    // Map emails to IDs
    const getId = (email) => {
      const u = createdUsers.find(u => u.email === email) || profiles?.find(p => p.email === email);
      return u?.id;
    };

    const adminId = getId('admin@lalatech.com');
    const managerId = getId('manager@lalatech.com');
    const sarahId = getId('sarah@lalatech.com');
    const jamesId = getId('james@lalatech.com');
    const mariaId = getId('maria@lalatech.com');

    // Create tasks
    console.log('Creating tasks...');
    const tasks = [
      {
        title: 'Update client proposal document',
        description: 'Revise the Q3 proposal for ABC Corporation. Include new pricing structure and service offerings discussed in last meeting.',
        status: 'in_progress',
        priority: 'high',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: sarahId,
        created_by: managerId,
        tags: ['client', 'proposal']
      },
      {
        title: 'Prepare Q3 financial report',
        description: 'Compile quarterly financial data including revenue, expenses, and profit margins. Present to board next week.',
        status: 'pending',
        priority: 'high',
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: jamesId,
        created_by: managerId,
        tags: ['finance', 'quarterly']
      },
      {
        title: 'Fix website contact form bug',
        description: 'Contact form not sending emails on mobile devices. Investigate and fix the issue. Test on iOS and Android.',
        status: 'completed',
        priority: 'medium',
        due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: mariaId,
        created_by: adminId,
        tags: ['bug', 'website']
      },
      {
        title: 'Schedule team meeting for Monday',
        description: 'Set up weekly team sync meeting. Book conference room and send calendar invites to all team members.',
        status: 'pending',
        priority: 'low',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: sarahId,
        created_by: managerId,
        tags: ['meeting', 'scheduling']
      },
      {
        title: 'Review vendor contract renewal',
        description: 'Review and negotiate terms with TechSupplies Inc. Current contract expires end of month. Compare with 2 other vendors.',
        status: 'in_progress',
        priority: 'urgent',
        due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: jamesId,
        created_by: adminId,
        tags: ['vendor', 'contract']
      },
      {
        title: 'Onboard new client ABC Corp',
        description: 'Complete onboarding process for ABC Corporation. Set up accounts, send welcome package, schedule kickoff call.',
        status: 'in_progress',
        priority: 'high',
        due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: mariaId,
        created_by: managerId,
        tags: ['client', 'onboarding']
      },
      {
        title: 'Update employee handbook',
        description: 'Revise company policies section. Add remote work guidelines and update PTO policy per new regulations.',
        status: 'pending',
        priority: 'medium',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: null,
        created_by: adminId,
        tags: ['hr', 'policy']
      },
      {
        title: 'Process invoice #1234',
        description: 'Invoice from CloudHost Services for $2,450. Verify charges against contract and process payment.',
        status: 'pending',
        priority: 'high',
        due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to: sarahId,
        created_by: adminId,
        tags: ['finance', 'invoice']
      }
    ];

    const { data: createdTasks } = await supabase.from('tasks').insert(tasks).select();
    console.log(`Created ${createdTasks?.length || 0} tasks`);

    if (!createdTasks?.length) {
      console.log('No tasks created, aborting rest of seed');
      process.exit(1);
    }

    // Create comments
    console.log('Creating comments...');
    const comments = [
      { task_id: createdTasks[0].id, user_id: sarahId, content: 'Started working on the proposal. Will have first draft ready by end of day.' },
      { task_id: createdTasks[0].id, user_id: managerId, content: 'Great! Make sure to include the new pricing tiers we discussed.' },
      { task_id: createdTasks[2].id, user_id: mariaId, content: 'Fixed the issue. It was a validation error on mobile. Deployed to production.' },
      { task_id: createdTasks[4].id, user_id: jamesId, content: 'Got quotes from 2 alternative vendors. Will prepare comparison spreadsheet.' },
      { task_id: createdTasks[5].id, user_id: mariaId, content: 'Sent welcome package to client. Kickoff call scheduled for Thursday.' }
    ];

    const { data: createdComments } = await supabase.from('comments').insert(comments).select();
    console.log(`Created ${createdComments?.length || 0} comments`);

    // Create activity logs
    console.log('Creating activity logs...');
    const activityLogs = [
      { task_id: createdTasks[0].id, user_id: managerId, action: 'created', details: { title: 'Update client proposal document' } },
      { task_id: createdTasks[0].id, user_id: managerId, action: 'assigned', details: { assignedTo: sarahId } },
      { task_id: createdTasks[0].id, user_id: sarahId, action: 'status_changed', details: { oldStatus: 'pending', newStatus: 'in_progress' } },
      { task_id: createdTasks[2].id, user_id: mariaId, action: 'status_changed', details: { oldStatus: 'in_progress', newStatus: 'completed' } },
      { task_id: createdTasks[4].id, user_id: jamesId, action: 'status_changed', details: { oldStatus: 'pending', newStatus: 'in_progress' } }
    ];

    const { data: createdLogs } = await supabase.from('activity_logs').insert(activityLogs).select();
    console.log(`Created ${createdLogs?.length || 0} activity logs`);

    // Create notifications
    console.log('Creating notifications...');
    const notifications = [
      { user_id: sarahId, type: 'task_assigned', message: 'Priya Sharma assigned you to "Update client proposal document"', task_id: createdTasks[0].id },
      { user_id: managerId, type: 'status_changed', message: 'Sarah Johnson changed "Update client proposal document" status to in_progress', task_id: createdTasks[0].id },
      { user_id: sarahId, type: 'commented', message: 'Priya Sharma commented on "Update client proposal document"', task_id: createdTasks[0].id }
    ];

    const { data: createdNotifs } = await supabase.from('notifications').insert(notifications).select();
    console.log(`Created ${createdNotifs?.length || 0} notifications`);

    console.log('\n✅ Seed completed successfully!');
    console.log('\nDemo accounts:');
    console.log('  Admin:    admin@lalatech.com / admin123');
    console.log('  Manager:  manager@lalatech.com / manager123');
    console.log('  Employee: sarah@lalatech.com / employee123');
    console.log('  Employee: james@lalatech.com / employee123');
    console.log('  Employee: maria@lalatech.com / employee123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
