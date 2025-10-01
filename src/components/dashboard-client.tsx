
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, Plus, Clock, Calendar as CalendarIcon, Zap, Pause, Play, Check, X, Loader2, Award, BrainCircuit, Bot, Sparkles, Book, Lightbulb, ArrowRight, NotebookText, FileInput, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { generateSchedule, GenerateScheduleInput, GenerateScheduleOutput } from "@/ai/flows/generate-schedule";
import { addTaskToSchedule } from "@/ai/flows/add-task-to-schedule";
import { adjustScheduleForDelay } from "@/ai/flows/adjust-schedule-for-delay";
import { summarizeDay, SummarizeDayOutput } from "@/ai/flows/summarize-day";
import { getCurrentTime, GetCurrentTimeOutput } from "@/ai/flows/get-current-time";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { DialogTrigger } from "@radix-ui/react-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

// Schema for a single event, consistent with generate-schedule flow
const ScheduleEventSchema = z.object({
  time: z.string().describe('The start time of the event (e.g., "09:00 AM").'),
  task: z.string().describe('A short description of the task or event.'),
  duration: z.string().describe('The estimated duration of the event (e.g., "45min", "1hr").'),
});
type ScheduleEvent = z.infer<typeof ScheduleEventSchema>;

type Conversation = { question: string; answer: string };

