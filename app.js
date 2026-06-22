/* -------------------------------------------------------------
 * APP COORDINATOR - FocusFlow AI
 * Initializes Lucide icons, binds event listeners, manages DOM views,
 * handles task/habit dialog forms, and wires up audio/voice/AI events.
 * ------------------------------------------------------------- */
import { StorageService } from './storage.js';
import { TaskService } from './tasks.js';
import { HabitService } from './habits.js';
import { PomodoroService, AudioSynthService } from './focus.js';
import { VoiceService } from './voice.js';
import { CalendarService } from './calendar.js';
import { AIService } from './ai.js';
// Global DOM Selectors
const doc = document;
let state = StorageService.loadState();
// Core Navigation elements
const sidebarItems = doc.querySelectorAll('.nav-item');
const views = doc.querySelectorAll('.app-view');
const pageTitle = doc.getElementById('current-page-title');
const menuToggle = doc.getElementById('menu-toggle');
const sidebar = doc.getElementById('app-sidebar');
const headerTime = doc.getElementById('live-clock');
// Toast Helper
function showToast(message, type = 'info') {
  const container = doc.getElementById('toast-container');
  const toast = doc.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-triangle';
  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <div class="toast-content">${message}</div>
    <button class="toast-close"><i data-lucide="x"></i></button>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();
  // Close click
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
  // Auto remove
  setTimeout(() => {
    toast.remove();
  }, 4000);
}
// Format Time helper
function updateLiveClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  headerTime.textContent = `${hours}:${minutes} ${ampm}`;
}
// Main View Routing Controller
function switchView(targetViewId) {
  // Update sidebar active classes
  sidebarItems.forEach(item => {
    if (item.getAttribute('data-target') === targetViewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  // Update views display classes
  views.forEach(view => {
    const viewId = view.getAttribute('id');
    if (viewId === `view-${targetViewId}`) {
      view.classList.add('active-view');
    } else {
      view.classList.remove('active-view');
    }
  });
  // Update title banner
  const titles = {
    dashboard: 'Productivity Control',
    tasks: 'Tasks & Prioritization Matrix',
    calendar: 'Smart Calendar & AI Scheduler',
    habits: 'Habits & Long Term Goals',
    focus: 'Focus Mode & Soundscape Synth',
    settings: 'Configuration Panel'
  };
  pageTitle.textContent = titles[targetViewId] || 'FocusFlow AI';
  // Render target view data
  renderViewData(targetViewId);
}
// Master view rendering router
function renderViewData(viewId) {
  state = StorageService.loadState();
  
  // Refresh global profile names
  doc.getElementById('profile-name').textContent = state.user.name;
  doc.getElementById('profile-status').textContent = `Lvl ${Math.floor(state.user.focusScore / 100) + 1} Architect`;
  doc.getElementById('header-focus-score').textContent = state.user.focusScore;
  doc.getElementById('user-avatar-initial').textContent = state.user.name.charAt(0);
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'tasks') renderTasks();
  if (viewId === 'calendar') renderCalendar();
  if (viewId === 'habits') renderHabits();
  if (viewId === 'focus') renderFocus();
  if (viewId === 'settings') renderSettings();
}
/* =============================================================
 * 1. DASHBOARD VIEW CONTROLLER
 * ============================================================= */
function renderDashboard() {
  // Focus Ring computation
  const activeTasks = TaskService.getTasks();
  const completedCount = activeTasks.filter(t => t.completed).length;
  const totalCount = activeTasks.length;
  
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // Update Ring SVG dashoffset
  const ring = doc.getElementById('dashboard-progress-ring');
  const circumference = 439.82; // 2 * PI * r(70)
  const offset = circumference - (percentage / 100) * circumference;
  ring.style.strokeDashoffset = offset;
  doc.getElementById('focus-percentage').textContent = `${percentage}%`;
  doc.getElementById('stat-completed-tasks').textContent = `${completedCount}/${totalCount}`;
  
  // Get Focus Time today
  const todayStr = new Date().toISOString().split('T')[0];
  const sessions = state.focusSessions || [];
  const todaySession = sessions.find(s => s.date === todayStr);
  doc.getElementById('stat-focus-time').textContent = todaySession ? `${todaySession.duration}m` : '0m';
  // Render Proactive AI alerts
  const proactiveFeed = doc.getElementById('proactive-feed-container');
  proactiveFeed.innerHTML = "";
  const alerts = AIService.scanForProactiveAlerts(state);
  
  alerts.forEach(alert => {
    const card = doc.createElement('div');
    card.className = `proactive-item ${alert.type === 'urgency' ? 'alert-urgency' : alert.type === 'habit' ? 'alert-habit' : ''}`;
    
    let icon = 'sparkles';
    if (alert.type === 'urgency') icon = 'alert-triangle';
    if (alert.type === 'habit') icon = 'zap';
    card.innerHTML = `
      <div class="proactive-icon-wrapper ${alert.type === 'urgency' ? 'text-rose' : alert.type === 'habit' ? 'text-emerald' : 'text-cyan'}">
        <i data-lucide="${icon}"></i>
      </div>
      <div class="proactive-content">
        <h3 class="proactive-title">${alert.title}</h3>
        <p class="proactive-desc">${alert.desc}</p>
        <div class="proactive-actions">
          <button class="btn btn-sm btn-primary proactive-act-btn" data-action="${alert.actionType}" data-target-id="${alert.targetId}">${alert.actionLabel}</button>
          <button class="btn btn-sm btn-outline proactive-dismiss-btn">Dismiss</button>
        </div>
      </div>
    `;
    
    // Bind Alert Action events
    card.querySelector('.proactive-act-btn').addEventListener('click', (e) => {
      const act = e.currentTarget.getAttribute('data-action');
      const targetId = e.currentTarget.getAttribute('data-target-id');
      
      if (act === 'schedule-task') {
        switchView('calendar');
      } else if (act === 'run-auto') {
        doc.getElementById('run-auto-scheduler').click();
      } else if (act === 'check-habit') {
        HabitService.toggleHabit(targetId);
        showToast("Habit completed! Streak updated.", "success");
        renderDashboard();
      } else if (act === 'go-focus') {
        switchView('focus');
      }
    });
    card.querySelector('.proactive-dismiss-btn').addEventListener('click', () => {
      card.remove();
    });
    proactiveFeed.appendChild(card);
  });
  // Render Critical Actions (Agenda list)
  const agendaList = doc.getElementById('dashboard-agenda-list');
  agendaList.innerHTML = "";
  
  // Show top 4 upcoming incomplete tasks, sorted by urgency/date
  const agendaTasks = activeTasks.filter(t => !t.completed)
    .sort((a,b) => {
      if(!a.dueDate) return 1;
      if(!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .slice(0, 4);
  if (agendaTasks.length === 0) {
    agendaList.innerHTML = `<p class="text-slate text-center py-4">No tasks pending! Feel free to relax or add a new goal.</p>`;
  } else {
    agendaTasks.forEach(task => {
      const dateText = task.dueDate ? new Date(task.dueDate).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'No deadline';
      const item = doc.createElement('div');
      item.className = 'agenda-item';
      item.innerHTML = `
        <div class="agenda-left">
          <button class="agenda-check-btn" title="Complete task">
            <i data-lucide="circle"></i>
          </button>
          <div class="agenda-details">
            <span class="agenda-title">${task.title}</span>
            <div class="agenda-meta">
              <span class="agenda-time"><i data-lucide="calendar"></i> ${dateText}</span>
              <span class="badge ${task.category === 'work' ? 'badge-indigo' : task.category === 'study' ? 'badge-accent' : 'badge-slate'}">${task.category}</span>
            </div>
          </div>
        </div>
        <div class="agenda-right">
          ${task.scheduledSlot ? `<span class="badge badge-green" title="Scheduled on Calendar"><i data-lucide="check" style="width:10px; height:10px"></i> Scheduled</span>` : `<span class="badge badge-rose" title="Unscheduled timeline block"><i data-lucide="clock" style="width:10px; height:10px"></i> Unscheduled</span>`}
        </div>
      `;
      item.querySelector('.agenda-check-btn').addEventListener('click', () => {
        TaskService.toggleTaskCompleted(task.id);
        showToast("Task completed! Focus score updated.", "success");
        renderViewData('dashboard');
      });
      agendaList.appendChild(item);
    });
  }
  // Habits quick checks
  const miniHabits = doc.getElementById('dashboard-habits-list');
  miniHabits.innerHTML = "";
  const habitsList = HabitService.getHabits().slice(0, 3);
  habitsList.forEach(habit => {
    const todayStr = new Date().toISOString().split('T')[0];
    const completed = habit.lastCompleted === todayStr;
    const row = doc.createElement('div');
    row.className = 'habit-mini-item';
    row.innerHTML = `
      <div class="habit-mini-left">
        <div class="habit-mini-checkbox ${completed ? 'completed' : ''}">
          <i data-lucide="check"></i>
        </div>
        <span>${habit.name}</span>
      </div>
      <div class="habit-streak-badge">
        <i data-lucide="flame"></i>
        <span>${habit.streak}d</span>
      </div>
    `;
    row.querySelector('.habit-mini-checkbox').addEventListener('click', () => {
      HabitService.toggleHabit(habit.id);
      showToast(`${habit.name} logged!`, "success");
      renderDashboard();
    });
    miniHabits.appendChild(row);
  });
  lucide.createIcons();
}
/* =============================================================
 * 2. TASKS VIEW CONTROLLER
 * ============================================================= */
let activeTaskTab = "list-view";
let activeTaskSearch = "";
let activeCategoryFilter = "all";
function renderTasks() {
  const tasks = TaskService.getTasks();
  const searchInput = doc.getElementById('task-search-input');
  const categoryFilter = doc.getElementById('task-category-filter');
  searchInput.value = activeTaskSearch;
  categoryFilter.value = activeCategoryFilter;
  // Filter Tasks
  const filtered = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(activeTaskSearch.toLowerCase()) || 
                          task.description.toLowerCase().includes(activeTaskSearch.toLowerCase());
    const matchesCategory = activeCategoryFilter === "all" || task.category === activeCategoryFilter;
    return matchesSearch && matchesCategory;
  });
  if (activeTaskTab === "list-view") {
    // List View Rendering
    const overdueList = doc.getElementById('tasks-overdue-list');
    const activeList = doc.getElementById('tasks-active-list');
    const completedList = doc.getElementById('tasks-completed-list');
    overdueList.innerHTML = "";
    activeList.innerHTML = "";
    completedList.innerHTML = "";
    const now = new Date();
    let overdueCount = 0;
    let activeCount = 0;
    let completedCount = 0;
    filtered.forEach(task => {
      const card = createTaskCard(task);
      if (task.completed) {
        completedList.appendChild(card);
        completedCount++;
      } else {
        const isOverdue = task.dueDate && new Date(task.dueDate) < now;
        if (isOverdue) {
          overdueList.appendChild(card);
          overdueCount++;
        } else {
          activeList.appendChild(card);
          activeCount++;
        }
      }
    });
    doc.getElementById('count-overdue').textContent = overdueCount;
    doc.getElementById('count-active').textContent = activeCount;
    doc.getElementById('count-completed').textContent = completedCount;
  } else {
    // Eisenhower Matrix Rendering
    const quadrants = TaskService.getEisenhowerQuadrants();
    
    // Filter quadrants based on search/category filters
    const filterQuad = (quadList) => quadList.filter(t => filtered.some(ft => ft.id === t.id));
    renderQuadrantList(doc.getElementById('matrix-q1-body'), filterQuad(quadrants.q1));
    renderQuadrantList(doc.getElementById('matrix-q2-body'), filterQuad(quadrants.q2));
    renderQuadrantList(doc.getElementById('matrix-q3-body'), filterQuad(quadrants.q3));
    renderQuadrantList(doc.getElementById('matrix-q4-body'), filterQuad(quadrants.q4));
  }
  lucide.createIcons();
}
// Generate single task card element
function createTaskCard(task) {
  const card = doc.createElement('div');
  card.className = 'task-card';
  card.setAttribute('data-id', task.id);
  const dateText = task.dueDate ? new Date(task.dueDate).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'No deadline';
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  
  card.innerHTML = `
    <div class="task-card-main">
      <div class="task-card-left">
        <div class="task-checkbox-wrapper">
          <div class="task-checkbox ${task.completed ? 'completed' : ''}" title="Toggle Complete">
            <i data-lucide="check"></i>
          </div>
        </div>
        <div class="task-card-details">
          <span class="task-title ${task.completed ? 'completed' : ''}">${task.title}</span>
          ${task.description ? `<p class="task-notes">${task.description}</p>` : ''}
          <div class="task-meta-row">
            <span class="task-meta-item"><i data-lucide="calendar"></i> ${dateText}</span>
            <span class="task-meta-item"><i data-lucide="clock"></i> ${task.duration} mins</span>
            <span class="badge ${task.category === 'work' ? 'badge-indigo' : task.category === 'study' ? 'badge-accent' : 'badge-slate'}">${task.category}</span>
            ${task.important ? '<span class="badge badge-rose">Important</span>' : ''}
            ${task.urgent ? '<span class="badge badge-rose">Urgent</span>' : ''}
            ${task.scheduledSlot ? `<span class="badge badge-green" title="Scheduled"><i data-lucide="calendar-check" style="width:11px; height:11px; margin-right:2px"></i> ${task.scheduledSlot.dayDate}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="task-card-actions">
        <button class="btn btn-icon btn-sm btn-outline btn-decompose" title="Decompose into Subtasks with AI">
          <i data-lucide="git-branch"></i> Decompose
        </button>
        <button class="btn btn-icon btn-sm btn-outline btn-edit-task" title="Edit Task">
          <i data-lucide="edit"></i>
        </button>
        <button class="btn btn-icon btn-sm btn-outline text-rose border-rose btn-delete-task" title="Delete Task">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
    
    ${hasSubtasks ? `
      <div class="subtasks-panel">
        <h4 class="subtasks-title">Subtask checklist</h4>
        <div class="subtasks-list">
          ${task.subtasks.map(sub => `
            <div class="subtask-item ${sub.completed ? 'completed' : ''}">
              <div class="subtask-checkbox ${sub.completed ? 'completed' : ''}" data-sub-id="${sub.id}">
                <i data-lucide="check"></i>
              </div>
              <span>${sub.title}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
  // Bind complete click
  card.querySelector('.task-checkbox').addEventListener('click', () => {
    TaskService.toggleTaskCompleted(task.id);
    showToast(task.completed ? "Task marked active" : "Task completed! Focus points added.", "success");
    renderTasks();
  });
  // Bind subtask click
  card.querySelectorAll('.subtask-checkbox').forEach(box => {
    box.addEventListener('click', (e) => {
      const subId = e.currentTarget.getAttribute('data-sub-id');
      TaskService.toggleSubtask(task.id, subId);
      renderTasks();
    });
  });
  // Bind delete click
  card.querySelector('.btn-delete-task').addEventListener('click', () => {
    if (confirm("Delete this task?")) {
      TaskService.deleteTask(task.id);
      showToast("Task deleted.");
      renderTasks();
    }
  });
  // Bind edit click
  card.querySelector('.btn-edit-task').addEventListener('click', () => {
    openTaskModal(task);
  });
  // Bind AI Decompose click
  card.querySelector('.btn-decompose').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const initialText = btn.innerHTML;
    btn.innerHTML = `<div class="spinner-small" style="display:inline-block"></div> Analyzing...`;
    btn.disabled = true;
    try {
      // Check if Gemini API key exists
      if (state.user.geminiApiKey) {
        const steps = await AIService.decomposeTaskWithAI(task.title, task.description);
        if (steps && steps.length > 0) {
          // Write back
          task.subtasks = steps.map((s, idx) => ({ id: `sub-ai-${Date.now()}-${idx}`, title: s, completed: false }));
          TaskService.saveTasks(TaskService.getTasks().map(t => t.id === task.id ? task : t));
          showToast("AI decomposed this task into strategic action points!", "success");
        } else {
          // Fallback heuristic
          TaskService.decomposeTaskHeuristic(task.id);
          showToast("Decomposed using local optimization models.", "info");
        }
      } else {
        // Run heuristic
        TaskService.decomposeTaskHeuristic(task.id);
        showToast("Decomposed using local optimization templates. Add Gemini API Key for dynamic reasoning.", "info");
      }
    } catch(err) {
      TaskService.decomposeTaskHeuristic(task.id);
      showToast("Decomposed using local optimization.", "info");
    } finally {
      btn.innerHTML = initialText;
      btn.disabled = false;
      renderTasks();
    }
  });
  return card;
}
// Matrix Quadrant content loader
function renderQuadrantList(container, quadTasks) {
  container.innerHTML = "";
  if (quadTasks.length === 0) {
    container.innerHTML = `<span class="text-slate text-center font-medium my-auto block">No active tasks.</span>`;
    return;
  }
  
  quadTasks.forEach(task => {
    const card = doc.createElement('div');
    card.className = 'matrix-mini-card';
    const dateText = task.dueDate ? new Date(task.dueDate).toLocaleDateString([], {month: 'short', day: 'numeric'}) : 'No date';
    card.innerHTML = `
      <span class="matrix-mini-title">${task.title}</span>
      <span class="matrix-mini-date">${dateText}</span>
    `;
    
    card.addEventListener('click', () => {
      // Navigate/open task drawer
      openTaskModal(task);
    });
    container.appendChild(card);
  });
}
// Add task Dialog forms
function openTaskModal(taskToEdit = null) {
  const modal = doc.getElementById('task-modal');
  const form = doc.getElementById('task-form');
  
  doc.getElementById('modal-task-title').textContent = taskToEdit ? "Edit Task" : "Create New Task";
  doc.getElementById('btn-save-task').textContent = taskToEdit ? "Save Changes" : "Create Task";
  
  if (taskToEdit) {
    doc.getElementById('task-edit-id').value = taskToEdit.id;
    doc.getElementById('task-title-input').value = taskToEdit.title;
    doc.getElementById('task-desc-input').value = taskToEdit.description;
    doc.getElementById('task-due-date').value = taskToEdit.dueDate ? taskToEdit.dueDate.substring(0, 16) : "";
    doc.getElementById('task-category').value = taskToEdit.category;
    doc.getElementById('task-important').checked = taskToEdit.important;
    doc.getElementById('task-urgent').checked = taskToEdit.urgent;
    doc.getElementById('task-duration-est').value = taskToEdit.duration;
  } else {
    form.reset();
    doc.getElementById('task-edit-id').value = "";
    // Set default due date to tomorrow afternoon
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    doc.getElementById('task-due-date').value = tomorrow.toISOString().substring(0, 16);
  }
  modal.classList.add('active-modal');
}
function closeTaskModal() {
  doc.getElementById('task-modal').classList.remove('active-modal');
}
/* =============================================================
 * 3. CALENDAR VIEW CONTROLLER
 * ============================================================= */
function renderCalendar() {
  const gridContainer = doc.getElementById('calendar-month-days');
  const weekHeaders = doc.getElementById('calendar-week-headers');
  const weekTimeline = doc.getElementById('calendar-week-timeline');
  const heading = doc.getElementById('calendar-month-year');
  const monthContainer = doc.getElementById('calendar-month-grid-container');
  const weekContainer = doc.getElementById('calendar-week-grid-container');
  const mode = CalendarService.getCurrentViewMode();
  if (mode === "month") {
    monthContainer.classList.remove('hidden');
    weekContainer.classList.add('hidden');
    CalendarService.renderMonthView(gridContainer, heading);
  } else {
    monthContainer.classList.add('hidden');
    weekContainer.classList.remove('hidden');
    CalendarService.renderWeekView(weekHeaders, weekTimeline, heading);
  }
  // Render Sidebar Scheduled blocks
  const blocksContainer = doc.getElementById('calendar-blocks-list');
  blocksContainer.innerHTML = "";
  
  const scheduledTasks = TaskService.getTasks().filter(t => !t.completed && t.scheduledSlot)
    .sort((a,b) => {
      const valA = a.scheduledSlot.dayDate + a.scheduledSlot.startTime;
      const valB = b.scheduledSlot.dayDate + b.scheduledSlot.startTime;
      return valA.localeCompare(valB);
    });
  if (scheduledTasks.length === 0) {
    blocksContainer.innerHTML = `<span class="text-slate text-center block py-4">Timeline empty. Run AI Auto-Scheduler.</span>`;
  } else {
    scheduledTasks.forEach(task => {
      const item = doc.createElement('div');
      item.className = 'sched-block-item';
      
      const dateObj = new Date(task.scheduledSlot.dayDate + "T" + task.scheduledSlot.startTime);
      const displayDate = dateObj.toLocaleDateString([], {month:'short', day:'numeric'});
      item.innerHTML = `
        <span class="title">${task.title}</span>
        <span class="time"><i data-lucide="calendar"></i> ${displayDate} | ${task.scheduledSlot.startTime} - ${task.scheduledSlot.endTime}</span>
      `;
      blocksContainer.appendChild(item);
    });
  }
  lucide.createIcons();
}
/* =============================================================
 * 4. HABITS & GOALS VIEW CONTROLLER
 * ============================================================= */
function renderHabits() {
  // Renders goals list
  const goalsContainer = doc.getElementById('goals-list-container');
  goalsContainer.innerHTML = "";
  const goalsList = HabitService.getGoals();
  if (goalsList.length === 0) {
    goalsContainer.innerHTML = `<span class="text-slate py-4 block">No goals added yet. Define some milestones!</span>`;
  } else {
    goalsList.forEach(goal => {
      const card = doc.createElement('div');
      card.className = `card ${goal.completed ? 'border-indigo' : ''}`;
      card.style.padding = '16px';
      
      const dateText = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString([], {month:'short', day:'numeric', year:'numeric'}) : 'No target date';
      card.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between">
          <div style="display:flex; align-items:center; gap:12px">
            <input type="checkbox" class="form-checkbox" ${goal.completed ? 'checked' : ''} style="width:20px; height:20px">
            <div style="display:flex; flex-direction:column">
              <span style="font-weight:600; font-size:15px; ${goal.completed ? 'text-decoration:line-through; color:var(--text-slate)' : 'color:var(--text-white)'}">${goal.name}</span>
              <small style="color:var(--text-muted); margin-top:2px">Target: ${dateText} | Category: ${goal.category}</small>
            </div>
          </div>
          <button class="btn btn-icon btn-sm btn-outline text-rose border-rose btn-delete-goal" style="padding:4px"><i data-lucide="trash-2" style="width:14px; height:14px"></i></button>
        </div>
      `;
      card.querySelector('input').addEventListener('change', () => {
        HabitService.toggleGoal(goal.id);
        showToast(goal.completed ? "Goal marked incomplete" : "Goal accomplished! +100 Score!", "success");
        renderHabits();
      });
      card.querySelector('.btn-delete-goal').addEventListener('click', () => {
        if(confirm("Delete goal?")) {
          HabitService.deleteGoal(goal.id);
          showToast("Goal deleted.");
          renderHabits();
        }
      });
      goalsContainer.appendChild(card);
    });
  }
  // Renders habits list
  const habitsContainer = doc.getElementById('habits-list-container');
  habitsContainer.innerHTML = "";
  const habitsList = HabitService.getHabits();
  if (habitsList.length === 0) {
    habitsContainer.innerHTML = `<span class="text-slate py-4 block">No habits added. Build consistency.</span>`;
  } else {
    habitsList.forEach(habit => {
      const todayStr = new Date().toISOString().split('T')[0];
      const completed = habit.lastCompleted === todayStr;
      const card = doc.createElement('div');
      card.className = `card ${completed ? 'border-indigo' : ''}`;
      card.style.padding = '16px';
      
      card.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between">
          <div style="display:flex; align-items:center; gap:12px">
            <div class="habit-mini-checkbox ${completed ? 'completed' : ''}" style="width:24px; height:24px; border-radius:50%">
              <i data-lucide="check" style="width:14px; height:14px"></i>
            </div>
            <div style="display:flex; flex-direction:column">
              <span style="font-weight:600; font-size:15px; color:var(--text-white)">${habit.name}</span>
              <small style="color:var(--text-muted); margin-top:2px">Frequency: ${habit.frequency} | Category: ${habit.category}</small>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px">
            <span class="habit-streak-badge" style="font-size:13px"><i data-lucide="flame" style="width:14px; height:14px"></i> ${habit.streak} day streak</span>
            <button class="btn btn-icon btn-sm btn-outline text-rose border-rose btn-delete-habit" style="padding:4px"><i data-lucide="trash-2" style="width:14px; height:14px"></i></button>
          </div>
        </div>
      `;
      card.querySelector('.habit-mini-checkbox').addEventListener('click', () => {
        HabitService.toggleHabit(habit.id);
        showToast(`${habit.name} checked!`, "success");
        renderHabits();
      });
      card.querySelector('.btn-delete-habit').addEventListener('click', () => {
        if(confirm("Delete habit?")) {
          HabitService.deleteHabit(habit.id);
          showToast("Habit removed.");
          renderHabits();
        }
      });
      habitsContainer.appendChild(card);
    });
  }
  lucide.createIcons();
}
/* =============================================================
 * 5. FOCUS VIEW CONTROLLER
 * ============================================================= */
function renderFocus() {
  const timerLabel = doc.getElementById('timer-time-left');
  const timerStatus = doc.getElementById('timer-status-label');
  const toggleIcon = doc.getElementById('timer-toggle-icon');
  
  // Set default initial timer state
  const pad = (n) => String(n).padStart(2, '0');
  const m = Math.floor(PomodoroService.timeLeft / 60);
  const s = PomodoroService.timeLeft % 60;
  
  timerLabel.textContent = `${pad(m)}:${pad(s)}`;
  doc.getElementById('overlay-time-display').textContent = `${pad(m)}:${pad(s)}`;
  // Mode updates
  const labelMap = {
    focus: "Deep Flow Focus",
    'short-break': "Short Break",
    'long-break': "Long Break"
  };
  timerStatus.textContent = labelMap[PomodoroService.mode] || "Focus";
  doc.getElementById('overlay-status-display').textContent = labelMap[PomodoroService.mode] || "Focus";
  // Check state to toggle Play/Pause Lucide icons
  if (PomodoroService.isActive) {
    toggleIcon.setAttribute('data-lucide', 'pause');
    doc.getElementById('overlay-timer-toggle').innerHTML = `<i data-lucide="pause"></i> Pause Session`;
  } else {
    toggleIcon.setAttribute('data-lucide', 'play');
    doc.getElementById('overlay-timer-toggle').innerHTML = `<i data-lucide="play"></i> Resume Session`;
  }
  // Update ring progress
  const ring = doc.getElementById('timer-progress-bar');
  const circumference = 691.15; // 2 * PI * r(110)
  const percentLeft = PomodoroService.timeLeft / PomodoroService.duration;
  const offset = circumference - (percentLeft * circumference);
  ring.style.strokeDashoffset = offset;
  // Soundscape visual buttons active state updates
  doc.querySelectorAll('.sound-play-toggle').forEach(btn => {
    const type = btn.getAttribute('data-sound');
    const playing = synthNodes[type] && synthNodes[type].playing;
    const volSlider = doc.getElementById(`volume-${type}`);
    if (playing) {
      btn.innerHTML = `<i data-lucide="square"></i>`;
      btn.classList.add('btn-primary');
      volSlider.disabled = false;
    } else {
      btn.innerHTML = `<i data-lucide="play"></i>`;
      btn.classList.remove('btn-primary');
      volSlider.disabled = true;
    }
  });
  lucide.createIcons();
}
// Focus Tick Callback updates labels
function onTimerTick(timeLeft, duration) {
  const pad = (n) => String(n).padStart(2, '0');
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  
  doc.getElementById('timer-time-left').textContent = `${pad(m)}:${pad(s)}`;
  doc.getElementById('overlay-time-display').textContent = `${pad(m)}:${pad(s)}`;
  // Ring offset calculation
  const ring = doc.getElementById('timer-progress-bar');
  const circumference = 691.15;
  const percentLeft = timeLeft / duration;
  const offset = circumference - (percentLeft * circumference);
  ring.style.strokeDashoffset = offset;
}
function onTimerComplete(mode) {
  showToast(mode === 'focus' ? "Focus session complete! +50 Score!" : "Break complete! Ready to lock back in?", "success");
  
  // Close fullscreen focus mode if open
  exitFullscreenFocus();
  renderViewData('focus');
}
// Fullscreen focus overlay managers
function enterFullscreenFocus() {
  const overlay = doc.getElementById('fullscreen-focus-overlay');
  overlay.classList.remove('hidden');
  // Trigger quotes cycle
  const quotes = [
    '"Focus is a muscle, and you are building it right now."',
    '"Simplicity is the ultimate sophistication. Focus on one task."',
    '"Your mind is for having ideas, not holding them. Stay in flow."',
    '"Procrastination is the thief of time. Take action now."',
    '"Only those who try to go too far can possibly find out how far one can go."'
  ];
  doc.getElementById('overlay-focus-quote').textContent = quotes[Math.floor(Math.random() * quotes.length)];
}
function exitFullscreenFocus() {
  doc.getElementById('fullscreen-focus-overlay').classList.add('hidden');
}
/* =============================================================
 * 6. SETTINGS VIEW CONTROLLER
 * ============================================================= */
function renderSettings() {
  doc.getElementById('settings-name').value = state.user.name;
  doc.getElementById('settings-role').value = state.user.role;
  doc.getElementById('settings-work-start').value = state.user.workStart;
  doc.getElementById('settings-work-end').value = state.user.workEnd;
  doc.getElementById('settings-focus-goal').value = state.user.weeklyGoalHours;
  doc.getElementById('settings-api-key').value = state.user.geminiApiKey;
  // Key badge updates
  const badge = doc.getElementById('ai-engine-status-badge');
  if (state.user.geminiApiKey) {
    badge.textContent = "Google Gemini Live Enabled";
    badge.className = "badge badge-green";
  } else {
    badge.textContent = "Local Heuristic Simulator";
    badge.className = "badge badge-slate";
  }
}
/* =============================================================
 * 7. AI COMPANION PANEL (CHAT SYSTEM)
 * ============================================================= */
const chatDrawer = doc.getElementById('companion-chat-drawer');
const openChatBtn = doc.getElementById('companion-avatar-trigger');
const closeChatBtn = doc.getElementById('close-companion-drawer');
const chatSubmitBtn = doc.getElementById('companion-send-btn');
const chatInput = doc.getElementById('companion-text-input');
const chatMessages = doc.getElementById('companion-messages-container');
function toggleChatDrawer() {
  chatDrawer.classList.toggle('open');
  if (chatDrawer.classList.contains('open')) {
    chatInput.focus();
    scrollChatToBottom();
  }
}
function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
// Appends message bubbles
function appendChatMessage(sender, messageText) {
  const msgNode = doc.createElement('div');
  msgNode.className = `message ${sender === 'user' ? 'user-message' : sender === 'system' ? 'system-message' : 'ai-message'}`;
  
  const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  msgNode.innerHTML = `
    <p>${messageText}</p>
    <span class="message-time">${timeStr}</span>
  `;
  
  chatMessages.appendChild(msgNode);
  scrollChatToBottom();
}
async function handleChatSubmission() {
  const rawText = chatInput.value.trim();
  if (!rawText) return;
  chatInput.value = "";
  appendChatMessage('user', rawText);
  // Set thinking spinner state
  const indicator = doc.getElementById('companion-status-indicator');
  const statusLabel = doc.getElementById('companion-status-text');
  indicator.classList.add('thinking');
  statusLabel.textContent = "AI is thinking...";
  try {
    const response = await AIService.getResponse(rawText);
    appendChatMessage('ai', response);
    // TTS voice speech output if checkbox enabled
    const voiceOutputChecked = doc.getElementById('toggle-voice-response').checked;
    if (voiceOutputChecked) {
      VoiceService.speak(response.replace(/[\*#_`]/g, "")); // remove markdown characters
    }
  } catch (err) {
    appendChatMessage('ai', "Pardon, I encountered a communication block. Let's try again.");
  } finally {
    indicator.classList.remove('thinking');
    statusLabel.textContent = "Online";
  }
}
/* =============================================================
 * 8. VOICE RECOGNITION (SPEECH-TO-TEXT COMMANDS)
 * ============================================================= */
let recordingActive = false;
function toggleVoiceRecognition() {
  const micBtn = doc.getElementById('companion-voice-btn');
  const visualWaves = doc.getElementById('companion-voice-waves');
  if (recordingActive) {
    VoiceService.stopListening();
  } else {
    VoiceService.startListening(
      // On Start
      () => {
        recordingActive = true;
        micBtn.classList.add('active-recording');
        visualWaves.classList.remove('hidden');
        showToast("Voice assistant listening...", "info");
      },
      // On Result
      (transcript) => {
        appendChatMessage('user', `*(Spoken)* "${transcript}"`);
        processVoiceCommand(transcript);
      },
      // On Error
      (error) => {
        showToast(`Voice assistant error: ${error}`, "error");
        stopListeningUI();
      },
      // On End
      () => {
        stopListeningUI();
      }
    );
  }
}
function stopListeningUI() {
  recordingActive = false;
  doc.getElementById('companion-voice-btn').classList.remove('active-recording');
  doc.getElementById('companion-voice-waves').classList.add('hidden');
}
// Executes actions parsed from Voice commands
function processVoiceCommand(transcript) {
  const commandResult = VoiceService.parseVoiceCommand(transcript);
  
  if (commandResult.action === "navigate") {
    switchView(commandResult.view);
    appendChatMessage('ai', commandResult.text);
    VoiceService.speak(commandResult.text);
  } 
  else if (commandResult.action === "control-timer") {
    switchView('focus');
    if (commandResult.command === "start") PomodoroService.start();
    if (commandResult.command === "pause") PomodoroService.pause();
    if (commandResult.command === "reset") PomodoroService.reset();
    appendChatMessage('ai', commandResult.text);
    VoiceService.speak(commandResult.text);
    renderFocus();
  } 
  else if (commandResult.action === "run-scheduler") {
    switchView('calendar');
    doc.getElementById('run-auto-scheduler').click();
    appendChatMessage('ai', commandResult.text);
    VoiceService.speak(commandResult.text);
  } 
  else if (commandResult.action === "add-task") {
    TaskService.addTask(commandResult.task);
    appendChatMessage('ai', commandResult.text);
    VoiceService.speak(commandResult.text);
    showToast("Task created via voice!", "success");
    renderTasks();
  } 
  else {
    // Normal chat submission
    chatInput.value = transcript;
    handleChatSubmission();
  }
}
/* =============================================================
 * INITIAL BINDINGS & APP EVENT LISTENERS
 * ============================================================= */
doc.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  
  // Set Clock intervals
  updateLiveClock();
  setInterval(updateLiveClock, 1000);
  // Tab View triggers
  sidebarItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = e.currentTarget.getAttribute('data-target');
      switchView(target);
      
      // Close mobile sidebar if open
      sidebar.classList.remove('mobile-open');
    });
  });
  // Mobile navigation trigger
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });
  // Task View Filter Events
  doc.getElementById('task-search-input').addEventListener('input', (e) => {
    activeTaskSearch = e.target.value;
    renderTasks();
  });
  doc.getElementById('task-category-filter').addEventListener('change', (e) => {
    activeCategoryFilter = e.target.value;
    renderTasks();
  });
  doc.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Manage visual toggles
      const parent = e.currentTarget.parentNode;
      parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      // Check calendar tabs
      const calView = e.currentTarget.getAttribute('data-cal-view');
      if (calView) {
        CalendarService.setViewMode(calView);
        renderCalendar();
        return;
      }
      // Check task tabs
      const tabTarget = e.currentTarget.getAttribute('data-tab');
      if (tabTarget) {
        activeTaskTab = tabTarget;
        
        // Hide/Show tab content panes
        doc.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active-pane'));
        doc.getElementById(`tasks-${tabTarget}`).classList.add('active-pane');
        
        renderTasks();
      }
    });
  });
  // Add Task Modal buttons
  doc.getElementById('open-new-task-modal').addEventListener('click', () => openTaskModal(null));
  doc.getElementById('close-task-modal').addEventListener('click', closeTaskModal);
  doc.getElementById('btn-cancel-task').addEventListener('click', closeTaskModal);
  doc.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const taskId = doc.getElementById('task-edit-id').value;
    const taskData = {
      title: doc.getElementById('task-title-input').value,
      description: doc.getElementById('task-desc-input').value,
      dueDate: doc.getElementById('task-due-date').value,
      category: doc.getElementById('task-category').value,
      important: doc.getElementById('task-important').checked,
      urgent: doc.getElementById('task-urgent').checked,
      duration: doc.getElementById('task-duration-est').value
    };
    if (taskId) {
      TaskService.updateTask(taskId, taskData);
      showToast("Task updated successfully", "success");
    } else {
      TaskService.addTask(taskData);
      showToast("Task created successfully", "success");
    }
    
    closeTaskModal();
    renderTasks();
  });
  // Auto-Scheduler triggers
  doc.getElementById('run-auto-scheduler').addEventListener('click', () => {
    const count = CalendarService.runAutoScheduler();
    if (count > 0) {
      showToast(`AI Auto-Scheduler placed ${count} task blocks in empty timeline slots!`, "success");
    } else {
      showToast("No unscheduled tasks found. Add new tasks to schedule.", "info");
    }
    renderCalendar();
  });
  doc.getElementById('clear-ai-schedule').addEventListener('click', () => {
    if (confirm("Clear all scheduled timeline blocks?")) {
      CalendarService.clearAutoSchedule();
      showToast("Timeline cleared.");
      renderCalendar();
    }
  });
  doc.getElementById('dash-schedule-next-btn').addEventListener('click', () => {
    switchView('calendar');
    doc.getElementById('run-auto-scheduler').click();
  });
  // Habits Goals additions
  const habitModal = doc.getElementById('habit-modal');
  doc.getElementById('add-goal-btn').addEventListener('click', () => {
    habitModal.classList.add('active-modal');
    doc.getElementById('modal-habit-title').textContent = "Add Productivity Goal";
    doc.getElementById('lbl-habit-name').textContent = "Goal Description";
    doc.getElementById('habit-type').value = "goal";
    doc.getElementById('habit-fields-only').classList.add('hidden');
    doc.getElementById('goal-fields-only').classList.remove('hidden');
    doc.getElementById('habit-form').reset();
  });
  doc.getElementById('add-habit-btn').addEventListener('click', () => {
    habitModal.classList.add('active-modal');
    doc.getElementById('modal-habit-title').textContent = "Add Daily Habit";
    doc.getElementById('lbl-habit-name').textContent = "Habit Name";
    doc.getElementById('habit-type').value = "habit";
    doc.getElementById('habit-fields-only').classList.remove('hidden');
    doc.getElementById('goal-fields-only').classList.add('hidden');
    doc.getElementById('habit-form').reset();
  });
  doc.getElementById('close-habit-modal').addEventListener('click', () => habitModal.classList.remove('active-modal'));
  doc.getElementById('btn-cancel-habit').addEventListener('click', () => habitModal.classList.remove('active-modal'));
  
  doc.getElementById('habit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = doc.getElementById('habit-type').value;
    
    if (type === 'goal') {
      const gData = {
        name: doc.getElementById('habit-name-input').value,
        targetDate: doc.getElementById('goal-target-date').value,
        category: 'Study' // general placeholder
      };
      HabitService.addGoal(gData);
      showToast("Goal created!", "success");
    } else {
      const hData = {
        name: doc.getElementById('habit-name-input').value,
        frequency: doc.getElementById('habit-frequency').value,
        category: doc.getElementById('habit-category').value
      };
      HabitService.addHabit(hData);
      showToast("Habit added!", "success");
    }
    habitModal.classList.remove('active-modal');
    renderHabits();
  });
  // Pomodoro timer buttons
  PomodoroService.init(onTimerTick, onTimerComplete);
  doc.querySelectorAll('.pomodoro-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      doc.querySelectorAll('.pomodoro-tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      const duration = parseInt(e.currentTarget.getAttribute('data-duration'));
      const mode = e.currentTarget.getAttribute('data-mode');
      PomodoroService.setDuration(duration, mode);
      renderFocus();
    });
  });
  doc.getElementById('timer-toggle-btn').addEventListener('click', () => {
    if (PomodoroService.isActive) {
      PomodoroService.pause();
    } else {
      PomodoroService.start();
    }
    renderFocus();
  });
  doc.getElementById('timer-reset-btn').addEventListener('click', () => {
    PomodoroService.reset();
    renderFocus();
  });
  // Soundscape synthesizers triggers
  doc.querySelectorAll('.sound-play-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.currentTarget.getAttribute('data-sound');
      const vol = doc.getElementById(`volume-${type}`).value;
      const playing = AudioSynthService.toggleSound(type, vol);
      
      showToast(playing ? `${type.charAt(0).toUpperCase() + type.slice(1)} synthesizer active.` : `${type.charAt(0).toUpperCase() + type.slice(1)} deactivated.`);
      renderFocus();
    });
  });
  // Sound volume sliders input
  doc.querySelectorAll('.sound-volume').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const type = e.currentTarget.id.replace('volume-', '');
      AudioSynthService.setVolume(type, e.target.value);
    });
  });
  // Fullscreen Focus Mode
  doc.getElementById('fullscreen-focus-btn').addEventListener('click', () => {
    enterFullscreenFocus();
  });
  doc.getElementById('exit-fullscreen-focus').addEventListener('click', () => {
    exitFullscreenFocus();
  });
  doc.getElementById('overlay-timer-toggle').addEventListener('click', () => {
    doc.getElementById('timer-toggle-btn').click();
    renderFocus();
  });
  doc.querySelectorAll('.sound-overlay-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.currentTarget.getAttribute('data-sound');
      const realBtn = doc.querySelector(`.sound-play-toggle[data-sound="${type}"]`);
      if (realBtn) {
        realBtn.click();
        
        // Toggle overlay classes
        const playing = synthNodes[type] && synthNodes[type].playing;
        if (playing) {
          e.currentTarget.classList.add('btn-primary');
        } else {
          e.currentTarget.classList.remove('btn-primary');
        }
      }
    });
  });
  // Settings Save profile forms
  doc.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.user.name = doc.getElementById('settings-name').value;
    state.user.role = doc.getElementById('settings-role').value;
    state.user.workStart = doc.getElementById('settings-work-start').value;
    state.user.workEnd = doc.getElementById('settings-work-end').value;
    state.user.weeklyGoalHours = parseInt(doc.getElementById('settings-focus-goal').value);
    
    StorageService.saveState(state);
    showToast("Profile settings updated successfully.", "success");
    renderViewData('settings');
  });
  // Settings API key triggers
  const apiInput = doc.getElementById('settings-api-key');
  const apiToggleBtn = doc.getElementById('toggle-api-key-visibility');
  apiToggleBtn.addEventListener('click', () => {
    const isPass = apiInput.type === 'password';
    apiInput.type = isPass ? 'text' : 'password';
    apiToggleBtn.querySelector('i').setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
    lucide.createIcons();
  });
  doc.getElementById('save-api-key-btn').addEventListener('click', () => {
    state.user.geminiApiKey = apiInput.value.trim();
    StorageService.saveState(state);
    showToast("API configurations saved successfully.", "success");
    renderViewData('settings');
  });
  doc.getElementById('clear-api-key-btn').addEventListener('click', () => {
    state.user.geminiApiKey = "";
    StorageService.saveState(state);
    showToast("API key removed. FocusFlow switched back to Local Simulator mode.");
    renderViewData('settings');
  });
  doc.getElementById('reset-app-data-btn').addEventListener('click', () => {
    if (confirm("Reset application? All tasks, streaks, achievements will be cleared forever!")) {
      StorageService.resetData();
    }
  });
  // Chat panel drawer toggles
  openChatBtn.addEventListener('click', toggleChatDrawer);
  closeChatBtn.addEventListener('click', toggleChatDrawer);
  chatSubmitBtn.addEventListener('click', handleChatSubmission);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmission();
    }
  });
  // Voice assistant listener
  doc.getElementById('companion-voice-btn').addEventListener('click', toggleVoiceRecognition);
  // Custom Event to open task details from calendar week items
  window.addEventListener('openTaskDetails', (e) => {
    openTaskModal(e.detail);
  });
  // Initialize view displays
  switchView('dashboard');
});