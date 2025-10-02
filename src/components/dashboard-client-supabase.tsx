'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Clock, Calendar as CalendarIcon, CheckSquare, Target, Workflow, Repeat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSupabase } from "@/supabase/provider";
import { db, Task, Flow, Routine } from "@/supabase/database";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isToday } from 'date-fns';

export function DashboardClient() {
  const { user } = useSupabase();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [tasksResult, flowsResult, routinesResult] = await Promise.all([
        db.getTasks(user.id),
        db.getFlows(user.id),
        db.getRoutines(user.id)
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (flowsResult.error) throw flowsResult.error;
      if (routinesResult.error) throw routinesResult.error;

      setTasks(tasksResult.data || []);
      setFlows(flowsResult.data || []);
      setRoutines(routinesResult.data || []);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const todayTasks = tasks.filter(task => 
    task.due_date && isToday(parseISO(task.due_date))
  );

  const completedTasks = tasks.filter(task => task.completed);
  const pendingTasks = tasks.filter(task => !task.completed);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your tasks today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-500" />
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
              <CalendarIcon className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Today</p>
                <p className="text-2xl font-bold">{todayTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5" />
              <span>Tasks</span>
            </CardTitle>
            <CardDescription>
              Manage your daily tasks and stay organized
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You have {pendingTasks.length} pending tasks
            </p>
            <Button asChild className="w-full">
              <Link href="/tasks">
                <Plus className="h-4 w-4 mr-2" />
                Manage Tasks
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Workflow className="h-5 w-5" />
              <span>Flows</span>
            </CardTitle>
            <CardDescription>
              Create and manage your workflow processes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You have {flows.length} active flows
            </p>
            <Button asChild className="w-full">
              <Link href="/flows">
                <Plus className="h-4 w-4 mr-2" />
                Manage Flows
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Repeat className="h-5 w-5" />
              <span>Routines</span>
            </CardTitle>
            <CardDescription>
              Set up and track your daily routines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You have {routines.length} active routines
            </p>
            <Button asChild className="w-full">
              <Link href="/routines">
                <Plus className="h-4 w-4 mr-2" />
                Manage Routines
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Tasks</CardTitle>
            <CardDescription>
              Tasks scheduled for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center space-x-2 p-2 rounded-lg bg-secondary/50">
                  <div className={`w-2 h-2 rounded-full ${
                    task.completed ? 'bg-green-500' : 
                    task.priority === 'high' ? 'bg-red-500' :
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                  <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </span>
                  {task.completed && <CheckSquare className="h-4 w-4 text-green-500" />}
                </div>
              ))}
              {todayTasks.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  And {todayTasks.length - 5} more tasks...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>
            Your productivity overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">
                {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">
                {flows.length + routines.length}
              </p>
              <p className="text-sm text-muted-foreground">Active Workflows</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
