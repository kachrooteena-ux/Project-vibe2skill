/* -------------------------------------------------------------
 * CALENDAR & SCHEDULER MODULE - FocusFlow AI
 * Coordinates calendar renderings (month grid and week hours)
 * and executes the intelligent AI Auto-Scheduling timeblock allocator.
 * ------------------------------------------------------------- */
import { StorageService } from './storage.js';
import { TaskService } from './tasks.js';
let currentCalendarDate = new Date();
let currentViewMode = "month"; // "month" or "week"
export const CalendarService = {
  getCurrentDate() {
    return currentCalendarDate;
  },
  getCurrentViewMode() {
    return currentViewMode;
  },
  setViewMode(mode) {
    currentViewMode = mode;
  },
  navigate(direction) {
    if (currentViewMode === "month") {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    } else {
      currentCalendarDate.setDate(currentCalendarDate.getDate() + (direction * 7));
    }
    return currentCalendarDate;
  },
  // Renders the monthly grid layout
  renderMonthView(gridContainer, headingEl) {
    gridContainer.innerHTML = "";
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Set header label
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    headingEl.textContent = `${monthNames[month]} ${year}`;
    // Get first day of month (0 = Sun, 1 = Mon...)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Get last date of month (e.g. 30, 31)
    const lastDate = new Date(year, month + 1, 0).getDate();
    // Get last date of previous month
    const prevLastDate = new Date(year, month, 0).getDate();
    const tasks = TaskService.getTasks();
    // 42 grids in a calendar page
    for (let i = 0; i < 42; i++) {
      const dayNode = document.createElement("div");
      dayNode.classList.add("calendar-day");
      
      let dayNumber = 0;
      let targetDateStr = "";
      
      if (i < firstDayIndex) {
        // Prev Month days
        dayNumber = prevLastDate - (firstDayIndex - i - 1);
        dayNode.classList.add("other-month");
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        targetDateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
      } else if (i >= firstDayIndex && i < firstDayIndex + lastDate) {
        // Current Month days
        dayNumber = i - firstDayIndex + 1;
        targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        
        // Highlight Today
        const todayStr = new Date().toISOString().split('T')[0];
        if (targetDateStr === todayStr) {
          dayNode.classList.add("today");
        }
      } else {
        // Next Month days
        dayNumber = i - (firstDayIndex + lastDate) + 1;
        dayNode.classList.add("other-month");
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        targetDateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
      }
      dayNode.setAttribute("data-date", targetDateStr);
      // Create Number label
      const numLabel = document.createElement("span");
      numLabel.classList.add("calendar-day-num");
      numLabel.textContent = dayNumber;
      dayNode.appendChild(numLabel);
      // Render mini task visual list
      const eventContainer = document.createElement("div");
      eventContainer.classList.add("calendar-day-events");
      
      // Filter tasks scheduled on this day
      const dayTasks = tasks.filter(t => t.scheduledSlot && t.scheduledSlot.dayDate === targetDateStr);
      dayTasks.forEach(task => {
        const dot = document.createElement("span");
        dot.classList.add("day-event-dot", task.category);
        dot.textContent = task.title;
        dot.title = `${task.title} (${task.scheduledSlot.startTime} - ${task.scheduledSlot.endTime})`;
        eventContainer.appendChild(dot);
      });
      dayNode.appendChild(eventContainer);
      gridContainer.appendChild(dayNode);
    }
  },
  // Renders the weekly schedule layout with hourly timeline rows
  renderWeekView(headersContainer, timelineContainer, headingEl) {
    headersContainer.innerHTML = "<div></div>"; // empty space for time labels column
    timelineContainer.innerHTML = "";
    // Set header month/year title
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    headingEl.textContent = `Week of ${monthNames[month]} ${currentCalendarDate.getDate()}, ${year}`;
    // Get current date day index (e.g. 0 for Sun)
    const currentDayIdx = currentCalendarDate.getDay();
    // Start week from Sunday
    const startOfWeek = new Date(currentCalendarDate);
    startOfWeek.setDate(currentCalendarDate.getDate() - currentDayIdx);
    const weekDays = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + d);
      weekDays.push(date);
      // Append header item
      const headerNode = document.createElement("div");
      headerNode.classList.add("week-day-header");
      
      const todayStr = new Date().toISOString().split('T')[0];
      const checkStr = date.toISOString().split('T')[0];
      if (todayStr === checkStr) {
        headerNode.classList.add("today");
      }
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d];
      headerNode.innerHTML = `
        <span>${dayName}</span>
        <span class="date-num">${date.getDate()}</span>
      `;
      headersContainer.appendChild(headerNode);
    }
    // Render Time labels on Left column
    const labelColumn = document.createElement("div");
    labelColumn.classList.add("week-timeline-labels");
    for (let h = 0; h < 24; h++) {
      const label = document.createElement("div");
      label.classList.add("timeline-hour-label");
      const displayHour = h === 0 ? "12 AM" : h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
      label.textContent = displayHour;
      timelineContainer.appendChild(label);
    }
    // Render Daily grids
    const tasks = TaskService.getTasks();
    weekDays.forEach(day => {
      const colNode = document.createElement("div");
      colNode.classList.add("week-grid-column");
      const dateStr = day.toISOString().split('T')[0];
      colNode.setAttribute("data-date", dateStr);
      // Find tasks scheduled on this day
      const dayTasks = tasks.filter(t => t.scheduledSlot && t.scheduledSlot.dayDate === dateStr);
      
      dayTasks.forEach(task => {
        const slot = task.scheduledSlot;
        
        // Calculate vertical positions: 60px per hour (1px per minute)
        const parseTime = (timeStr) => {
          const [h, m] = timeStr.split(':').map(Number);
          return h * 60 + m;
        };
        const startMin = parseTime(slot.startTime);
        const endMin = parseTime(slot.endTime);
        const duration = endMin - startMin;
        const eventCard = document.createElement("div");
        eventCard.classList.add("calendar-event", task.category);
        eventCard.style.top = `${startMin}px`;
        eventCard.style.height = `${duration}px`;
        eventCard.title = `${task.title}\nDescription: ${task.description || "None"}\nTime: ${slot.startTime} - ${slot.endTime}`;
        eventCard.innerHTML = `
          <span class="calendar-event-title">${task.title}</span>
          <span class="calendar-event-time"><i data-lucide="clock" style="width:10px; height:10px; display:inline-block"></i> ${slot.startTime} - ${slot.endTime}</span>
        `;
        
        eventCard.addEventListener("click", () => {
          // Trigger task detail/edit event in main coordinate
          const event = new CustomEvent("openTaskDetails", { detail: task });
          window.dispatchEvent(event);
        });
        colNode.appendChild(eventCard);
      });
      timelineContainer.appendChild(colNode);
    });
  },
  // Flagship AI Scheduler Algorithm
  runAutoScheduler() {
    const state = StorageService.loadState();
    const tasks = state.tasks || [];
    const user = state.user || {};
    const workStartStr = user.workStart || "09:00";
    const workEndStr = user.workEnd || "18:00";
    const [workStartHour, workStartMin] = workStartStr.split(':').map(Number);
    const [workEndHour, workEndMin] = workEndStr.split(':').map(Number);
    const workStartMinutes = workStartHour * 60 + workStartMin;
    const workEndMinutes = workEndHour * 60 + workEndMin;
    // Filter tasks that need scheduling
    const pendingTasks = tasks.filter(t => !t.completed && !t.scheduledSlot);
    if (pendingTasks.length === 0) return 0;
    // Sort tasks by priority score: Eisenhower Matrix Quadrants (Q1 -> Q2 -> Q3 -> Q4)
    // We compute priority weights:
    // Q1 (Important & Urgent) = 4
    // Q2 (Important & Not Urgent) = 3
    // Q3 (Not Important & Urgent) = 2
    // Q4 (Not Important & Not Urgent) = 1
    pendingTasks.forEach(t => {
      let isUrgent = t.urgent;
      if (t.dueDate) {
        const diff = new Date(t.dueDate) - new Date();
        if (diff > 0 && diff < 24 * 60 * 60 * 1000) isUrgent = true; // Imminent deadline counts as urgent
      }
      t._priorityWeight = (t.important ? 2 : 0) + (isUrgent ? 1 : 0); // 3=Q1, 2=Q2, 1=Q3, 0=Q4
    });
    pendingTasks.sort((a, b) => b._priorityWeight - a._priorityWeight);
    let scheduledCount = 0;
    
    // Start scheduling from tomorrow morning
    let scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + 1);
    scheduleDate.setHours(0,0,0,0);
    // Keep pointer of date and minutes
    let dayPointer = new Date(scheduleDate);
    // Keep searching daily schedules for empty spaces
    pendingTasks.forEach(task => {
      let durationMins = task.duration || 60;
      let taskScheduled = false;
      let safetyCounter = 0; // Prevent infinite loops
      while (!taskScheduled && safetyCounter < 15) { // search up to 15 days in advance
        const dateStr = dayPointer.toISOString().split('T')[0];
        
        // Find already scheduled items on this specific day
        const existingBlocks = tasks
          .filter(t => t.scheduledSlot && t.scheduledSlot.dayDate === dateStr)
          .map(t => {
            const [sh, sm] = t.scheduledSlot.startTime.split(':').map(Number);
            const [eh, em] = t.scheduledSlot.endTime.split(':').map(Number);
            return {
              start: sh * 60 + sm,
              end: eh * 60 + em
            };
          });
        
        // Sort blocks by start time
        existingBlocks.sort((a, b) => a.start - b.start);
        // Scan day starting from work hour start
        let timePointer = workStartMinutes;
        
        while (timePointer + durationMins <= workEndMinutes) {
          // Check collision with existing blocks
          const collision = existingBlocks.find(b => 
            (timePointer >= b.start && timePointer < b.end) || // start collides
            (timePointer + durationMins > b.start && timePointer + durationMins <= b.end) || // end collides
            (timePointer <= b.start && timePointer + durationMins >= b.end) // spans over
          );
          if (!collision) {
            // Free slot found!
            const pad = (n) => String(n).padStart(2, '0');
            const startHour = Math.floor(timePointer / 60);
            const startMin = timePointer % 60;
            const endHour = Math.floor((timePointer + durationMins) / 60);
            const endMin = (timePointer + durationMins) % 60;
            task.scheduledSlot = {
              dayDate: dateStr,
              startTime: `${pad(startHour)}:${pad(startMin)}`,
              endTime: `${pad(endHour)}:${pad(endMin)}`
            };
            taskScheduled = true;
            scheduledCount++;
            break; // Break inner loop
          } else {
            // Bump pointer past colliding block
            timePointer = collision.end;
          }
        }
        if (!taskScheduled) {
          // No room found today. Move to next day.
          dayPointer.setDate(dayPointer.getDate() + 1);
          safetyCounter++;
        }
      }
    });
    // Save changes
    state.tasks = tasks;
    StorageService.saveState(state);
    
    return scheduledCount;
  },
  clearAutoSchedule() {
    const state = StorageService.loadState();
    const tasks = state.tasks || [];
    tasks.forEach(t => {
      t.scheduledSlot = null;
    });
    state.tasks = tasks;
    StorageService.saveState(state);
  }
};