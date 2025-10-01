"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Target, Loader2, List, Workflow, Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  suggestTasksFromGoal,
  SuggestTasksFromGoalOutput,
} from "@/ai/flows/suggest-tasks-from-goal";
import { useToast } from "@/hooks/use-toast";

export function GoalsClient() {
  const [goal, setGoal] = useState("");
  const [suggestions, setSuggestions] =
    useState<SuggestTasksFromGoalOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    if (!goal.trim()) {
      toast({
        title: "Goal is empty",
        description: "Please enter a goal to get suggestions.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    setSuggestions(null);

    try {
      const result = await suggestTasksFromGoal({ goal });
      setSuggestions(result);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to generate suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const SuggestionList = ({ title, items, icon: Icon }: { title: string, items: string[], icon: React.ElementType }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Icon className="h-5 w-5 text-accent" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No suggestions yet.</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            Goals
          </CardTitle>
          <CardDescription>
            Goals are your long-term objectives that drive your tasks, flows,
            and routines. Define a goal below to get AI-powered suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="e.g., Learn to play the guitar"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="text-base"
          />
          <Button
            size="lg"
            disabled={!goal || isGenerating}
            onClick={handleGenerateSuggestions}
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGenerating ? "Generating Suggestions..." : "Generate Suggestions"}
          </Button>
        </CardContent>
      </Card>

      {isGenerating && (
        <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {suggestions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SuggestionList title="Suggested Tasks" items={suggestions.suggestedTasks} icon={List} />
          <SuggestionList title="Suggested Flows" items={suggestions.suggestedFlows} icon={Workflow} />
          <SuggestionList title="Suggested Routines" items={suggestions.suggestedRoutines} icon={Repeat} />
        </div>
      )}
    </div>
  );
}