const parseDuration = (durationStr: string): number => {
  if (!durationStr) return 25 * 60;
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

const timeToMinutes = (timeStr: string): number => {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period && period.toLowerCase() === 'pm' && hours !== 12) {
    hours += 12;
  }
  if (period && period.toLowerCase() === 'am' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
};


export function DashboardClient() {
  const [planText, setPlanText] = useState("");
  const [schedule, setSchedule] = useState<ScheduleEvent[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<SummarizeDayOutput | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const { toast } = useToast();

  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
  const [initialTaskDuration, setInitialTaskDuration] = useState(25 * 60);
  const [timer, setTimer] = useState(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [totalFocusedTime, setTotalFocusedTime] = useState(0); // in seconds
  const [currentTime, setCurrentTime] = useState<GetCurrentTimeOutput | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [tomorrowsPlan, setTomorrowsPlan] = useState<string | null>(null);
  
  const [clarificationState, setClarificationState] = useState<{
    questions: string[];
    conversation: Conversation[];
    originalPlan: string;
  } | null>(null);

  const currentTask = schedule && currentTaskIndex !== -1 ? schedule[currentTaskIndex]?.task : "Ready";
  const nextTask = schedule && currentTaskIndex + 1 < schedule.length ? schedule[currentTaskIndex + 1]?.task : "End of schedule";

  const handleFinalTranscript = (finalTranscript: string) => {
    if (clarificationState) {
        handleClarificationResponse(finalTranscript);
    } else {
        handleGenerateSchedule(finalTranscript);
    }
  };

  const {
    isRecording,
    isProcessing,
    isAvailable,
    transcript,
    startRecognition,
    stopRecognition,
    cancelRecognition,
    error,
    recordingTime,
    setTranscript,
  } = useSpeechRecognition({
      onTranscriptFinal: handleFinalTranscript,
      isGenerating: isGenerating, // Pass down the generating state
  });
  
  const processingOrGenerating = isProcessing || isGenerating;
  
  const scheduleIsComplete = schedule && schedule.length > 0 && currentTaskIndex === -1 && completedTasksCount === schedule.length;

  // Load from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedSchedule = localStorage.getItem('schedule');
      const savedCurrentTaskIndex = localStorage.getItem('currentTaskIndex');
      const savedCompletedTasks = localStorage.getItem('completedTasksCount');
      const savedFocusedTime = localStorage.getItem('totalFocusedTime');
      const savedTomorrowsPlan = localStorage.getItem('tomorrowsPlan');


      if (savedTomorrowsPlan) {
        setTomorrowsPlan(savedTomorrowsPlan);
      }

      if (savedSchedule) {
        const parsedSchedule = JSON.parse(savedSchedule);
        setSchedule(parsedSchedule);
        
        const taskIndex = savedCurrentTaskIndex ? parseInt(savedCurrentTaskIndex, 10) : -1;
        
        if(taskIndex !== -1 && taskIndex < parsedSchedule.length) {
            const taskDuration = parseDuration(parsedSchedule[taskIndex].duration);
            setInitialTaskDuration(taskDuration);
            setTimer(taskDuration);
        }

        setCurrentTaskIndex(taskIndex);
        setCompletedTasksCount(savedCompletedTasks ? parseInt(savedCompletedTasks, 10) : 0);
        setTotalFocusedTime(savedFocusedTime ? parseInt(savedFocusedTime, 10) : 0);
      }
    } catch (error) {
      console.error("Failed to load from localStorage", error);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!isMounted) return; // Don't save on initial server render
    try {
      if (schedule) {
        localStorage.setItem('schedule', JSON.stringify(schedule));
        localStorage.setItem('currentTaskIndex', String(currentTaskIndex));
        localStorage.setItem('completedTasksCount', String(completedTasksCount));
        localStorage.setItem('totalFocusedTime', String(totalFocusedTime));
      } else {
        localStorage.removeItem('schedule');
        localStorage.removeItem('currentTaskIndex');
        localStorage.removeItem('completedTasksCount');
        localStorage.removeItem('totalFocusedTime');
      }

      if (tomorrowsPlan) {
        localStorage.setItem('tomorrowsPlan', tomorrowsPlan);
      } else {
        localStorage.removeItem('tomorrowsPlan');
      }

    } catch (error) {
      console.error("Failed to save to localStorage", error);
    }
  }, [schedule, currentTaskIndex, completedTasksCount, totalFocusedTime, isMounted, tomorrowsPlan]);


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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerActive, timer]);

  useEffect(() => {
    const fetchTime = async () => {
      try {
        const time = await getCurrentTime();
        setCurrentTime(time);
      } catch (error) {
        console.error("Error fetching current time:", error);
      }
    };
    
    fetchTime();
    const timeInterval = setInterval(fetchTime, 60000); // Update every minute
    return () => clearInterval(timeInterval);
  }, []);

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
      setCompletedTasksCount(schedule?.length || 0); // Mark all as completed
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
    setTotalFocusedTime(prev => prev + (initialTaskDuration - timer)); // More accurate time
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
  
  const callGenerateSchedule = async (input: GenerateScheduleInput) => {
    setIsGenerating(true);
    setTranscript({ interim: '', final: '' }); // Clear transcript

    try {
        const result = await generateSchedule(input);

        if (result.needs_clarification && result.clarifying_questions.length > 0) {
            setClarificationState(prev => ({
                questions: result.clarifying_questions,
                conversation: prev?.conversation || [],
                originalPlan: input.plan,
            }));
            setSchedule(null);
        } else if (result.schedule && result.schedule.length > 0) {
            setSchedule(result.schedule);
            startTask(0);
            setClarificationState(null);
        } else {
            toast({
                title: "Empty Schedule",
                description: "Could not generate a schedule from your plan. Try being more specific.",
                variant: "destructive"
            });
            setClarificationState(null);
        }
    } catch (error) {
        console.error("Error generating schedule:", error);
        toast({
            title: "Error",
            description: "Failed to generate schedule. Please try again.",
            variant: "destructive",
        });
        setClarificationState(null);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateSchedule = (plan: string) => {
    if (!plan.trim()) {
      toast({
        title: "Plan is empty",
        description: "Please enter your plan for the day.",
        variant: "destructive",
      });
      return;
    }
    setClarificationState(null);
    setSchedule(null);
    setCurrentTaskIndex(-1);
    setIsTimerActive(false);
    setCompletedTasksCount(0);
    setTotalFocusedTime(0);
    setSummary(null);
    setTomorrowsPlan(null); // Clear tomorrow's plan once it's used

    callGenerateSchedule({ plan });
  };
  
  const handleClarificationResponse = (answer: string) => {
    if (!clarificationState || !answer.trim()) return;

    const currentQuestion = clarificationState.questions[0];
    const updatedConversation: Conversation[] = [
        ...clarificationState.conversation,
        { question: currentQuestion, answer: answer },
    ];
    
    // Optimistically remove the answered question
    const remainingQuestions = clarificationState.questions.slice(1);

    setClarificationState(prev => {
        if (!prev) return null;
        return {
            ...prev,
            conversation: updatedConversation,
            questions: remainingQuestions,
        }
    });
    
    setPlanText(''); // Clear the input after submitting answer
    
    if (remainingQuestions.length === 0) {
        callGenerateSchedule({
            plan: clarificationState.originalPlan,
            conversationHistory: updatedConversation,
        });
    }
  };


  const handleAddTask = async (newTask: string) => {
    if (!schedule) {
      toast({
        title: "No active schedule",
        description: "Generate a schedule before adding new tasks.",
        variant: "destructive",
      });
      return;
    }
    if (!newTask.trim()) {
      toast({
        title: "Task is empty",
        description: "Please enter a task to add.",
        variant: "destructive",
      });
      return;
    }
    setIsUpdating(true);
    try {
      const result = await addTaskToSchedule({
        existingSchedule: schedule,
        newTask: newTask,
        currentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });
      setSchedule(result.schedule);
      toast({
        title: "Schedule Updated",
        description: "Your new task has been added to the timeline.",
      });
    } catch (error) {
      console.error("Error adding task to schedule:", error);
      toast({
        title: "Error",
        description: "Failed to add task to schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAdjustForDelay = async (delay: string) => {
    if (!schedule) {
      toast({
        title: "No active schedule",
        description: "Generate a schedule before adjusting it.",
        variant: "destructive",
      });
      return;
    }
    if (!delay.trim()) {
      toast({
        title: "Delay is empty",
        description: "Please enter a delay duration (e.g., '15 minutes').",
        variant: "destructive",
      });
      return;
    }
    setIsAdjusting(true);
    try {
      const result = await adjustScheduleForDelay({
        existingSchedule: schedule,
        delayDuration: delay,
        currentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });
      setSchedule(result.schedule);
      toast({
        title: "Schedule Adjusted",
        description: "Your timeline has been updated for the delay.",
      });
    } catch (error) {
      console.error("Error adjusting schedule:", error);
      toast({
        title: "Error",
        description: "Failed to adjust schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleSummarizeDay = async (activities: string) => {
    setIsSummarizing(true);
    setSummary(null);
    setShowSummaryDialog(true);
    try {
      const result = await summarizeDay({ activities });
      setSummary(result);
    } catch (error) {
      console.error("Error summarizing day:", error);
      toast({
        title: "Error",
        description: "Failed to summarize your day. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handlePlanTomorrow = (plan: string) => {
    if (!plan.trim()) {
      toast({
        title: "Plan is empty",
        description: "Please enter your plan for tomorrow.",
        variant: "destructive",
      });
      return;
    }
    setTomorrowsPlan(plan);
    toast({
        title: "Tomorrow's Plan Noted!",
        description: "Your plan for tomorrow has been saved. Ready for a productive day!",
    });
  }

  const QuickCaptureDialog = ({
    trigger,
    title,
    description,
    inputLabel,
    confirmText = "Add",
    isLoading = false,
    onConfirm,
    multiline = false,
  }: {
    trigger: React.ReactNode;
    title: string;
    description: string;
    inputLabel: string;
    confirmText?: string;
    isLoading?: boolean;
    onConfirm?: (value: string) => void;
    multiline?: boolean;
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
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="quick-capture-input" className="text-right pt-2">
              {inputLabel}
            </Label>
            {multiline ? (
                <Textarea id="quick-capture-input" className="col-span-3" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isLoading} />
            ) : (
                <Input id="quick-capture-input" className="col-span-3" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isLoading} />
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="submit" onClick={handleConfirm} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmText}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    );
  };
  
  const SummarySection = ({ title, items, icon: Icon }: { title: string; items: string[]; icon: React.ElementType }) => (
    <AccordionItem value={title}>
      <AccordionTrigger className="text-md font-semibold">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-accent-crimson" />
          {title}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 pl-4 text-muted-foreground">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <ArrowRight className="h-4 w-4 mt-1 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );

  const calculateNowPosition = () => {
    if (!schedule || schedule.length === 0 || !currentTime) {
      return null;
    }
  
    const nowInMinutes = currentTime.hours * 60 + currentTime.minutes;
  
    const firstEventMinutes = timeToMinutes(schedule[0].time);
    const lastEvent = schedule[schedule.length - 1];
    const lastEventMinutes = timeToMinutes(lastEvent.time) + (parseDuration(lastEvent.duration) / 60);
  
    if (nowInMinutes < firstEventMinutes || nowInMinutes > lastEventMinutes) {
      return null;
    }
  
    // Estimate total height: 10 (space-y) + (4+4) (padding) for each item approx
    // And each li is roughly 60px high.
    const totalPixels = schedule.length * (60 + 10); 
    const totalMinutes = lastEventMinutes - firstEventMinutes;
  
    const minutesFromStart = nowInMinutes - firstEventMinutes;
    const percentageThroughDay = minutesFromStart / totalMinutes;
  
    return percentageThroughDay * totalPixels;
  };

  const nowPosition = calculateNowPosition();

  const handleMicClick = () => {
    if (isRecording) {
      stopRecognition();
    } else {
      startRecognition();
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && planText.trim()) {
        if (clarificationState) {
            handleClarificationResponse(planText);
        } else {
            handleGenerateSchedule(planText);
        }
        setPlanText('');
    }
  };

  if (!isMounted) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-accent-crimson" />
        </div>
      );
  }


  return (
    <>
    <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="text-accent-crimson"/> Your Daily Summary</DialogTitle>
          <DialogDescription>
            Here is a summary of your day based on your completed tasks.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-foreground">
          {isSummarizing ? (
             <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-accent-crimson" />
             </div>
          ) : summary ? (
            <Accordion type="multiple" defaultValue={['Key Accomplishments', 'Suggestions for Tomorrow']} className="w-full">
                {summary.accomplishments && summary.accomplishments.length > 0 && (
                    <SummarySection title="Key Accomplishments" items={summary.accomplishments} icon={Award} />
                )}
                {summary.learnings && summary.learnings.length > 0 && (
                    <SummarySection title="Learnings & Insights" items={summary.learnings} icon={Lightbulb} />
                )}
                {summary.suggestions && summary.suggestions.length > 0 && (
                    <SummarySection title="Suggestions for Tomorrow" items={summary.suggestions} icon={NotebookText} />
                )}
            </Accordion>
          ) : (
             <div className="flex items-center justify-center text-muted-foreground h-40">
                No summary available.
             </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">

        {scheduleIsComplete && (
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                        <Award /> Well done!
                    </CardTitle>
                    <p className="text-muted-foreground pt-2">You've completed all your tasks for the day. Take a moment to reflect on your accomplishments.</p>
                 </CardHeader>
                 <CardFooter>
                    <QuickCaptureDialog
                        trigger={
                            <Button variant="default" className="w-full">
                                <Book className="mr-2 h-5 w-5" /> Reflect & Summarize Day
                            </Button>
                        }
                        title="Reflect & Summarize"
                        description="Add any final thoughts, accomplishments, or learnings from your day. The AI will generate a concise summary."
                        inputLabel="Your Thoughts"
                        confirmText={isSummarizing ? "Summarizing..." : "Generate Summary"}
                        isLoading={isSummarizing}
                        multiline={true}
                        onConfirm={(thoughts) => {
                            const completedTasks = schedule?.map(t => t.task).join(', ');
                            const fullContext = `Completed tasks: ${completedTasks}. Additional thoughts: ${thoughts}`;
                            handleSummarizeDay(fullContext);
                        }}
                    />
                 </CardFooter>
            </Card>
        )}

        {!scheduleIsComplete && schedule && (
          <Card>
            <CardHeader>
              <CardTitle>Now Playing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className={cn("relative h-48 w-48", timer < 60 && timer > 0 && isTimerActive && "pulse-timer")}>
                  <ProgressCircle value={timer} max={initialTaskDuration} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <span className="text-4xl font-bold text-foreground">{formatTime(timer)}</span>
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
                  <span className="font-medium">{nextTask}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Bot className="text-accent-crimson"/>
              {clarificationState && clarificationState.questions.length > 0 ? clarificationState.questions[0] : "What's on your plate today?"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center justify-center gap-4 w-full">
              {!isAvailable && <p className="text-destructive text-center">Voice input not supported. Please use text input.</p>}
              {error && <p className="text-destructive text-center">{error}</p>}
              
              {isAvailable && !isRecording && !processingOrGenerating && (
                <button
                  onClick={startRecognition}
                  className={cn(
                    "relative rounded-full transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "h-32 w-32 bg-accent-crimson text-white flex items-center justify-center"
                  )}
                  aria-label="Start recording"
                >
                  <Mic className="h-16 w-16" />
                </button>
              )}

              {(isRecording || processingOrGenerating) && (
                 <div
                  className={cn(
                    "relative rounded-full transition-all duration-200 ease-in-out",
                    "h-32 w-32 bg-white flex items-center justify-center",
                    isRecording && "ring-8 ring-accent-crimson",
                  )}
                  aria-label={processingOrGenerating ? "Thinking..." : "Recording"}
                >
                  {isRecording && <div className="absolute inset-0 rounded-full bg-accent-crimson/20 animate-pulse-ring"></div>}
                  
                  {processingOrGenerating ? (
                    <Loader2 className="h-16 w-16 animate-spin text-accent-crimson" />
                  ) : (
                    <Mic className="h-16 w-16 text-accent-crimson" />
                  )}
                </div>
              )}


              <div className="text-center min-h-[6rem] w-full">
                {isRecording ? (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">Recording... ({formatRecordingTime(recordingTime)})</p>
                    <div className="flex gap-4">
                      <Button variant="default" onClick={stopRecognition}>Done</Button>
                      <Button variant="ghost" size="sm" onClick={cancelRecognition}>Cancel</Button>
                    </div>
                  </div>
                ) : processingOrGenerating ? (
                   <p className="text-sm text-muted-foreground">Thinking...</p>
                ) : (transcript.interim || transcript.final) ? (
                   <p className="text-lg fade-in">
                    <span className="text-muted-foreground">{transcript.interim}</span>
                    <span>{transcript.final}</span>
                  </p>
                ) : (
                  <p className="text-muted-foreground">Tap the mic to start speaking.</p>
                )}
              </div>
            </div>

            <div className="text-center text-muted-foreground text-sm">or type here...</div>

            <div className="w-full relative">
                <Input
                  placeholder={clarificationState && clarificationState.questions.length > 0 ? "Your answer..." : "e.g., Meeting at 10am..."}
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                  onKeyDown={handleTextInputKeyDown}
                  disabled={processingOrGenerating || isRecording}
                />
                {tomorrowsPlan && !planText && !clarificationState && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => {
                            setPlanText(tomorrowsPlan);
                            setTomorrowsPlan(null); // Clear after loading
                        }}
                    >
                        <FileInput className="mr-2 h-4 w-4" />
                        Load Tomorrow's Plan
                    </Button>
                )}
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={!planText.trim() || processingOrGenerating || isRecording}
              onClick={() => {
                  if (clarificationState) {
                      handleClarificationResponse(planText);
                  } else {
                      handleGenerateSchedule(planText);
                  }
                  setPlanText('');
              }}
            >
              {processingOrGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {clarificationState ? 'Send' : (isGenerating ? 'Generating...' : 'Generate Schedule')}
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
              onConfirm={handleAddTask}
              isLoading={isUpdating}
              confirmText={isUpdating ? "Adding..." : "Add Task"}
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
              onConfirm={handleAdjustForDelay}
              isLoading={isAdjusting}
              confirmText={isAdjusting ? "Adjusting..." : "Adjust Schedule"}
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
              confirmText="Save Plan"
              onConfirm={handlePlanTomorrow}
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
              multiline
              onConfirm={handleGenerateSchedule}
              confirmText={isGenerating ? "Generating..." : "Generate"}
              isLoading={isGenerating}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
                <Award className="h-8 w-8 text-accent-crimson"/>
                <div>
                    <p className="text-2xl font-bold">{completedTasksCount}</p>
                    <p className="text-muted-foreground">Tasks done</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <BrainCircuit className="h-8 w-8 text-accent-crimson"/>
                <div>
                    <p className="text-2xl font-bold">{formatFocusedTime(totalFocusedTime)}</p>
                    <p className="text-muted-foreground">Focused time</p>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Today's Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {schedule && schedule.length > 0 ? (
            <div className="relative pl-6">
              <div className="absolute left-0 top-1 h-full w-0.5 -translate-x-1/2 bg-border"></div>
              {nowPosition !== null && (
                <div 
                  className="absolute left-0 w-full"
                  style={{ top: `${nowPosition}px`}}
                >
                    <div className="relative h-px bg-accent-crimson">
                        <div className="absolute -left-5 -top-2 text-xs font-bold text-accent-crimson">Now</div>
                    </div>
                </div>
              )}
              <ul className="space-y-10">
                {schedule.map((event, index) => (
                  <li key={index} className="relative">
                    <div
                      className={`absolute -left-2 top-1 h-4 w-4 -translate-x-1/2 rounded-full ${index === currentTaskIndex ? 'bg-accent-crimson pulse-red' : (index < currentTaskIndex || (currentTaskIndex === -1 && completedTasksCount > 0) ? 'bg-green-500' : 'bg-border')}`}
                    >
                     {(index < currentTaskIndex || (currentTaskIndex === -1 && completedTasksCount > 0)) && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <div className="ml-6">
                      <p className={`font-semibold ${index === currentTaskIndex ? 'text-accent-crimson' : ((index < currentTaskIndex || (currentTaskIndex === -1 && completedTasksCount > 0)) ? 'text-muted-foreground line-through' : 'text-foreground')}`}>{event.task}</p>
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
    </>
  );
}

    
