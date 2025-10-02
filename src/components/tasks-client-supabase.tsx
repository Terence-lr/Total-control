'use client';

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { CheckSquare, Plus, Loader2, Calendar, Clock, Search, Workflow, Target, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSupabase } from "@/supabase/provider";
import { db, Task } from "@/supabase/database";
import { format, isToday, isFuture, parseISO } from 'date-fns';
import { AddTaskDialog } from "@/components/add-task-dialog";

const TaskCard = ({ task }: { task: Task }) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleCompletion = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const { error } = await db.updateTask(task.id, task.user_id, {
        completed: !task.completed
      });
      
      if (error) throw error;
      
      toast({
        title: task.completed ? "Task marked as incomplete" : "Task completed!",
        description: task.completed ? "Task has been marked as incomplete." : "Great job on completing this task."
      });
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error updating task",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'in_progress': return 'text-blue-500';
      case 'skipped': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      task.completed && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={handleToggleCompletion}
            disabled={isUpdating}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={cn(
                "font-medium text-sm",
                task.completed && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h3>
              <div className="flex items-center space-x-2">
                <span className={cn("text-xs font-medium", getPriorityColor(task.priority))}>
                  {task.priority}
                </span>
                <span className={cn("text-xs", getStatusColor(task.completed ? 'completed' : 'not_started'))}>
                  {task.completed ? 'completed' : 'not_started'}
                </span>
              </div>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {task.description}
              </p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
              {task.due_date && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{format(parseISO(task.due_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{format(parseISO(task.created_at), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function TasksClient() {
  const { user } = useSupabase();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await db.getTasks(user.id);
      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Error loading tasks",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const todayTasks = filteredTasks.filter(task => 
    task.due_date && isToday(parseISO(task.due_date))
  );

  const upcomingTasks = filteredTasks.filter(task => 
    task.due_date && isFuture(parseISO(task.due_date))
  );

  const overdueTasks = filteredTasks.filter(task => 
    task.due_date && !isToday(parseISO(task.due_date)) && !isFuture(parseISO(task.due_date))
  );

  const completedTasks = filteredTasks.filter(task => task.completed);
  const pendingTasks = filteredTasks.filter(task => !task.completed);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage your daily tasks and stay organized</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Tasks</p>
                <p className="text-2xl font-bold">{filteredTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{completedTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Today</p>
                <p className="text-2xl font-bold">{todayTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Lists */}
      <div className="space-y-6">
        {todayTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Today's Tasks</h2>
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {upcomingTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Upcoming Tasks</h2>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {overdueTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-red-500">Overdue Tasks</h2>
            <div className="space-y-3">
              {overdueTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "No tasks match your search." : "Get started by adding your first task."}
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Task Dialog */}
      {showAddDialog && (
        <AddTaskDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onTaskAdded={loadTasks}
        />
      )}
    </div>
  );
}
