/* -------------------------------------------------------------
 * AI COMPANION ENGINE - FocusFlow AI
 * Coordinates simulated local heuristics and triggers client-side
 * API calls to Google's Gemini LLM.
 * ------------------------------------------------------------- */
import { StorageService } from './storage.js';
import { TaskService } from './tasks.js';
import { HabitService } from './habits.js';
// Local Productivity Advice Fallback database
const LOCAL_ADVICE = [
  "Plan your hardest task first thing in the morning. This is called 'eating the frog' and clears your mental energy.",
  "Consider breaking down your large goals. The smaller the steps, the less friction you will feel to start.",
  "Remember the 2-minute rule: if a task takes less than 2 minutes, complete it immediately instead of scheduling it.",
  "Take regular breaks! The Pomodoro method recommends a 5-minute break every 25 minutes of focus.",
  "Streaks build identity. Ticking off your habits daily helps solidify your routines into actual character traits."
];
// In-memory conversation state
let chatHistory = [];
export const AIService = {
  getChatHistory() {
    return chatHistory;
  },
  clearChatHistory() {
    chatHistory = [];
  },
  // Core Chat interface
  async getResponse(userMessage) {
    const state = StorageService.loadState();
    const apiKey = state.user.geminiApiKey || "";
    // Save user message to history
    chatHistory.push({ role: "user", text: userMessage });
    if (apiKey) {
      try {
        return await this.callGeminiAPI(apiKey, userMessage, state);
      } catch (err) {
        console.error("Gemini API error, falling back to local engine.", err);
        return this.getLocalResponse(userMessage, state) + "\n\n*(Note: Gemini API returned an error, using local fallback.)*";
      }
    } else {
      return this.getLocalResponse(userMessage, state);
    }
  },
  // Live Gemini API client-side fetch call
  async callGeminiAPI(apiKey, userMessage, state) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const dateStr = new Date().toLocaleString();
    const tasksSummary = state.tasks.map(t => 
      `- [${t.completed ? 'x' : ' '}] ${t.title} (Category: ${t.category}, Priority: ${t.important ? 'Important ' : ''}${t.urgent ? 'Urgent' : 'Normal'}, Due: ${t.dueDate || 'Unscheduled'}, Scheduled: ${t.scheduledSlot ? `${t.scheduledSlot.dayDate} ${t.scheduledSlot.startTime}` : 'No'})`
    ).join("\n");
    const habitsSummary = state.habits.map(h => 
      `- ${h.name} (Category: ${h.category}, Streak: ${h.streak} days, Completed Today: ${h.lastCompleted === new Date().toISOString().split('T')[0] ? 'Yes' : 'No'})`
    ).join("\n");
    const systemInstruction = `You are FocusFlow AI, an assertive, empathetic, and highly proactive AI productivity companion.
Your goal is to help the user plan, prioritize, and complete tasks before deadlines are missed.
Do not act as a passive assistant. Push the user politely to take action.
User Profile:
- Name: ${state.user.name}
- Focus Role: ${state.user.role}
- Weekly Goal: ${state.user.weeklyGoalHours} hours of focus
- Current Date/Time: ${dateStr}
Current User State:
TASKS:
${tasksSummary || 'No active tasks.'}
HABITS:
${habitsSummary || 'No habits tracked.'}
Directions:
1. Be concise, actionable, and warm. Try to limit responses to 2-3 short paragraphs.
2. If the user mentions scheduling or planning, recommend running the "AI Auto-Scheduler" or suggest blocking out specific slots.
3. If they complain about procrastination, suggest dividing tasks or starting a short 5-minute Focus break.
4. Use bullet points for structured summaries.
5. If they ask you to add a task, do it heuristically and say you are writing it down (the frontend will capture commands as well).`;
    // Map conversation logs to Gemini schema
    // Limits history to last 6 messages to preserve context size
    const recentHistory = chatHistory.slice(-6);
    const contents = recentHistory.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    });
    if (!response.ok) {
      throw new Error(`API call failed: status ${response.status}`);
    }
    const data = await response.json();
    const replyText = data.candidates[0].content.parts[0].text;
    
    // Save AI reply to history
    chatHistory.push({ role: "model", text: replyText });
    return replyText;
  },
  // Local rule-based keyword matching heuristic assistant
  getLocalResponse(message, state) {
    const text = message.toLowerCase().trim();
    let reply = "";
    if (text.includes("hello") || text.includes("hi ") || text.includes("hey")) {
      reply = `Hello ${state.user.name}! I am your FocusFlow companion. I can help you schedule tasks, break down complex assignments, or check your timelines. Try typing "schedule tasks" or "show advice" to get started!`;
    } 
    else if (text.includes("schedule") || text.includes("plan") || text.includes("calendar")) {
      const unscheduled = state.tasks.filter(t => !t.completed && !t.scheduledSlot).length;
      if (unscheduled > 0) {
        reply = `You have ${unscheduled} unscheduled task(s) in your list. I highly recommend clicking the **"Run AI Auto-Scheduler"** button on the Calendar tab to block out time slots during your working hours (${state.user.workStart} - ${state.user.workEnd})!`;
      } else {
        reply = "All your current tasks have been scheduled on your calendar planner! Switch to the **AI Scheduler** tab to check your week.";
      }
    } 
    else if (text.includes("habit") || text.includes("streak")) {
      const activeStreaks = state.habits.filter(h => h.streak > 0);
      if (activeStreaks.length > 0) {
        const listStr = activeStreaks.map(h => `- **${h.name}**: ${h.streak} day streak! 🔥`).join("\n");
        reply = `Here are your active streaks:\n${listStr}\n\nKeep it up! Consistency is the foundation of high-performance habits.`;
      } else {
        reply = "You don't have any active streaks yet. Open the **Habits & Goals** tab, check off your daily habits, and watch your streaks grow!";
      }
    } 
    else if (text.includes("focus") || text.includes("pomodoro") || text.includes("timer")) {
      reply = "Need to lock in? Switch to the **Focus Mode** tab, turn on one of my synthesized ambient soundscapes (like Deep Rain or Alpha Waves), and trigger a 25-minute Pomodoro focus block.";
    }
    else if (text.includes("advice") || text.includes("tips") || text.includes("procrastinate")) {
      const randomIdx = Math.floor(Math.random() * LOCAL_ADVICE.length);
      reply = `Here is a productivity insight for you: \n\n*"${LOCAL_ADVICE[randomIdx]}"*`;
    }
    else {
      // General match
      reply = `I understand you're working on your goals! To get the full experience, including deep contextual answers and automated checklists, try adding your **Gemini API Key** in the **Settings** tab. For now, you can add tasks, complete habits, or auto-schedule using the navigation sidebar.`;
    }
    // Save AI response to history
    chatHistory.push({ role: "model", text: reply });
    return reply;
  },
  // Decompose task with Gemini JSON generation
  async decomposeTaskWithAI(taskTitle, taskDesc) {
    const state = StorageService.loadState();
    const apiKey = state.user.geminiApiKey || "";
    if (!apiKey) {
      // If no key, fall back immediately to local client-side parser
      return null;
    }
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const prompt = `Task Title: "${taskTitle}"
Task Notes: "${taskDesc || 'No details.'}"
Decompose this task into 4 to 6 logical, sequential micro-steps that are highly actionable.
Output ONLY a raw, valid JSON array of strings, without markdown backticks. Example:
["Step 1 detail", "Step 2 detail", "Step 3 detail"]`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      });
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      
      // Attempt to parse JSON array
      const arr = JSON.parse(rawText.trim());
      if (Array.isArray(arr)) {
        return arr;
      }
      return null;
    } catch(err) {
      console.warn("Gemini decomposition failed. Falling back to local templates.", err);
      return null;
    }
  },
  // Scanning engine to generate alerts on Dashboard load
  scanForProactiveAlerts(state) {
    const alerts = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    // 1. Scan for critical unscheduled tasks due soon (less than 48 hours)
    const unscheduledTasks = state.tasks.filter(t => !t.completed && !t.scheduledSlot && t.dueDate);
    unscheduledTasks.forEach(task => {
      const diff = new Date(task.dueDate) - now;
      if (diff > 0 && diff < 48 * 60 * 60 * 1000) {
        alerts.push({
          id: `alert-task-${task.id}`,
          type: 'urgency',
          title: 'Schedule Intervention Required',
          desc: `"${task.title}" is due in less than 48 hours but hasn't been blocked in your calendar. Let's schedule it now?`,
          actionLabel: 'Schedule Now',
          actionType: 'schedule-task',
          targetId: task.id
        });
      }
    });
    // 2. Scan for empty slots warning
    const pendingCount = state.tasks.filter(t => !t.completed && !t.scheduledSlot).length;
    if (pendingCount >= 3 && alerts.length === 0) {
      alerts.push({
        id: 'alert-bulk-schedule',
        type: 'urgency',
        title: 'Timeline Fragmentation Warning',
        desc: `You have ${pendingCount} unscheduled tasks piling up. Let AI build your timeline using working hours.`,
        actionLabel: 'Run Auto-Scheduler',
        actionType: 'run-auto',
        targetId: null
      });
    }
    // 3. Scan for active habits to boost
    const activeHabits = state.habits.filter(h => h.streak > 0 && h.lastCompleted !== todayStr);
    activeHabits.forEach(habit => {
      alerts.push({
        id: `alert-habit-${habit.id}`,
        type: 'habit',
        title: 'Streak Booster Alert',
        desc: `You've checked off "${habit.name}" ${habit.streak} days in a row! Tick it off today to keep the fire burning.`,
        actionLabel: 'Mark Complete',
        actionType: 'check-habit',
        targetId: habit.id
      });
    });
    // Default proactive greeting if no alerts
    if (alerts.length === 0) {
      alerts.push({
        id: 'alert-default',
        type: 'general',
        title: 'FocusFlow Optimal Strategy',
        desc: 'Your day looks balanced! Start a 25-minute Pomodoro Focus session to lock in your morning flow.',
        actionLabel: 'Start Focus',
        actionType: 'go-focus',
        targetId: null
      });
    }
    return alerts.slice(0, 3); // limit to top 3 active notifications
  }
};
