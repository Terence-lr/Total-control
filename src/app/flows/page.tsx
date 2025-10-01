import { AppLayout } from "@/components/app-layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Workflow } from "lucide-react";

export default function FlowsPage() {
  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            Flows
          </CardTitle>
          <CardDescription>
            Flows are groups of tasks for one-time events, like setting up a
            project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Manage your one-time series of tasks here.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
