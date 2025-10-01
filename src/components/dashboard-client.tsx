
"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, Plus, Clock, Calendar as CalendarIcon, Zap, Pause, Play, Check, X, Loader2, Award, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { generateSchedule, GenerateScheduleOutput } from "@/ai/flows/generate-schedule";
import { useToast } from "@/hooks/use-toast";

const parseDuration = (durationStr: string): number => {
  const minutesMatch = durationStr.match(/(\d+)\s*min/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10) * 60;
  }
  const hourMatch = durationStr.match(/(\d+)\s*hr/);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 3600;
  }
  // Fallback for just a number, assuming minutes
  const numberMatch = durationStr.match(/^(\d+)$/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10) * 60;
  }
  return 25 * 60; // Default to 25 minutes if parsing fails
};

export function DashboardClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [planText, setPlanText] = useState("");
  const [schedule, setSchedule] = useState<GenerateScheduleOutput['schedule'] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
  const [initialTaskDuration, setInitialTaskDuration] = useState(25 * 60);
  const [timer, setTimer] = useState(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [totalFocusedTime, setTotalFocusedTime] = useState(0); // in seconds
  
  const currentTask = schedule && currentTaskIndex !== -1 ? schedule[currentTaskIndex]?.task : "Ready";
  const nextTask = schedule && currentTaskIndex + 1 < schedule.length ? schedule[currentTaskIndex + 1]?.task : "End of schedule";

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0 && isTimerActive) {
      handleCompleteTask(false); // Don't show toast on auto-completion
    }

    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  const toggleTimer = () => {
    if (currentTaskIndex === -1 && schedule && schedule.length > 0) {
      // If timer hasn't started yet, start with the first task
      startTask(0);
    } else {
      setIsTimerActive(!isTimerActive);
    }
  };
  
  const startTask = useCallback((index: number) => {
    if (schedule && index < schedule.length) {
      setCurrentTaskIndex(index);
      const taskDuration = parseDuration(schedule[index].duration);
      setInitialTaskDuration(taskDuration);
      setTimer(taskDuration);
      setIsTimerActive(true);
    } else {
      // End of schedule
      setCurrentTaskIndex(-1);
      setIsTimerActive(false);
      setTimer(initialTaskDuration);
      toast({
          title: "Schedule Complete!",
          description: "You've completed all tasks for today. Well done!",
      });
    }
  }, [schedule, initialTaskDuration, toast]);

  const handleNextTask = useCallback(() => {
    startTask(currentTaskIndex + 1);
  }, [currentTaskIndex, startTask]);

  const handleSkipTask = () => {
    if(currentTaskIndex === -1) return;
    toast({
        title: "Task Skipped",
        description: `"${currentTask}" was skipped.`,
    });
    handleNextTask();
  };
  
  const handleCompleteTask = (showToast = true) => {
    if(currentTaskIndex === -1) return;
    if (showToast) {
      toast({
          title: "Task Complete!",
          description: `You've completed "${currentTask}". Great work!`,
      });
    }
    setCompletedTasksCount(prev => prev + 1);
    setTotalFocusedTime(prev => prev + initialTaskDuration);
    handleNextTask();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const formatFocusedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours === 0) result += `${minutes}m`;
    return result.trim();
  }

  const handleGenerateSchedule = async (plan: string) => {
    if (!plan.trim()) {
      toast({
        title: "Plan is empty",
        description: "Please enter your plan for the day.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    setSchedule(null);
    setCurrentTaskIndex(-1);
    setIsTimerActive(false);
    setCompletedTasksCount(0);
    setTotalFocusedTime(0);

    try {
      const result = await generateSchedule({ plan });
      setSchedule(result.schedule);
      if (result.schedule && result.schedule.length > 0) {
        startTask(0);
      } else {
        toast({
            title: "Empty Schedule",
            description: "Could not generate a schedule from your plan. Try being more specific.",
            variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };


  const QuickCaptureDialog = ({
    trigger,
    title,
    description,
    inputLabel,
    onConfirm,
  }: {
    trigger: React.ReactNode;
    title: string;
    description: string;
    inputLabel: string;
    onConfirm?: (value: string) => void;
  }) => {
    const [inputValue, setInputValue] = useState("");

    const handleConfirm = () => {
      onConfirm?.(inputValue);
      setInputValue("");
    }

    return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quick-capture-input" className="text-right">
              {inputLabel}
            </Label>
            <Input id="quick-capture-input" className="col-span-3" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="submit" onClick={handleConfirm}>Add</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Now Playing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative h-48 w-48">
                <ProgressCircle value={timer} max={initialTaskDuration} />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-14">
                  <span className="text-4xl font-bold text-primary">{formatTime(timer)}</span>
                  <span className="text-muted-foreground text-center truncate w-full block">{currentTask}</span>
                </div>
              </div>
              <div className="flex w-full items-center justify-center space-x-4">
                 <Button variant="outline" size="lg" onClick={toggleTimer} disabled={currentTaskIndex === -1}>
                  {isTimerActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                  {isTimerActive ? "Pause" : "Resume"}
                </Button>
                <Button size="lg" onClick={() => handleCompleteTask()} disabled={currentTaskIndex === -1}>
                  <Check className="mr-2 h-5 w-5" /> Complete
                </Button>
                <Button variant="ghost" size="lg" onClick={handleSkipTask} disabled={currentTaskIndex === -1}>
                  <X className="mr-2 h-5 w-5" /> Skip
                </Button>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground">Up next: </span> 
                <span className="font-medium text-primary">{nextTask}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
                <Award className="h-8 w-8 text-accent"/>
                <div>
                    <p className="text-2xl font-bold">{completedTasksCount}</p>
                    <p className="text-muted-foreground">Tasks done</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <BrainCircuit className="h-8 w-8 text-accent"/>
                <div>
                    <p className="text-2xl font-bold">{formatFocusedTime(totalFocusedTime)}</p>
                    <p className="text-muted-foreground">Focused time</p>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              What's on your plate today?
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              <Button
                size="icon"
                aria-label="Start recording"
                className={`h-24 w-24 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 ${
                  isRecording ? "bg-accent pulse-red" : ""
                }`}
                onClick={() => setIsRecording(!isRecording)}
              >
                <Mic className="h-10 w-10" />
              </Button>
            </div>
            <Textarea
              placeholder="Speak or type your plan... e.g., 'I have a meeting at 10am for 45min, need to finish the report by 3pm, and want to go for a run in the evening for 1 hour.'"
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              className="min-h-[120px] text-base"
            />
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={!planText || isGenerating}
              onClick={() => handleGenerateSchedule(planText)}
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isGenerating ? 'Generating...' : 'Generate Schedule'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Capture</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickCaptureDialog
              trigger={
                <Button variant="outline" className="flex-col h-24">
                  <Plus className="h-6 w-6 mb-1" />
                  Just Add This
                </Button>
              }
              title="Just Add This"
              description="Quickly add a new task to your schedule."
              inputLabel="Task"
            />
            <QuickCaptureDialog
              trigger={
                <Button variant="outline" className="flex-col h-24">
                  <Clock className="h-6 w-6 mb-1" />
                  I'm Running Late
                </Button>
              }
              title="I'm Running Late"
              description="Adjust your schedule because you're running late."
              inputLabel="Delay"
            />
            <QuickCaptureDialog
              trigger={
                <Button variant="outline" className="flex-col h-24">
                  <CalendarIcon className="h-6 w-6 mb-1" />
                  Tomorrow Mode
                </Button>
              }
              title="Tomorrow Mode"
              description="Plan ahead for your next day."
              inputLabel="Plan"
            />
            <QuickCaptureDialog
              trigger={
                <Button variant="outline" className="flex-col h-24 text-center">
                  <Zap className="h-6 w-6 mb-1" />
                  Morning Dump
                </Button>
              }
              title="Morning Dump"
              description="Lay out everything you need to do today."
              inputLabel="Dump"
              onConfirm={(value) => handleGenerateSchedule(value)}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Today's Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {schedule && schedule.length > 0 ? (
            <div className="relative pl-8">
              <div className="absolute left-4 top-2 h-full w-0.5 -translate-x-1/2 bg-border"></div>
              <ul className="space-y-10">
                {schedule.map((event, index) => (
                  <li key={index} className="relative">
                    <div
                      className={`absolute left-4 top-1 h-4 w-4 -translate-x-1/2 rounded-full ${index === currentTaskIndex ? 'bg-accent pulse-red' : (index < currentTaskIndex ? 'bg-primary' : 'bg-border')}`}
                    >
                     {index < currentTaskIndex && <Check className="h-4 w-4 text-primary-foreground" />}
                    </div>
                    <div className="ml-6">
                      <p className={`font-semibold ${index === currentTaskIndex ? 'text-accent' : (index < currentTaskIndex ? 'text-muted-foreground line-through' : 'text-primary')}`}>{event.task}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.time} &middot; {event.duration}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-8">
              <CalendarIcon className="h-12 w-12 mb-4" />
              <p className="font-medium">Your schedule is empty.</p>
              <p className="text-sm">
                Generate a schedule from your plan to see your timeline here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
