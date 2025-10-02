
'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Mic, Plus, Clock, Calendar as CalendarIcon, Zap, Pause, Play, Check, X, Loader2, Award, BrainCircuit, Bot, Sparkles, Book, Lightbulb, ArrowRight, NotebookText, FileInput, Square, PlayCircle, StopCircle, Hourglass, List, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateSchedule, GenerateScheduleInput, GenerateScheduleOutput } from "@/ai/flows/generate-schedule";
import { addTaskToSchedule, AddTaskToScheduleInput, AddTaskToScheduleOutput } from "@/ai/flows/add-task-to-schedule";
import { adjustScheduleForDelay, AdjustScheduleForDelayInput, AdjustScheduleForDelayOutput } from "@/ai/flows/adjust-schedule-for-delay";
import { summarizeDay, SummarizeDayOutput } from "@/ai/flows/summarize-day";
import { getCurrentTime, GetCurrentTimeOutput } from "@/ai/flows/get-current-time";
import { extractTasksFromTranscript, ExtractTasksFromTranscriptInput, ExtractTasksFromTranscriptOutput } from "@/ai/flows/extract-tasks-from-transcript";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";
import { z } from "zod";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";


// Schema for a single event, consistent with generate-schedule flow
const ScheduleEventSchema = z.object({
  time: z.string().describe('The start time of the event (e.g., "09:00 AM").'),
  task: z.string().describe('A short description of the task or event.'),
  duration: z.string().describe('The estimated duration of the event (e.g., "45min", "1hr").'),
});
type ScheduleEvent = z.infer<typeof ScheduleEventSchema>;

