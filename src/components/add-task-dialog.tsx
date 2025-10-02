
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useFirebase, useUser } from "@/firebase";
import { createTask } from "@/firebase/firestore/mutations";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddTaskDialog({ open, onOpenChange }: AddTaskDialogProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();

    const [name, setName] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState(30);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveTask = async () => {
        if (!firestore || !user) {
            toast({ title: "Error", description: "Could not connect to database. Please try again.", variant: "destructive"});
            return;
        }
        if (!name.trim()) {
            toast({ title: "Task name is required", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            await createTask(firestore, user.uid, {
                name,
                date: date ? format(date, 'yyyy-MM-dd') : undefined,
                scheduled_time: time || undefined,
                duration_minutes: duration,
                type: 'task',
                notes: '',
            });

            toast({ title: "Task Created", description: `"${name}" has been added.` });
            onOpenChange(false);
            // Reset form
            setName('');
            setDate(new Date());
            setTime('');
            setDuration(30);

        } catch (error) {
            console.error("Error creating task:", error);
            toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                    <DialogDescription>
                        Fill in the details for your new task. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Task
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g. Morning workout"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Date
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">
                            Time
                        </Label>
                        <Input
                            id="time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="duration" className="text-right">
                            Duration
                        </Label>
                         <Input
                            id="duration"
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                            className="col-span-2"
                            min="5"
                            step="5"
                        />
                        <span className="col-span-1 text-sm text-muted-foreground">minutes</span>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveTask} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

