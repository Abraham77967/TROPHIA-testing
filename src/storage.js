/**
 * Trophia - LocalStorage State Wrapper
 * Handles auto-saving all user profile settings, workout states, fuel checklists,
 * and histories (weight logs, reps completed, and caloric surplus trends).
 */

const STORAGE_KEYS = {
  PROFILE: 'trophia_profile',
  WORKOUT_STATE: 'trophia_workout_state',
  DAILY_FUEL: 'trophia_daily_fuel',
  WEIGHT_HISTORY: 'trophia_weight_history',
  WORKOUT_HISTORY: 'trophia_workout_history',
  EATING_HISTORY: 'trophia_eating_history'
};

// Clean mock data generator for tall underweight students
const MOCK_DATA = {
  weight: [
    { date: 'May 24', weight: 125.0, timestamp: Date.now() - 4 * 86400000 },
    { date: 'May 25', weight: 125.6, timestamp: Date.now() - 3 * 86400000 },
    { date: 'May 26', weight: 126.3, timestamp: Date.now() - 2 * 86400000 },
    { date: 'May 27', weight: 127.2, timestamp: Date.now() - 1 * 86400000 }
  ],
  workout: [
    { date: 'May 24', reps: 32 },
    { date: 'May 25', reps: 35 },
    { date: 'May 26', reps: 38 },
    { date: 'May 27', reps: 41 }
  ],
  eating: [
    { date: 'May 24', calories: 1950 },
    { date: 'May 25', calories: 2300 },
    { date: 'May 26', calories: 2600 },
    { date: 'May 27', calories: 2400 }
  ]
};

export const StorageService = {
  /**
   * Save the user profile
   */
  saveProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  /**
   * Clear user progression history logs
   */
  clearHistory() {
    localStorage.removeItem(STORAGE_KEYS.WEIGHT_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.WORKOUT_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.EATING_HISTORY);
  },

  /**
   * Get the saved user profile
   */
  getProfile() {
    const profile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return profile ? JSON.parse(profile) : null;
  },

  /**
   * Save the workouts state (current target reps/sets for each exercise)
   */
  saveWorkoutState(state) {
    localStorage.setItem(STORAGE_KEYS.WORKOUT_STATE, JSON.stringify(state));
  },

  /**
   * Get the workouts state
   */
  getWorkoutState() {
    const state = localStorage.getItem(STORAGE_KEYS.WORKOUT_STATE);
    return state ? JSON.parse(state) : null;
  },

  /**
   * Save the daily fuel checklist state
   */
  saveDailyFuel(state) {
    localStorage.setItem(STORAGE_KEYS.DAILY_FUEL, JSON.stringify(state));
    // Side effect: update today's caloric intake in history log
    let totalCals = 0;
    state.items.forEach(item => {
      if (item.completed) totalCals += item.calories;
    });
    this.updateTodayEatingLog(totalCals);
  },

  /**
   * Get the daily fuel checklist state
   */
  getDailyFuel() {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_FUEL);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      const todayStr = new Date().toDateString();
      
      // Reset daily items if date changed
      if (parsed.lastUpdatedDate !== todayStr) {
        parsed.items = parsed.items.map(item => ({
          ...item,
          completed: false
        }));
        parsed.lastUpdatedDate = todayStr;
        this.saveDailyFuel(parsed);
      }
      return parsed;
    } catch (e) {
      console.error("Error reading fuel state", e);
      return null;
    }
  },

  // --------------------------------------------------------------------------
  // WEIGHT HISTORY
  // --------------------------------------------------------------------------
  getWeightHistory() {
    const history = localStorage.getItem(STORAGE_KEYS.WEIGHT_HISTORY);
    return history ? JSON.parse(history) : [];
  },

  addWeightLog(weight) {
    const history = this.getWeightHistory();
    const todayStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    
    const existingIndex = history.findIndex(log => log.date === todayStr || log.date === 'Today');
    if (existingIndex !== -1) {
      history[existingIndex].weight = parseFloat(weight);
    } else {
      history.push({
        date: todayStr,
        weight: parseFloat(weight),
        timestamp: Date.now()
      });
    }
    
    if (history.length > 7) history.shift();
    localStorage.setItem(STORAGE_KEYS.WEIGHT_HISTORY, JSON.stringify(history));
  },

  // --------------------------------------------------------------------------
  // WORKOUT PROGRESSION HISTORY
  // --------------------------------------------------------------------------
  getWorkoutHistory() {
    const history = localStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY);
    return history ? JSON.parse(history) : [];
  },

  addWorkoutHistoryLog(repsCount) {
    const history = this.getWorkoutHistory();
    const todayStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    
    const existingIndex = history.findIndex(log => log.date === todayStr);
    if (existingIndex !== -1) {
      history[existingIndex].reps = parseInt(repsCount);
    } else {
      history.push({
        date: todayStr,
        reps: parseInt(repsCount)
      });
    }
    
    if (history.length > 7) history.shift();
    localStorage.setItem(STORAGE_KEYS.WORKOUT_HISTORY, JSON.stringify(history));
  },

  // --------------------------------------------------------------------------
  // EATING (CALORIES SURPLUS) HISTORY
  // --------------------------------------------------------------------------
  getEatingHistory() {
    const history = localStorage.getItem(STORAGE_KEYS.EATING_HISTORY);
    return history ? JSON.parse(history) : [];
  },

  updateTodayEatingLog(caloriesCount) {
    const history = this.getEatingHistory();
    const todayStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    
    const existingIndex = history.findIndex(log => log.date === todayStr);
    if (existingIndex !== -1) {
      history[existingIndex].calories = parseInt(caloriesCount);
    } else {
      history.push({
        date: todayStr,
        calories: parseInt(caloriesCount)
      });
    }
    
    if (history.length > 7) history.shift();
    localStorage.setItem(STORAGE_KEYS.EATING_HISTORY, JSON.stringify(history));
  },

  /**
   * Clear all storage
   */
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
};
