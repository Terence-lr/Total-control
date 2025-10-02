'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Task {
  id: string;
  name: string;
  duration_minutes: number;
  completed: boolean;
}

export default function FocusClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIndex = parseInt(searchParams.get('task') || '0');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Load schedule from localStorage
    const scheduleData = localStorage.getItem('dailySchedule');
    if (scheduleData) {
      const parsedTasks = JSON.parse(scheduleData);
      setTasks(parsedTasks);
      if (parsedTasks[taskIndex]) {
        setCurrentTask(parsedTasks[taskIndex]);
        setTimeRemaining(parsedTasks[taskIndex].duration_minutes * 60);
      }
    }
  }, [taskIndex]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleResume = () => setIsRunning(true);

  const handleComplete = () => {
    if (taskIndex < tasks.length - 1) {
      router.push(`/dashboard/focus?task=${taskIndex + 1}`);
    } else {
      router.push('/dashboard');
    }
  };

  const handleSkip = () => {
    if (taskIndex < tasks.length - 1) {
      router.push(`/dashboard/focus?task=${taskIndex + 1}`);
    } else {
      router.push('/dashboard');
    }
  };

  if (!currentTask) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600">No tasks available</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-6 py-2 bg-black text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <button
        onClick={() => router.push('/dashboard')}
        className="absolute top-4 left-4 text-gray-600 hover:text-black"
      >
        ← Back to Dashboard
      </button>

      <div className="text-center max-w-md w-full">
        <p className="text-sm text-gray-600 mb-8">
          Task {taskIndex + 1} of {tasks.length}
        </p>

        <div className="relative w-64 h-64 mx-auto mb-8">
          <svg className="transform -rotate-90 w-64 h-64">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="#DC143C"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 120}`}
              strokeDashoffset={`${
                2 * Math.PI * 120 * (1 - timeRemaining / (currentTask.duration_minutes * 60))
              }`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-5xl font-bold">{formatTime(timeRemaining)}</p>
              <p className="text-sm text-gray-600 mt-2">
                {isRunning ? 'Running' : 'Ready'}
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-8">{currentTask.name}</h1>

        <div className="space-y-4">
          {!isRunning && timeRemaining === currentTask.duration_minutes * 60 && (
            <button
              onClick={handleStart}
              className="w-full py-4 bg-[#DC143C] text-white rounded-lg font-semibold hover:bg-[#b30000] transition"
            >
              Start Task
            </button>
          )}

          {isRunning && (
            <div className="flex gap-4">
              <button
                onClick={handlePause}
                className="flex-1 py-3 border-2 border-black text-black rounded-lg font-semibold hover:bg-black hover:text-white transition"
              >
                Pause
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition"
              >
                Complete
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-600 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Skip
              </button>
            </div>
          )}

          {!isRunning && timeRemaining < currentTask.duration_minutes * 60 && (
            <div className="flex gap-4">
              <button
                onClick={handleResume}
                className="flex-1 py-3 bg-[#DC143C] text-white rounded-lg font-semibold hover:bg-[#b30000] transition"
              >
                Resume
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition"
              >
                Complete
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-600 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Skip
              </button>
            </div>
          )}
        </div>

        {taskIndex < tasks.length - 1 && (
          <p className="mt-8 text-gray-600">
            Up next: {tasks[taskIndex + 1].name}
          </p>
        )}
      </div>
    </div>
  );
}