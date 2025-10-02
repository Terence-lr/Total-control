import AppLayout from "@/components/app-layout";
import { TasksClient } from "@/components/tasks-client";

export default function TasksPage() {
  return (
    <AppLayout>
      <TasksClient />
    </AppLayout>
  );
}
