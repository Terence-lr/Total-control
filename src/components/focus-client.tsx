
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pause, Play, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { z } from "zod";

// Schema for a single event, consistent with other parts of the app
const ScheduleEventSchema = z.object({
  time: z.string(),
  task: z.string(),
  duration: z.string(),
});
type ScheduleEvent = z.infer<typeof ScheduleEventSchema>;

const parseDuration = (durationStr: string): number => {
  if (!durationStr) return 25 * 60;
  const minutesMatch = durationStr.match(/(\d+)\s*min/);
  if (minutesMatch) return parseInt(minutesMatch[1], 10) * 60;
  const hourMatch = durationStr.match(/(\d+)\s*hr/);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 3600;
  const numberMatch = durationStr.match(/^(\d+)$/);
  if (numberMatch) return parseInt(numberMatch[1], 10) * 60;
  return 25 * 60; // Default
};

export function FocusClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [schedule, setSchedule] = useState<ScheduleEvent[] | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
  const [initialTaskDuration, setInitialTaskDuration] = useState(25 * 60);
  const [timer, setTimer] = useState(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [totalFocusedTime, setTotalFocusedTime] = useState(0);

  const isTimerStarted = currentTaskIndex !== -1;
  const currentTask = schedule && currentTaskIndex !== -1 ? schedule[currentTaskIndex] : null;

  // Load schedule and state from localStorage
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedSchedule = localStorage.getItem('schedule');
      const savedCompletedTasks = localStorage.getItem('completedTasksCount');
      const savedFocusedTime = localStorage.getItem('totalFocusedTime');

      if (savedSchedule) {
        const parsedSchedule = JSON.parse(savedSchedule) as ScheduleEvent[];
        setSchedule(parsedSchedule);
        setCompletedTasksCount(savedCompletedTasks ? parseInt(savedCompletedTasks, 10) : 0);
        setTotalFocusedTime(savedFocusedTime ? parseInt(savedFocusedTime, 10) : 0);
      } else {
        // If no schedule, redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Failed to load from localStorage", error);
      router.push('/dashboard');
    }
  }, [router]);

  // Sync state with URL
  useEffect(() => {
    if (!isMounted || !schedule) return;

    const taskIndexParam = searchParams.get('taskIndex');
    const taskIndex = taskIndexParam ? parseInt(taskIndexParam, 10) : -1;
    
    if (taskIndex >= 0 && taskIndex < schedule.length) {
      if (taskIndex !== currentTaskIndex) {
        // If the task changes via URL, reset the timer state for the new task
        setIsTimerActive(false);
        const taskDuration = parseDuration(schedule[taskIndex].duration);
        setInitialTaskDuration(taskDuration);
        setTimer(taskDuration);
      }
      setCurrentTaskIndex(taskIndex);
      localStorage.setItem('currentTaskIndex', String(taskIndex));
    } else if (schedule.length > 0 && taskIndex === -1) {
        // Default to first task if no valid index is provided
        router.replace(`/dashboard/focus?taskIndex=0`);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isMounted, schedule]);

  // Save progress to localStorage
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('completedTasksCount', String(completedTasksCount));
      localStorage.setItem('totalFocusedTime', String(totalFocusedTime));
    } catch (error) {
      console.error("Failed to save progress to localStorage", error);
    }
  }, [completedTasksCount, totalFocusedTime, isMounted]);

  // Main timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && isTimerActive) {
      handleCompleteTask(false); // Auto-complete when timer hits zero
    }
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerActive, timer]);

  const startTask = useCallback(() => {
    if (currentTask) {
      setIsTimerActive(true);
    }
  }, [currentTask]);

  const toggleTimer = () => {
    setIsTimerActive(!isTimerActive);
  };

  const advanceToNextTask = useCallback(() => {
    const nextIndex = currentTaskIndex + 1;
    if (schedule && nextIndex < schedule.length) {
      router.push(`/dashboard/focus?taskIndex=${nextIndex}`);
    } else {
      // All tasks complete
      localStorage.setItem('currentTaskIndex', String(-1));
      toast({
        title: "Schedule Complete!",
        description: "You've finished all your tasks for the day. Well done!",
      });
      router.push('/dashboard');
    }
  }, [currentTaskIndex, schedule, router, toast]);

  const handleCompleteTask = (showToast = true) => {
    if (!currentTask) return;
    if (showToast) {
      toast({
        title: "Task Complete!",
        description: `You finished "${currentTask.task}".`,
      });
    }
    setCompletedTasksCount((prev) => prev + 1);
    setTotalFocusedTime((prev) => prev + (initialTaskDuration - timer));
    advanceToNextTask();
  };

  const handleSkipTask = () => {
    if (!currentTask) return;
    toast({
      title: "Task Skipped",
      description: `"${currentTask.task}" was skipped.`,
    });
    advanceToNextTask();
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  if (!isMounted || !schedule || !currentTask) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className={cn("relative h-64 w-64 md:h-80 md:w-80", timer < 60 && timer > 0 && isTimerActive && "pulse-timer")}>
        <ProgressCircle value={initialTaskDuration - timer} max={initialTaskDuration} />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <span className="text-6xl md:text-7xl font-bold text-foreground">
            {formatTime(timer)}
          </span>
        </div>
      </div>

      <h1 className="text-2xl md:text-4xl font-semibold mt-8">{currentTask.task}</h1>
      <p className="text-muted-foreground mt-2">
        Task {currentTaskIndex + 1} of {schedule.length}
      </p>

      <div className="mt-10 w-full max-w-sm">
        {!isTimerStarted || !isTimerActive ? (
          <Button size="lg" className="w-full h-14 text-lg" onClick={startTask} disabled={isTimerActive}>
            <Play className="mr-2 h-6 w-6" /> Start Task
          </Button>
        ) : (
          <div className="flex items-center justify-center space-x-4">
            <Button variant="outline" size="lg" onClick={toggleTimer} className="w-32 h-14 text-lg">
              {isTimerActive ? <Pause className="mr-2 h-6 w-6" /> : <Play className="mr-2 h-6 w-6" />}
              {isTimerActive ? "Pause" : "Resume"}
            </Button>
            <Button size="lg" onClick={() => handleCompleteTask()} className="w-32 h-14 text-lg">
              <Check className="mr-2 h-6 w-6" /> Complete
            </Button>
            <Button variant="ghost" size="lg" onClick={handleSkipTask} className="w-32 h-14 text-lg">
              <X className="mr-2 h-6 w-6" /> Skip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
