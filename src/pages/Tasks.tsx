import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
  User,
  MoreHorizontal,
  CheckCircle,
  Zap
} from 'lucide-react';
import { 
  Task, 
  TaskStatus, 
  Priority, 
  ROUTE_PATHS 
} from '@/lib/index';
import { useTRPData } from '@/lib/trpData';
import { deprioritizeWaiting } from '@/lib/utils';
import { DataTable } from '@/components/DataTable';
import { AddTaskModal } from '@/components/Modals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';

export default function Tasks() {
  const { state, addTask, updateTask, deleteTask, setTopPriority, clearTaskWaiting, addActivity } = useTRPData();
  const tasks = state.tasks;
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingInitial, setEditingInitial] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status !== 'completed').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
    // deprioritize waiting tasks so they appear lower in lists
  }, [tasks, searchQuery, filterStatus]);

  const sortedFilteredTasks = useMemo(() => deprioritizeWaiting(filteredTasks), [filteredTasks]);

  const handleAddTask = (newTask: any) => {
    const client = state.clients.find(c => c.id === (newTask.clientId || ''));
    const clientName = client ? client.name : (newTask.clientName || '');
    if (editingTaskId) {
      updateTask(editingTaskId, {
        title: newTask.title,
        description: newTask.description || "",
        clientId: newTask.clientId || "",
        clientName,
        status: newTask.status,
        priority: newTask.priority,
        dueDate: newTask.dueDate || "",
        assignedTo: newTask.assignedTo || "Me",
        type: newTask.type || "admin",
        toolLink: newTask.toolLink,
      });
      setEditingTaskId(null);
      setEditingInitial(null);
    } else {
      addTask({
        title: newTask.title,
        description: newTask.description || "",
        clientId: newTask.clientId || "",
        clientName,
        status: newTask.status,
        priority: newTask.priority,
        dueDate: newTask.dueDate || "",
        assignedTo: newTask.assignedTo || "Me",
        type: newTask.type || "admin",
        toolLink: newTask.toolLink,
      });
    }
    setIsModalOpen(false);
  };

  const toggleTaskStatus = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateTask(taskId, { status: newStatus });
  };

  const columns = [
    {
      header: 'Task',
      key: 'title',
    },
    {
      header: 'Client',
      key: 'clientName',
    },
    {
      header: 'Priority',
      key: 'priority',
      type: 'priority' as const,
    },
    {
      header: 'Status',
      key: 'status',
      type: 'status' as const,
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      type: 'date' as const,
    },
    {
      header: 'Assignee',
      key: 'assignedTo',
    },
  ];

  return (
    <div className="space-y-8 p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Task Management</h1>
          <p className="text-muted-foreground">Manage workflows, track progress, and hit deadlines for all active clients.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
              <h3 className="text-2xl font-bold">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <h3 className="text-2xl font-bold">{stats.pending}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <h3 className="text-2xl font-bold">{stats.completed}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Urgent Actions</p>
              <h3 className="text-2xl font-bold">{stats.urgent}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="border-border text-foreground flex items-center gap-2"
              onClick={() => setFilterStatus('all')}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <div className="h-8 w-px bg-border mx-2 hidden md:block" />
            <div className="flex gap-1 overflow-x-auto pb-2 md:pb-0">
              {(['all', 'todo', 'in-progress', 'review', 'completed'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'secondary' : 'ghost'}
                  size="sm"
                  className="capitalize whitespace-nowrap"
                  onClick={() => setFilterStatus(status)}
                >
                  {status.replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Table */}
      <Card className="border-border bg-card overflow-hidden">
        <DataTable
          data={sortedFilteredTasks}
          columns={columns}
          actions={(task: Task) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border dark:bg-black">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => toggleTaskStatus(task.id)} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {task.status === 'completed' ? 'Mark as Pending' : 'Mark as Done'}
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Reassign
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setEditingTaskId(task.id); setEditingInitial(task); setIsModalOpen(true); }} className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Top 3 (Today)</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTopPriority(task.id, 1)} className="flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Set #1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTopPriority(task.id, 2)} className="flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Set #2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTopPriority(task.id, 3)} className="flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Set #3
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTopPriority(task.id, null)} className="flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Remove from Top 3
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {task.status === 'waiting' ? (
                  <DropdownMenuItem onClick={() => { try { clearTaskWaiting(task.id); addActivity({ clientId: task.clientId, clientName: task.clientName, type: 'status_change', notes: 'Cleared waiting on task (from tasks)', timestamp: new Date().toISOString() }); } catch (e) {} }} className="flex items-center gap-2">
                    Mark Not Waiting
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-destructive focus:text-destructive">
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </Card>

      {/* Modal */}
      <AddTaskModal
        isOpen={isModalOpen}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTaskId(null); setEditingInitial(null); }}
        onSubmit={handleAddTask}
        initialValues={editingInitial || undefined}
      />
    </div>
  );
}
