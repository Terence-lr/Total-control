import { AppLayout } from "@/components/app-layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Target } from "lucide-react";

export default function GoalsPage() {
  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            Goals
          </CardTitle>
          <CardDescription>
            Goals are your long-term objectives that drive your tasks, flows,
            and routines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Manage your long-term ambitions here.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