type LiveTask = ExtractTasksFromTranscriptOutput['tasks'][0];

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
  if (!timeStr) return 0;
  const [time, period] = timeStr.split(' ');
  if (!time) return 0;
  let [hours, minutes] = time.split(':').map(Number);

  if (period && period.toLowerCase() === 'pm' && hours !== 12) {
    hours += 12;
  }
  if (period && period.toLowerCase() === 'am' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + (minutes || 0);
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
  const router = useRouter();

  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
  const [isTimerStarted, setIsTimerStarted] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [currentTime, setCurrentTime] = useState<GetCurrentTimeOutput | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [tomorrowsPlan, setTomorrowsPlan] = useState<string | null>(null);
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  const [liveTasks, setLiveTasks] = useState<LiveTask[]>([]);
  
  const [clarificationState, setClarificationState] = useState<{
    questions: string[];
    conversation: Conversation[];
    originalPlan: string;
  } | null>(null);

  const isParentGenerating = isGenerating || isUpdating;

  const callGenerateSchedule = useCallback(async (input: GenerateScheduleInput) => {
    setIsGenerating(true);
    setTranscript({ interim: '', final: '' });
    setLiveTasks([]);

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
            const initialSchedule = result.schedule;
            setSchedule(initialSchedule);
            setCurrentTaskIndex(0); 
            setClarificationState(null);
            setShowVoiceDialog(false);
            setIsTimerStarted(true);
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
  }, [toast]);

  const handleGenerateSchedule = useCallback((plan: string) => {
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
    setIsTimerStarted(false);
    setCompletedTasksCount(0);
    setSummary(null);
    if (tomorrowsPlan === plan) {
      setTomorrowsPlan(null); // Clear tomorrow's plan once it's used
    }

    callGenerateSchedule({ plan });
  }, [toast, callGenerateSchedule, tomorrowsPlan]);

  const handleAddTask = useCallback(async (request: string) => {
    if (!schedule) {
      toast({
        title: "No active schedule",
        description: "Generate a schedule before adding new tasks.",
        variant: "destructive",
      });
      return;
    }
    if (!request.trim()) {
      toast({
        title: "Task is empty",
        description: "Please enter a task to add.",
        variant: "destructive",
      });
      return;
    }
    setIsUpdating(true);
    setLiveTasks([]);
    setTranscript({ interim: '', final: '' });
    setShowVoiceDialog(false);

    try {
      const result: AddTaskToScheduleOutput = await addTaskToSchedule({
        existingSchedule: schedule,
        request: request,
        currentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });
      
      if (result.needs_clarification && result.clarifying_question) {
          // TODO: Handle clarification for adjustments
          toast({
              title: "Needs Clarification",
              description: result.clarifying_question,
          });
      } else {
        setSchedule(result.schedule);
        toast({
          title: "Schedule Updated",
          description: result.changes_summary || "Your schedule has been updated.",
        });
      }

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
  }, [schedule, toast]);

  const handleClarificationResponse = useCallback((answer: string) => {
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
  }, [clarificationState, callGenerateSchedule]);

  const handleFinalTranscript = useCallback((text: string) => {
    if (clarificationState) {
        handleClarificationResponse(text);
    } else if (schedule) {
        handleAddTask(text);
    } else {
        handleGenerateSchedule(text);
    }
  }, [clarificationState, schedule, handleGenerateSchedule, handleClarificationResponse, handleAddTask]);

  const {
    isRecording,
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
      isParentGenerating,
  });

  const debouncedParseTranscript = useDebouncedCallback(async (text: string) => {
    if (!text.trim() || clarificationState) {
      setLiveTasks([]);
      return;
    }
    try {
      const result = await extractTasksFromTranscript({ transcript: text });
      setLiveTasks(result.tasks);
    } catch (e) {
      console.error("Error parsing transcript:", e);
      // Don't show toast for this, it's a background process
    }
  }, 500); // 500ms debounce delay

  useEffect(() => {
    if (isRecording) {
      const fullTranscript = transcript.final + transcript.interim;
      debouncedParseTranscript(fullTranscript);
    }
  }, [transcript, isRecording, debouncedParseTranscript]);

  const startVoiceSession = () => {
    setLiveTasks([]);
    setTranscript({ interim: '', final: '' });
    startRecognition();
    setShowVoiceDialog(true);
  }
  
  const scheduleIsComplete = schedule && schedule.length > 0 && currentTaskIndex === -1 && completedTasksCount === schedule.length;

  // Load from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedSchedule = localStorage.getItem('schedule');
      const savedCurrentTaskIndex = localStorage.getItem('currentTaskIndex');
      const savedCompletedTasks = localStorage.getItem('completedTasksCount');
      const savedTomorrowsPlan = localStorage.getItem('tomorrowsPlan');

      if (savedTomorrowsPlan) {
        setTomorrowsPlan(savedTomorrowsPlan);
      }

      if (savedSchedule) {
        const parsedSchedule = JSON.parse(savedSchedule);
        setSchedule(parsedSchedule);
        
        const taskIndex = savedCurrentTaskIndex ? parseInt(savedCurrentTaskIndex, 10) : -1;
        setCurrentTaskIndex(taskIndex);
        if (taskIndex !== -1) {
            setIsTimerStarted(true);
        }

        setCompletedTasksCount(savedCompletedTasks ? parseInt(savedCompletedTasks, 10) : 0);
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
      } else {
        localStorage.removeItem('schedule');
        localStorage.removeItem('currentTaskIndex');
        localStorage.removeItem('completedTasksCount');
      }

      if (tomorrowsPlan) {
        localStorage.setItem('tomorrowsPlan', tomorrowsPlan);
      } else {
        localStorage.removeItem('tomorrowsPlan');
      }

    } catch (error) {
      console.error("Failed to save to localStorage", error);
    }
  }, [schedule, currentTaskIndex, completedTasksCount, isMounted, tomorrowsPlan]);


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
          <Icon className="h-5 w-5 text-accent" />
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

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        if (target.value.trim()) {
            if (clarificationState) {
                handleClarificationResponse(target.value);
            } else {
                handleGenerateSchedule(target.value);
            }
        }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  if (!isMounted) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      );
  }

  const VoiceInputDialog = () => {
    const handleStop = () => {
        stopRecognition();
    };

    const handleCancel = () => {
        cancelRecognition();
        setShowVoiceDialog(false);
    };

    const isLoading = isGenerating || isUpdating;
    const showClarification = clarificationState && clarificationState.questions.length > 0 && !isLoading;
    const showInfoDisplay = isRecording || liveTasks.length > 0 || showClarification || isLoading;

    return (
        <Dialog open={showVoiceDialog} onOpenChange={(open) => {
            if (!open) { handleCancel(); }
            else { setShowVoiceDialog(true); }
        }}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 bg-transparent border-0 shadow-none">
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative">
                    
                    <div className="absolute top-10 text-center w-full max-w-2xl px-4 min-h-[300px]">
                      {showInfoDisplay && (
                          <div className="fade-in">
                              {isLoading ? (
                                  <p className="text-2xl font-medium text-muted-foreground">Thinking...</p>
                              ) : showClarification ? (
                                  <div className="w-full max-w-lg mx-auto text-left fade-in">
                                      <Label className="text-2xl font-semibold mb-4 block text-center">{clarificationState.questions[0]}</Label>
                                      <div className="flex gap-2">
                                          <Textarea
                                              value={planText}
                                              onChange={(e) => setPlanText(e.target.value)}
                                              onKeyDown={handleTextInputKeyDown}
                                              placeholder="Type your answer... (Cmd+Enter to submit)"
                                              disabled={isLoading}
                                              className="text-lg"
                                              rows={2}
                                          />
                                          <Button size="lg" onClick={() => handleClarificationResponse(planText)} disabled={!planText.trim() || isLoading}>
                                            {isLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                                          </Button>
                                      </div>
                                  </div>
                              ) : liveTasks.length > 0 ? (
                                  <Card className="text-left bg-background/80 backdrop-blur-sm max-h-[50vh] overflow-y-auto fade-in">
                                      <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Mic/> Tasks I'm hearing...</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        {liveTasks.map((task, index) => (
                                          <div key={index} className="p-3 rounded-lg border bg-background/50">
                                            <p className="font-semibold text-lg">{task.name}</p>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                              {task.time && <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4"/> {task.time}</span>}
                                              {task.duration && <span className="flex items-center gap-1"><Hourglass className="w-4 h-4"/> {task.duration}</span>}
                                              {task.status === 'needs_info' && !task.time && !task.duration && (
                                                <span className="text-xs italic">More details needed...</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </CardContent>
                                    </Card>
                              ) : (
                                  <>
                                      <p className="text-2xl text-muted-foreground mb-4">{transcript.interim || "Listening..."}</p>
                                      <p className="text-4xl lg:text-5xl font-bold text-foreground">{transcript.final}</p>
                                  </>
                              )}
                          </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-center justify-center gap-6 mt-auto absolute bottom-24">
                        {!isRecording && !isLoading && !clarificationState && (
                            <Button 
                                onClick={startVoiceSession} 
                                disabled={!isAvailable} 
                                className="h-32 w-32 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg animate-pulse-ring"
                            >
                                <Mic className="h-16 w-16" />
                            </Button>
                        )}
                        {isRecording && (
                            <div className="relative">
                                <Button 
                                    onClick={handleStop}
                                    className="h-32 w-32 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg pulse-red"
                                >
                                  <StopCircle className="h-16 w-16" />
                                </Button>
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xl font-mono text-foreground">{formatTime(recordingTime)}</div>
                            </div>
                        )}
                         {isLoading && <Loader2 className="h-16 w-16 animate-spin text-accent" />}
                    </div>
                    
                    <div className="absolute bottom-8 text-center w-full">
                         {isRecording ? (
                              <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
                         ) : !isLoading && (
                              <p className="text-muted-foreground text-sm">
                                {schedule ? "Tap to make an adjustment" : "Tap the mic to start speaking"}
                              </p>
                         )}
                         {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
  };


  return (
    <>
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="text-accent"/> Your Daily Summary</DialogTitle>
            <DialogDescription>
              Here is a summary of your day based on your completed tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-foreground">
            {isSummarizing ? (
              <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
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

      <VoiceInputDialog />

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
          
          {schedule && !scheduleIsComplete && currentTaskIndex !== -1 && (
            <Card>
              <CardHeader>
                <CardTitle>Now Playing</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center items-center pt-6">
                  {!isTimerStarted ? (
                      <Button size="lg" className="w-full h-14 text-lg" onClick={() => router.push(`/dashboard/focus?taskIndex=${currentTaskIndex}`)} disabled={isTimerActive}>
                          <Play className="mr-2 h-6 w-6" /> Start Day
                      </Button>
                  ) : (
                      <Button asChild variant="default" size="lg">
                          <Link href={`/dashboard/focus?taskIndex=${currentTaskIndex}`}>
                              <PlayCircle className="mr-2 h-5 w-5" />
                              {currentTaskIndex > 0 ? "Resume Day" : "Start Day"}
                          </Link>
                      </Button>
                  )}
              </CardContent>
            </Card>
          )}
          
          {!schedule && !isGenerating && !clarificationState &&(
              <Card className="min-h-[200px]">
                  <CardHeader>
                      <CardTitle className="text-2xl">Plan Your Day</CardTitle>
                      <CardDescription>Tell the AI assistant what you need to do, and it will create a schedule for you.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center gap-4">
                      <Button onClick={startVoiceSession} className="h-24 w-24 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg">
                          <Mic className="h-12 w-12" />
                      </Button>
                      <p className="text-muted-foreground text-sm">Tap to speak your plan</p>
                  </CardContent>
              </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Today's Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : schedule ? (
                <div className="relative">
                  {nowPosition !== null && (
                      <div
                          className="absolute left-0 w-full flex items-center"
                          style={{ top: `${nowPosition}px`, zIndex: 10 }}
                      >
                          <div className="w-2 h-2 rounded-full bg-accent mr-2"></div>
                          <div className="h-px flex-grow bg-accent"></div>
                      </div>
                  )}
                  <ul className="space-y-4">
                    {schedule.map((event, index) => (
                      <li
                        key={index}
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-lg transition-all border",
                          index < completedTasksCount && "opacity-50 bg-muted/50",
                          index === currentTaskIndex && "bg-accent/10 border-accent",
                        )}
                      >
                        <Link href={`/dashboard/focus?taskIndex=${index}`} className="flex-1 flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-sm">{event.time}</span>
                            <div className="w-px h-6 bg-border my-1"></div>
                            <span className="text-xs text-muted-foreground">{event.duration}</span>
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="font-medium">{event.task}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : clarificationState ? (
                <div className="w-full max-w-lg mx-auto text-left fade-in p-4 border rounded-lg bg-background">
                    <Label className="text-lg font-semibold mb-4 block text-center">{clarificationState.questions[0]}</Label>
                    <div className="flex gap-2">
                        <Textarea
                            value={planText}
                            onChange={(e) => setPlanText(e.target.value)}
                            onKeyDown={handleTextInputKeyDown}
                            placeholder="Type your answer... (Cmd+Enter to submit)"
                            disabled={isGenerating}
                            className="text-base"
                            rows={2}
                        />
                        <Button size="lg" onClick={() => handleClarificationResponse(planText)} disabled={!planText.trim() || isGenerating}>
                          {isGenerating ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                        </Button>
                    </div>
                </div>
              ) : (
                  <div className="text-center py-10 text-muted-foreground space-y-4">
                      <p>What's on your plate today? Let the AI build your schedule.</p>
                      <Button variant="link" onClick={() => handleGenerateSchedule("I have a dentist appointment at 2pm, need to work out for 30 minutes, study for 2 hours, and want to be in bed by 10pm")}>
                          Try an example
                      </Button>
                  </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
              <CardHeader>
                  <CardTitle>Or type your plan...</CardTitle>
              </CardHeader>
              <CardContent>
                  <Textarea
                      value={planText}
                      onChange={(e) => setPlanText(e.target.value)}
                      onKeyDown={handleTextInputKeyDown}
                      placeholder="e.g. I have a dentist appointment at 2pm..."
                      className="text-base"
                      rows={4}
                  />
                  <Button className="mt-4 w-full" onClick={() => handleGenerateSchedule(planText)} disabled={!planText.trim() || isGenerating}>
                      {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Generating...</> : "Generate Schedule"}
                  </Button>
                  {tomorrowsPlan && (
                      <Button variant="outline" className="w-full mt-2" onClick={() => handleGenerateSchedule(tomorrowsPlan)}>
                          <Sparkles className="mr-2 h-4 w-4"/> Start with yesterday's plan
                      </Button>
                  )}
              </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap /> Quick Capture
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                <Button variant="outline" className="w-full h-12 text-base justify-start" onClick={startVoiceSession}>
                    <Mic className="mr-2 h-5 w-5" /> Adjust Schedule
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <QuickCaptureDialog
                      trigger={<Button variant="outline" className="flex-col h-20 gap-1"><Plus className="h-6 w-6" /><span>Just Add This</span></Button>}
                      title="Add a Task"
                      description="Quickly add a new task to your current schedule. The AI will find the best spot for it."
                      inputLabel="New Task"
                      confirmText={isUpdating ? "Adding..." : "Add to Schedule"}
                      isLoading={isUpdating}
                      onConfirm={handleAddTask}
                  />
                  <QuickCaptureDialog
                      trigger={<Button variant="outline" className="flex-col h-20 gap-1"><Clock className="h-6 w-6" /><span>Running Late</span></Button>}
                      title="Running Late?"
                      description="Enter how late you're running, and the AI will shift your upcoming tasks accordingly."
                      inputLabel="Delay"
                      confirmText={isAdjusting ? "Adjusting..." : "Adjust Schedule"}
                      isLoading={isAdjusting}
                      onConfirm={handleAdjustForDelay}
                  />
                </div>

                <Button 
                    variant="outline" 
                    className="w-full h-12 text-base justify-start"
                    onClick={() => {
                        const completedTasks = schedule?.filter((_,i) => i < completedTasksCount).map(t => t.task).join(', ') || "No tasks completed.";
                        handleSummarizeDay(`Completed tasks: ${completedTasks}`);
                    }}
                >
                    <Book className="mr-2 h-5 w-5" /> Reflect on Day
                </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
