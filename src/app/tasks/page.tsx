import { AppLayout } from "@/components/app-layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function TasksPage() {
  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6" />
            Tasks
          </CardTitle>
          <CardDescription>
            Tasks are individual actions, the smallest unit of work in your
            system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Manage your individual actions here.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
