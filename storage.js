/* -------------------------------------------------------------
 * STORAGE CONTROLLER - FocusFlow AI
 * Coordinates local storage operations, schema structures, and
 * seeds high-fidelity dummy data for first-time onboarding.
 * ------------------------------------------------------------- */
const STORAGE_KEY = "focusflow_state";
// Default State / Initial Seed Data
const DEFAULT_STATE = {
  user: {
    name: "Alex Mercer",
    role: "Software Entrepreneur",
    weeklyGoalHours: 15,
    focusScore: 240, // historical score points
    workStart: "09:00",
    workEnd: "18:00",
    geminiApiKey: ""
  },
  tasks: [
    {
      id: "seed-t1",
      title: "Complete Chemistry Lab Report",
      description: "Analyze molecular weights, fill out data sheet, and write conclusion paragraph.",
      dueDate: "", // Will be dynamically set to tomorrow
      category: "study",
      completed: false,
      important: true,
      urgent: true,
      duration: 90,
      subtasks: [
        { id: "sub-1", title: "Calculate mass percentages", completed: true },
        { id: "sub-2", title: "Plot graph in Excel", completed: false },
        { id: "sub-3", title: "Write conclusion paragraph", completed: false }
      ],
      scheduledSlot: null // e.g. { dayDate: "2026-06-23", startTime: "10:00", endTime: "11:30" }
    },
    {
      id: "seed-t2",
      title: "Refactor database query indexes",
      description: "Optimize user search index query. Check bottleneck queries in dashboard API.",
      dueDate: "", // Will be dynamically set to 2 days from now
      category: "work",
      completed: false,
      important: true,
      urgent: false,
      duration: 120,
      subtasks: [],
      scheduledSlot: null
    },
    {
      id: "seed-t3",
      title: "Renew annual car insurance policy",
      description: "Compare rates between GEICO and Progressive. Submit proof of mileage.",
      dueDate: "", // Will be dynamically set to today
      category: "finance",
      completed: false,
      important: false,
      urgent: true,
      duration: 30,
      subtasks: [],
      scheduledSlot: null
    },
    {
      id: "seed-t4",
      title: "Brainstorm marketing content calendar",
      description: "Draft 3 outline blog posts, set up weekly email newsletter topics.",
      dueDate: "", // Will be dynamically set to 4 days from now
      category: "work",
      completed: true,
      important: false,
      urgent: false,
      duration: 60,
      subtasks: [],
      scheduledSlot: null
    }
  ],
  habits: [
    {
      id: "seed-h1",
      name: "Exercise / Gym",
      frequency: "daily",
      category: "Health",
      streak: 5,
      lastCompleted: "" // Will be set to yesterday
    },
    {
      id: "seed-h2",
      name: "Write Code daily",
      frequency: "daily",
      category: "Work",
      streak: 12,
      lastCompleted: "" // Will be set to yesterday
    },
    {
      id: "seed-h3",
      name: "Read 15 Pages of Book",
      frequency: "daily",
      category: "Study",
      streak: 0,
      lastCompleted: ""
    }
  ],
  goals: [
    {
      id: "seed-g1",
      name: "Complete Advanced Web Development Course",
      targetDate: "2026-07-15",
      category: "Study",
      completed: false
    },
    {
      id: "seed-g2",
      name: "Launch Beta SaaS Application",
      targetDate: "2026-08-30",
      category: "Work",
      completed: false
    }
  ],
  focusSessions: [
    { date: "2026-06-20", duration: 50, completed: true },
    { date: "2026-06-21", duration: 25, completed: true }
  ]
};
// Helper to get formatted date relative to today
function getRelativeISOString(daysFromNow, hour = 12) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  
  // Format as YYYY-MM-DDTHH:MM (local time string matching datetime-local input)
  const pad = (num) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
function getRelativeDateString(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}
export const StorageService = {
  loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Setup dynamic relative dates for dummy seed data
      const state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      
      state.tasks[0].dueDate = getRelativeISOString(1, 14); // Chemistry report due tomorrow 2:00 PM
      state.tasks[1].dueDate = getRelativeISOString(2, 17); // DB index due in 2 days 5:00 PM
      state.tasks[2].dueDate = getRelativeISOString(0, 20); // Car insurance due tonight 8:00 PM
      state.tasks[3].dueDate = getRelativeISOString(4, 10); // Content calendar due in 4 days 10:00 AM
      state.habits[0].lastCompleted = getRelativeDateString(-1); // Gym done yesterday
      state.habits[1].lastCompleted = getRelativeDateString(-1); // Code done yesterday
      this.saveState(state);
      return state;
    }
    
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse local storage. Resetting state.", e);
      return DEFAULT_STATE;
    }
  },
  saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error("Failed to write to local storage.", e);
      return false;
    }
  },
  resetData() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
};
