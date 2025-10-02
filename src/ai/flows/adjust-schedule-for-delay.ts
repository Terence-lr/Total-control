export async function adjustScheduleForDelay(params: {
  currentSchedule: any[];
  delayMinutes: number;
  fromTaskIndex: number;
}) {
  const { currentSchedule, delayMinutes, fromTaskIndex } = params;

  // Shift all tasks after the specified index by delay amount
  const updatedSchedule = currentSchedule.map((task, index) => {
    if (index >= fromTaskIndex && task.time) {
      const [hours, minutes] = task.time.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + delayMinutes;
      const newHours = Math.floor(totalMinutes / 60) % 24;
      const newMinutes = totalMinutes % 60;
      
      return {
        ...task,
        time: `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`,
      };
    }
    return task;
  });

  return {
    success: true,
    schedule: updatedSchedule,
    message: `Shifted schedule by ${delayMinutes} minutes`,
  };
}