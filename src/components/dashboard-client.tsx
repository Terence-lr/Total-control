"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, Plus, Clock, Calendar as CalendarIcon, Zap, Pause, Play, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { generateSchedule, GenerateScheduleOutput } from "@/ai/flows/generate-schedule";
import { useToast } from "@/hooks/use-toast";

const initialTaskDuration = 25 * 60; // 25 minutes in seconds

export function DashboardClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [planText, setPlanText] = useState("");
  const [schedule, setSchedule] = useState<GenerateScheduleOutput['schedule'] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const [timer, setTimer] = useState(initialTaskDuration);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [currentTask, setCurrentTask] = useState("Team Stand-up");
  const [nextTask, setNextTask] = useState("Work on 'Website Setup' Flow");

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      // Handle task completion, e.g., play sound, show notification
      console.log("Task completed!");
      handleNextTask();
    }

    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  const toggleTimer = () => {
    setIsTimerActive(!isTimerActive);
  };

  const handleNextTask = useCallback(() => {
    // This will be replaced with logic to get the next task from the schedule
    setIsTimerActive(false);
    setCurrentTask(nextTask);
    setNextTask("Review PRs");
    setTimer(initialTaskDuration);
    // Automatically start the next task if desired
    // setIsTimerActive(true);
  }, [nextTask]);

  const handleSkipTask = () => {
    handleNextTask();
    toast({
        title: "Task Skipped",
        description: `"${currentTask}" was skipped.`,
    });
  };
  
  const handleCompleteTask = () => {
    setTimer(0);
    toast({
        title: "Task Complete!",
        description: `You've completed "${currentTask}". Great work!`,
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const handleGenerateSchedule = async () => {
    if (!planText.trim()) {
      toast({
        title: "Plan is empty",
        description: "Please enter your plan for the day.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateSchedule({ plan: planText });
      setSchedule(result.schedule);
      if (result.schedule && result.schedule.length > 0) {
        // Set up the timer with the first task from the schedule
        setCurrentTask(result.schedule[0].task);
        const next = result.schedule.length > 1 ? result.schedule[1].task : "End of schedule";
        setNextTask(next);
        
        // Simple duration parsing (e.g., "45min")
        const durationStr = result.schedule[0].duration;
        const durationMinutes = parseInt(durationStr.replace(/\D/g, ''), 10);
        if (!isNaN(durationMinutes)) {
            setTimer(durationMinutes * 60);
        } else {
            setTimer(initialTaskDuration); // fallback
        }
        setIsTimerActive(true);
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
  }: {
    trigger: React.ReactNode;
    title: string;
    description: string;
    inputLabel: string;
  }) => (
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
            <Input id="quick-capture-input" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

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
                <ProgressCircle value={timer} max={initialTaskDuration} className="absolute inset-0" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{formatTime(timer)}</span>
                  <span className="text-muted-foreground">{currentTask}</span>
                </div>
              </div>
              <div className="flex w-full items-center justify-center space-x-4">
                <Button variant="outline" size="lg" onClick={toggleTimer}>
                  {isTimerActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                  {isTimerActive ? "Pause" : "Resume"}
                </Button>
                <Button size="lg" onClick={handleCompleteTask}>
                  <Check className="mr-2 h-5 w-5" /> Complete
                </Button>
                <Button variant="ghost" size="lg" onClick={handleSkipTask}>
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
              onClick={handleGenerateSchedule}
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
            />
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Today's Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {schedule ? (
            <div className="relative pl-8">
              <div className="absolute left-4 top-2 h-full w-0.5 -translate-x-1/2 bg-border"></div>
              <ul className="space-y-10">
                {schedule.map((event, index) => (
                  <li key={index} className="relative">
                    <div
                      className={`absolute left-4 top-1 h-4 w-4 -translate-x-1/2 rounded-full ${event.task === currentTask ? 'bg-accent pulse-red' : 'bg-primary'}`}
                    ></div>
                    <div className="ml-6">
                      <p className={`font-semibold ${event.task === currentTask ? 'text-accent' : 'text-primary'}`}>{event.task}</p>
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
