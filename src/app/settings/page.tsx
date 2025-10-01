import { AppLayout } from "@/components/app-layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </CardTitle>
          <CardDescription>
            Manage your application settings and preferences here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Settings content will go here.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
