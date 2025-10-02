export async function generateSchedule(params: {
  voiceTranscript: string;
  userId: string;
}) {
  const { voiceTranscript } = params;

  // Placeholder - integrate with Gemini API
  // For now, return mock schedule
  const mockTasks = [
    {
      id: '1',
      name: 'Morning workout',
      duration_minutes: 45,
      time: '07:00',
      completed: false,
    },
    {
      id: '2',
      name: 'Breakfast',
      duration_minutes: 30,
      time: '08:00',
      completed: false,
    },
    {
      id: '3',
      name: 'Work session',
      duration_minutes: 120,
      time: '09:00',
      completed: false,
    },
  ];

  return {
    success: true,
    schedule: mockTasks,
    message: 'Schedule generated successfully',
  };
}