
'use client';

import { useState, useEffect, useMemo } from "react";
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
import { useFirebase, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, serverTimestamp } from "firebase/firestore";
import { useCollection, WithId } from "@/firebase/firestore/use-collection";
import { format, isToday, isFuture, parseISO } from 'date-fns';
import { AddTaskDialog } from "@/components/add-task-dialog";
import { toggleTaskCompletion } from "@/firebase/firestore/mutations";

// Matches the Task entity in backend.json
export type Task = {
    name: string;
    duration_minutes?: number;
    scheduled_time?: string;
    date?: string;
    completed: boolean;
    status: "not_started" | "in_progress" | "completed" | "skipped";
    type: "task" | "flow_task" | "routine_task";
    notes?: string;
    linked_goal_id?: string;
    linked_flow_id?: string;
    created_from: "voice" | "manual" | "flow";
    created_at: any; // Using `any` for Firestore Timestamp compatibility
    updated_at: any;
    userId: string;
};


const TaskCard = ({ task }: { task: WithId<Task> }) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const handleToggleCompletion = async () => {
        if (!firestore) return;
        try {
            await toggleTaskCompletion(firestore, task.userId, task.id, !task.completed);
        } catch (error) {
            console.error("Error toggling task completion:", error);
            toast({
                title: "Error",
                description: "Could not update task status.",
                variant: "destructive",
            });
        }
    };

    const cardBorderColor = () => {
        // TODO: Add logic for high priority or overdue
        if (task.type === "routine_task") return "border-l-gray-500";
        return "border-l-foreground";
    };

    return (
        <Card className={cn("w-full transition-all hover:shadow-md", cardBorderColor(), "border-l-4")}>
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <Checkbox
                        id={`task-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={handleToggleCompletion}
                        className="mt-1"
                        aria-label={`Mark task "${task.name}" as ${task.completed ? "incomplete" : "complete"}`}
                    />
                    <div className="flex-1">
                        <Label
                            htmlFor={`task-${task.id}`}
                            className={cn(
                                "flex-1 cursor-pointer text-base font-medium",
                                task.completed && "text-muted-foreground line-through"
                            )}
                        >
                            {task.name}
                        </Label>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                            {task.duration_minutes && (
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    {task.duration_minutes} min
                                </span>
                            )}
                            {task.date && task.scheduled_time && (
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    {format(parseISO(task.date), 'MMM d')} at {task.scheduled_time}
                                </span>
                            )}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            {task.type === 'routine_task' && (
                                <span className="flex items-center gap-1.5"><Workflow className="h-3 w-3" /> Part of Routine</span>
                            )}
                             {task.linked_goal_id && (
                                <span className="flex items-center gap-1.5"><Target className="h-3 w-3" /> Goal: Grow business</span>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export function TasksClient() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const tasksQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        const tasksRef = collection(firestore, 'users', user.uid, 'tasks');
        return query(tasksRef, orderBy("created_at", "desc"));
    }, [user, firestore]);
    
    const { data: tasks, isLoading: areTasksLoading, error: tasksError } = useCollection<Task>(tasksQuery);
    
    const [todayTasks, upcomingTasks] = useMemo(() => {
        if (!tasks) return [[], []];
        const today: WithId<Task>[] = [];
        const upcoming: WithId<Task>[] = [];
        
        tasks.forEach(task => {
            if (task.date) {
                try {
                    const taskDate = parseISO(task.date);
                    if (isToday(taskDate)) {
                        today.push(task);
                    } else if (isFuture(taskDate)) {
                        upcoming.push(task);
                    }
                } catch(e) {
                    // tasks without a valid date are considered for today
                    today.push(task);
                }
            } else {
                // Assume tasks without a date are for today for now
                today.push(task);
            }
        });

        return [today, upcoming];
    }, [tasks]);

    useEffect(() => {
        if(tasksError) {
            toast({
                title: "Error loading tasks",
                description: tasksError.message,
                variant: "destructive"
            })
        }
    }, [tasksError, toast]);

    const isLoading = areTasksLoading || isUserLoading;

    const TaskList = ({ title, tasks, date }: { title: string, tasks: WithId<Task>[], date?: string }) => (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">{title} <span className="text-muted-foreground text-sm font-normal">{date}</span></h2>
            {tasks.length > 0 ? (
                <div className="space-y-3">
                    {tasks.map(task => <TaskCard key={task.id} task={task} />)}
                </div>
            ) : (
                <p className="text-muted-foreground text-sm">No tasks for this section.</p>
            )}
        </div>
    );

    return (
        <>
            <AddTaskDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <CheckSquare className="h-6 w-6" />
                                Tasks
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Manage your individual actions here. Add, view, and complete your tasks.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" size="icon">
                                <Mic className="h-5 w-5" />
                                <span className="sr-only">Add Task with Voice</span>
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="h-5 w-5" />
                                <span className="sr-only">Add Task</span>
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                       <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">Today</Button>
                            <Button variant="ghost" size="sm">Week</Button>
                            <Button variant="ghost" size="sm">All</Button>
                       </div>
                       <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search tasks..." className="pl-9"/>
                       </div>
                       <div className="flex items-center gap-2">
                            {/* Sort dropdown will go here */}
                       </div>
                    </CardContent>
                </Card>

                {isLoading ? (
                    <div className="flex items-center justify-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    </div>
                ) : tasks ? (
                    tasks.length > 0 ? (
                        <div className="space-y-8">
                            <TaskList title="Today" tasks={todayTasks} date={format(new Date(), 'MMMM d')} />
                            {upcomingTasks.length > 0 && <TaskList title="Upcoming" tasks={upcomingTasks} />}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground space-y-4 rounded-lg border-2 border-dashed">
                            <CheckSquare className="h-12 w-12 mx-auto" />
                            <h3 className="font-medium text-lg">No tasks yet.</h3>
                            <p className="text-sm">Tap '+' or the voice button to add your first task.</p>
                        </div>
                    )
                ) : null}
            </div>
        </>
    );
}

