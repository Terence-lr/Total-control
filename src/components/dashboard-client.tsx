"use client";

import { useState } from "react";
import { Mic, Plus, Clock, Calendar as CalendarIcon, Zap, Pause, Check, X } from "lucide-react";
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


// Mock data for the timeline
const timelineEvents = [
  { time: "07:00 AM", task: "Morning workout", duration: "45min" },
  { time: "08:00 AM", task: "Weekly Training Routine", duration: "1hr" },
  { time: "09:30 AM", task: "Team Stand-up", duration: "15min" },
  { time: "10:00 AM", task: "Work on 'Website Setup' Flow", duration: "2hr" },
  { time: "12:00 PM", task: "Lunch Break", duration: "1hr" },
  { time: "01:00 PM", task: "Design Homepage", duration: "1.5hr" },
  { time: "03:00 PM", task: "Client Call", duration: "30min" },
  { time: "04:00 PM", task: "Review Pull Requests", duration: "1hr" },
];

export function DashboardClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [planText, setPlanText] = useState("");

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
                <ProgressCircle value={75} max={100} className="absolute inset-0" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-primary">15:00</span>
                  <span className="text-muted-foreground">Team Stand-up</span>
                </div>
              </div>
              <div className="flex w-full items-center justify-center space-x-4">
                <Button variant="outline" size="lg">
                  <Pause className="mr-2 h-5 w-5" /> Pause
                </Button>
                <Button size="lg">
                  <Check className="mr-2 h-5 w-5" /> Complete
                </Button>
                <Button variant="ghost" size="lg">
                  <X className="mr-2 h-5 w-5" /> Skip
                </Button>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground">Up next: </span>
                <span className="font-medium text-primary">Work on 'Website Setup' Flow</span>
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
              placeholder="Speak or type your plan... e.g., 'I have a meeting at 10am, need to finish the report by 3pm, and want to go for a run in the evening.'"
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              className="min-h-[120px] text-base"
            />
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={!planText}
            >
              Generate Schedule
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
          <div className="relative pl-8">
            <div className="absolute left-4 top-2 h-full w-0.5 -translate-x-1/2 bg-border"></div>
            <ul className="space-y-10">
              {timelineEvents.map((event, index) => (
                <li key={index} className="relative">
                  <div
                    className={`absolute left-4 top-1 h-4 w-4 -translate-x-1/2 rounded-full ${
                      index === 2
                        ? "bg-accent ring-4 ring-accent/20"
                        : "bg-primary"
                    }`}
                  ></div>
                  <div className="ml-6">
                    <p className="font-semibold text-primary">{event.task}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.time} &middot; {event.duration}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
