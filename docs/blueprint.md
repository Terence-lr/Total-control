# **App Name**: Total Control

## Core Features:

- Voice-First Input: Primary interaction mode where users are prompted daily: "What's on your plate today?" Users speak naturally about their tasks, appointments, and goals. The app uses speech-to-text with an animated microphone button showing recording status.
- Conversational AI Parsing: Uses OpenAI's GPT-4 to understand natural language and extract relevant information. The AI asks clarifying questions when needed (timing preferences, duration, priorities) to create a complete picture before generating the schedule.
- Four-Tier Task Hierarchy: Tasks: Individual actions (e.g., "Morning workout"). Flows: Groups of tasks for one-time events (e.g., "Website setup" with tasks: buy domain, setup hosting, design homepage). Routines: Recurring flows that repeat on a schedule (e.g., "Weekly training" that happens every Monday). Goals: Long-term objectives requiring multiple tasks, flows, or routines (e.g., "Run a marathon in 6 months")
- Intelligent Daily Timeline: Vertical scrollable timeline displaying the optimized schedule with current and upcoming tasks highlighted. The scheduling algorithm considers task dependencies, energy levels, buffer time, and user preferences.
- Quick Capture Modes: Multiple entry points for different contexts: "Morning Dump": Comprehensive day planning. "Just Add This": Quick task insertion into existing schedule. "I'm Running Late": Real-time schedule adjustment. "Tomorrow Mode": Plan ahead for next day
- Behavioral Design Elements: Progressive disclosure to prevent overwhelm. Visual feedback for task completion (satisfying animations). "Why" prompts for goal creation to increase motivation. Gentle reminders without guilt. Time buffer suggestions to prevent over-scheduling

## Style Guidelines:

- Primary color: Black (`#000000`) for text, main UI elements, and emphasis - conveying authority and focus
- Accent color: Crimson red (`#DC143C`) for key actions, active states, recording indicators, and call-to-action elements
- Background color: White (`#FFFFFF`) for clean, distraction-free backdrop with maximum readability
- Secondary accent: Dark gray (`#333333`) for borders, dividers, and secondary text
- Body and headline font: 'Inter' or 'Roboto' from Google Fonts for modern, clean legibility
- Use sharp, minimalist iconography representing tasks, flows, routines, and goals
- High contrast design with clear visual hierarchy
- Bold, confident layout emphasizing the conversational interface
- Smooth animations for voice input, task creation, and schedule updates
- Red pulsing animation for active microphone recording state