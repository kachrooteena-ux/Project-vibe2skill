/* -------------------------------------------------------------
 * TASKS MODULE - FocusFlow AI
 * Performs operations on task objects, updates matrix calculations,
 * and handles local heuristics for task step decomposition.
 * ------------------------------------------------------------- */
import { StorageService } from './storage.js';
// Local templates for task breakdown based on common keywords
const TASK_BREAKDOWN_TEMPLATES = [
  {
    keywords: ["chemistry", "lab", "physics", "math", "study", "exam", "report"],
    steps: [
      "Gather materials, class notes, and syllabus guidelines",
      "Read through the core rubric or chapter summary",
      "Complete practice problems / write rough outline",
      "Solve or write the main sections (body, analysis, equations)",
      "Proofread final formulas and submit before deadline"
    ]
  },
  {
    keywords: ["code", "refactor", "database", "query", "website", "sasa", "api", "bug", "git"],
    steps: [
      "Reproduce the issue or document code requirements",
      "Search codebase files and isolate target methods/queries",
      "Write initial refactored code or logic fixes locally",
      "Run unit tests and verify against regression points",
      "Commit changes, push to branch, and merge PR"
    ]
  },
  {
    keywords: ["buy", "shop", "renew", "pay", "bill", "insurance", "finance", "money"],
    steps: [
      "Verify amount due, provider list, or shopping list",
      "Compare price points across 2-3 options",
      "Enter payment Details securely or visit store",
      "Save confirmation receipt and update budget records"
    ]
  },
  {
    keywords: ["market", "plan", "write", "content", "calendar", "design", "video", "logo"],
    steps: [
      "Research trends and reference examples for inspiration",
      "Draft a skeleton layout or conceptual outline",
      "Flesh out high-fidelity content, copy, or graphics",
      "Review layout on mobile/desktop and share for peer reviews",
      "Publish or schedule content distribution"
    ]
  }
];
export const TaskService = {
  getTasks() {
    const state = StorageService.loadState();
    return state.tasks || [];
  },
  saveTasks(tasks) {
    const state = StorageService.loadState();
    state.tasks = tasks;
    StorageService.saveState(state);
    return tasks;
  },
  addTask(taskData) {
    const tasks = this.getTasks();
    const newTask = {
      id: "task-" + Date.now(),
      title: taskData.title,
      description: taskData.description || "",
      dueDate: taskData.dueDate,
      category: taskData.category || "personal",
      completed: false,
      important: !!taskData.important,
      urgent: !!taskData.urgent,
      duration: parseInt(taskData.duration) || 60,
      subtasks: [],
      scheduledSlot: null
    };
    // Auto check urgency if deadline is less than 24 hours away
    if (newTask.dueDate) {
      const diff = new Date(newTask.dueDate) - new Date();
      if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
        newTask.urgent = true;
      }
    }
    tasks.push(newTask);
    this.saveTasks(tasks);
    return newTask;
  },
  updateTask(taskId, taskData) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;
    tasks[index] = {
      ...tasks[index],
      title: taskData.title,
      description: taskData.description || "",
      dueDate: taskData.dueDate,
      category: taskData.category || "personal",
      important: !!taskData.important,
      urgent: !!taskData.urgent,
      duration: parseInt(taskData.duration) || 60
    };
    this.saveTasks(tasks);
    return tasks[index];
  },
  toggleTaskCompleted(taskId) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;
    tasks[index].completed = !tasks[index].completed;
    
    // Add completed focus points to user score
    const state = StorageService.loadState();
    if (tasks[index].completed) {
      state.user.focusScore += Math.round(tasks[index].duration / 2); // 1 point per 2 mins estimate
    } else {
      state.user.focusScore = Math.max(0, state.user.focusScore - Math.round(tasks[index].duration / 2));
    }
    
    // Save both
    state.tasks = tasks;
    StorageService.saveState(state);
    return tasks[index];
  },
  deleteTask(taskId) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== taskId);
    this.saveTasks(tasks);
    return true;
  },
  // Subtask management
  addSubtask(taskId, title) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    const newSub = {
      id: "sub-" + Date.now(),
      title: title,
      completed: false
    };
    task.subtasks.push(newSub);
    this.saveTasks(tasks);
    return newSub;
  },
  toggleSubtask(taskId, subtaskId) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    const sub = task.subtasks.find(s => s.id === subtaskId);
    if (!sub) return null;
    sub.completed = !sub.completed;
    this.saveTasks(tasks);
    return sub;
  },
  // Autonomously break down a task using local heuristic matching
  decomposeTaskHeuristic(taskId) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    const titleLower = task.title.toLowerCase();
    let steps = [];
    // Find keyword matches
    const matched = TASK_BREAKDOWN_TEMPLATES.find(tpl => 
      tpl.keywords.some(kw => titleLower.includes(kw))
    );
    if (matched) {
      steps = matched.steps;
    } else {
      // Default general steps
      steps = [
        "Research and plan initial approach details",
        "List key dependencies or required references",
        "Draft the first milestone piece",
        "Refine work based on guidelines",
        "Perform a final quality check before completion"
      ];
    }
    // Map into subtask objects
    task.subtasks = steps.map((stepText, idx) => ({
      id: `sub-decomp-${Date.now()}-${idx}`,
      title: stepText,
      completed: false
    }));
    this.saveTasks(tasks);
    return task;
  },
  // Compute Eisenhower Matrix coordinates
  getEisenhowerQuadrants() {
    const tasks = this.getTasks().filter(t => !t.completed);
    const q1 = []; // Urgent & Important
    const q2 = []; // Not Urgent & Important
    const q3 = []; // Urgent & Not Important
    const q4 = []; // Not Urgent & Not Important
    const now = new Date();
    tasks.forEach(task => {
      // Auto upgrade to urgent if due date is within 24 hours
      let isUrgent = task.urgent;
      if (task.dueDate) {
        const diff = new Date(task.dueDate) - now;
        if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
          isUrgent = true;
        }
      }
      if (task.important && isUrgent) {
        q1.push(task);
      } else if (task.important && !isUrgent) {
        q2.push(task);
      } else if (!task.important && isUrgent) {
        q3.push(task);
      } else {
        q4.push(task);
      }
    });
    return { q1, q2, q3, q4 };
  }
};