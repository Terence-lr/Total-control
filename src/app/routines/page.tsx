import { AppLayout } from "@/components/app-layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Repeat } from "lucide-react";

export default function RoutinesPage() {
  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-6 w-6" />
            Routines
          </CardTitle>
          <CardDescription>
            Routines are recurring flows that repeat on a schedule, like your
            morning routine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Manage your recurring tasks and flows here.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
