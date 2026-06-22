/* -------------------------------------------------------------
 * HABITS & GOALS MODULE - FocusFlow AI
 * Manages daily habits logging, daily streak calculations,
 * and linking goals to categories.
 * ------------------------------------------------------------- */
import { StorageService } from './storage.js';
export const HabitService = {
  getHabits() {
    const state = StorageService.loadState();
    return state.habits || [];
  },
  saveHabits(habits) {
    const state = StorageService.loadState();
    state.habits = habits;
    StorageService.saveState(state);
    return habits;
  },
  addHabit(habitData) {
    const habits = this.getHabits();
    const newHabit = {
      id: "habit-" + Date.now(),
      name: habitData.name,
      frequency: habitData.frequency || "daily",
      category: habitData.category || "Health",
      streak: 0,
      lastCompleted: ""
    };
    habits.push(newHabit);
    this.saveHabits(habits);
    return newHabit;
  },
  toggleHabit(habitId) {
    const habits = this.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    // If already completed today, toggle it off (undo)
    if (habit.lastCompleted === todayStr) {
      habit.lastCompleted = "";
      habit.streak = Math.max(0, habit.streak - 1);
    } else {
      // Complete habit
      if (habit.lastCompleted === yesterdayStr) {
        // Consecutive completion, increment streak
        habit.streak += 1;
      } else if (habit.lastCompleted === "") {
        // First completion ever
        habit.streak = 1;
      } else {
        // Broken streak, reset to 1
        habit.streak = 1;
      }
      habit.lastCompleted = todayStr;
      // Reward points in user focus score
      const state = StorageService.loadState();
      state.user.focusScore += 10; // 10 points per habit check
      state.habits = habits;
      StorageService.saveState(state);
    }
    this.saveHabits(habits);
    return habit;
  },
  deleteHabit(habitId) {
    let habits = this.getHabits();
    habits = habits.filter(h => h.id !== habitId);
    this.saveHabits(habits);
    return true;
  },
  // Goals CRUD
  getGoals() {
    const state = StorageService.loadState();
    return state.goals || [];
  },
  saveGoals(goals) {
    const state = StorageService.loadState();
    state.goals = goals;
    StorageService.saveState(state);
    return goals;
  },
  addGoal(goalData) {
    const goals = this.getGoals();
    const newGoal = {
      id: "goal-" + Date.now(),
      name: goalData.name,
      targetDate: goalData.targetDate || "",
      category: goalData.category || "Study",
      completed: false
    };
    goals.push(newGoal);
    this.saveGoals(goals);
    return newGoal;
  },
  toggleGoal(goalId) {
    const goals = this.getGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return null;
    goal.completed = !goal.completed;
    // Reward points for goal achievement!
    const state = StorageService.loadState();
    if (goal.completed) {
      state.user.focusScore += 100; // Big milestone reward
    } else {
      state.user.focusScore = Math.max(0, state.user.focusScore - 100);
    }
    state.goals = goals;
    StorageService.saveState(state);
    
    this.saveGoals(goals);
    return goal;
  },
  deleteGoal(goalId) {
    let goals = this.getGoals();
    goals = goals.filter(g => g.id !== goalId);
    this.saveGoals(goals);
    return true;
  }
};
