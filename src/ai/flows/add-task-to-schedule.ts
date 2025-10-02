export async function addTaskToSchedule(params: {
  currentSchedule: any[];
  newTask: {
    name: string;
    duration_minutes?: number;
    time?: string;
  };
}) {
  const { currentSchedule, newTask } = params;

  // Basic implementation - add task to end of schedule
  const updatedSchedule = [
    ...currentSchedule,
    {
      id: Date.now().toString(),
      name: newTask.name,
      duration_minutes: newTask.duration_minutes || 30,
      time: newTask.time || null,
      completed: false,
    },
  ];

  return {
    success: true,
    schedule: updatedSchedule,
    message: `Added "${newTask.name}" to your schedule`,
  };
}