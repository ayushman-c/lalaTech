import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Clock, 
  MessageSquare,
  Activity,
  Send,
  Trash2,
  Edit
} from 'lucide-react';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTask();
    fetchUsers();
  }, [id]);

  const fetchTask = async () => {
    try {
      const res = await tasksAPI.getOne(id);
      setTask(res.data.task);
      setComments(res.data.comments);
      setActivity(res.data.activity);
    } catch (error) {
      console.error('Failed to fetch task:', error);
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await usersAPI.getAll();
      setUsers(res.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await tasksAPI.updateStatus(id, { status: newStatus });
      setTask(res.data.task);
      fetchTask(); // Refresh to get updated activity
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAssign = async (assignedTo) => {
    try {
      const res = await tasksAPI.assign(id, { assignedTo });
      setTask(res.data.task);
      fetchTask();
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await tasksAPI.addComment(id, { content: newComment });
      setNewComment('');
      fetchTask();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await tasksAPI.delete(id);
      navigate('/tasks');
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'in_progress':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'cancelled':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'high':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'medium':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'low':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const isOverdue = () => {
    if (!task?.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date();
  };

  const canEdit = () => {
    return user.role === 'admin' || user.role === 'manager' || task?.createdBy?._id === user._id;
  };

  const canAssign = () => {
    return user.role === 'admin' || user.role === 'manager';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tasks')}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className={`text-2xl font-bold ${isOverdue() ? 'text-destructive' : 'text-foreground'}`}>
            {task.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            Created by {task.createdBy?.name} • {formatTimeAgo(task.createdAt)}
          </p>
        </div>
        {canEdit() && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tasks/${id}/edit`)}
            >
              <Edit size={16} className="mr-1" />
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-3">Description</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {task.description || 'No description provided.'}
            </p>
          </div>

          {/* Comments */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <MessageSquare size={18} />
                Comments ({comments.length})
              </h2>
            </div>
            
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {comment.user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{comment.user?.name}</span>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
                      </div>
                      <p className="text-muted-foreground mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newComment.trim()}
                  loading={submitting}
                >
                  <Send size={16} />
                </Button>
              </div>
            </form>
          </div>

          {/* Activity Log */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Activity size={18} />
                Activity
              </h2>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {activity.map((item) => (
                <div key={item._id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <p className="text-foreground">
                      <span className="font-medium">{item.user?.name}</span>
                      {' '}
                      <span className="text-muted-foreground">
                        {item.action === 'created' && 'created this task'}
                        {item.action === 'updated' && 'updated the task'}
                        {item.action === 'assigned' && 'assigned the task'}
                        {item.action === 'status_changed' && `changed status to ${item.details?.newStatus}`}
                        {item.action === 'commented' && 'added a comment'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTimeAgo(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-medium text-foreground mb-3">Status</h3>
            <div className="space-y-2">
              {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    task.status === status
                      ? `${getStatusColor(status)} border`
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-medium text-foreground mb-3">Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={16} className="text-muted-foreground" />
                <span className={isOverdue() ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                  {formatDate(task.dueDate)}
                  {isOverdue() && ' (Overdue)'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                </span>
              </div>
            </div>
          </div>

          {/* Assignee */}
          {canAssign() && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-medium text-foreground mb-3">Assignee</h3>
              <select
                value={task.assignedTo?._id || ''}
                onChange={(e) => handleAssign(e.target.value || null)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
