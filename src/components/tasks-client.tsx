"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { CheckSquare, Plus, Loader2, ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { addTaskToSchedule } from "@/ai/flows/add-task-to-schedule";
import { generateSchedule, GenerateScheduleOutput } from "@/ai/flows/generate-schedule";

type Task = {
  id: string;
  text: string;
  completed: boolean;
};

const initialTasks: Task[] = [
  { id: "1", text: "Finish report for Q2", completed: false },
  { id: "2", text: "Schedule dentist appointment", completed: true },
  { id: "3", text: "Buy groceries for the week", completed: false },
  { id: "4", text: "Call back the new client", completed: false },
];

export function TasksClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingToSchedule, setIsAddingToSchedule] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      } else {
        setTasks(initialTasks);
      }
    } catch (error) {
      console.error("Failed to load tasks from localStorage", error);
      setTasks(initialTasks);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error("Failed to save tasks to localStorage", error);
    }
  }, [tasks, isMounted]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    setIsAdding(true);
    // Simulate API call
    setTimeout(() => {
      const newTask: Task = {
        id: new Date().toISOString(), // More robust ID
        text: newTaskText,
        completed: false,
      };
      setTasks([newTask, ...tasks]);
      setNewTaskText("");
      setIsAdding(false);
    }, 500);
  };

  const handleAddTaskToSchedule = async (taskText: string) => {
    setIsAddingToSchedule(taskText);
    try {
        const savedSchedule = localStorage.getItem('schedule');
        if (!savedSchedule) {
            toast({
                title: "No active schedule",
                description: "Please generate a schedule on the dashboard first.",
                variant: "destructive",
            });
            return;
        }
        const schedule: GenerateScheduleOutput['schedule'] = JSON.parse(savedSchedule);

        const result = await addTaskToSchedule({
            existingSchedule: schedule,
            newTask: taskText,
            currentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });
        
        localStorage.setItem('schedule', JSON.stringify(result.schedule));

        toast({
            title: "Task Added to Schedule",
            description: `"${taskText}" has been added to your timeline.`,
        });

    } catch (error) {
        console.error("Error adding task to schedule:", error);
        toast({
            title: "Error",
            description: "Failed to add task to schedule. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsAddingToSchedule(null);
    }
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  if (!isMounted) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-6 w-6" />
                    Tasks
                </CardTitle>
                <CardDescription>
                    Manage your individual actions here. Add, view, and complete your
                    tasks for the day.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6" />
          Tasks
        </CardTitle>
        <CardDescription>
          Manage your individual actions here. Add, view, and complete your
          tasks for the day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
          <Input
            placeholder="Add a new task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            disabled={isAdding}
          />
          <Button type="submit" disabled={!newTaskText.trim() || isAdding}>
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="sr-only sm:not-sr-only sm:ml-2">Add Task</span>
          </Button>
        </form>

        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-4 rounded-lg border p-4 transition-colors",
                task.completed ? "bg-muted/50" : "bg-background"
              )}
            >
              <Checkbox
                id={`task-${task.id}`}
                checked={task.completed}
                onCheckedChange={() => toggleTaskCompletion(task.id)}
                aria-label={`Mark task "${task.text}" as ${
                  task.completed ? "incomplete" : "complete"
                }`}
              />
              <Label
                htmlFor={`task-${task.id}`}
                className={cn(
                  "flex-1 cursor-pointer text-base",
                  task.completed && "text-muted-foreground line-through"
                )}
              >
                {task.text}
              </Label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleAddTaskToSchedule(task.text)}
                disabled={isAddingToSchedule === task.text}
                aria-label="Add to schedule"
              >
                {isAddingToSchedule === task.text ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <ArrowRightCircle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </Button>
            </div>
          ))}
        </div>
        {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-40">
                <CheckSquare className="h-12 w-12 mb-4" />
                <p className="font-medium">No tasks yet.</p>
                <p className="text-sm">Add a new task above to get started.</p>
            </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          {tasks.filter((t) => !t.completed).length} tasks remaining.
        </p>
      </CardFooter>
    </Card>
  );
}
