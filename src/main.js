/**
 * Trophia — Performance Compass Controller
 * Orchestrates onboarding routing, interactive body chart maps, circular SVG calorie dials,
 * set-by-set exercise training checklists, and tabbed SVG analytics trend charts.
 */

import './style.css';
import { BodyChart, ViewSide } from 'body-muscles';
import { StorageService } from './storage.js';
import { generateWorkoutRoutine, progressExercise, MUSCLE_TO_CATEGORY_MAP } from './logic.js';

// Application State
const state = {
  profile: null,
  workout: [],
  fuel: null,
  weightHistory: [],
  workoutHistory: [],
  eatingHistory: [],
  selectedMuscles: {}, // Onboarding selector memory
  bodyChartInstance: null,
  activeAnalyticsTab: 'weight'
};

// DOM Cache
const DOM = {
  // Screens
  onboardingScreen: document.getElementById('onboarding-screen'),
  dashboardScreen: document.getElementById('dashboard-screen'),
  
  // Onboarding Form
  onboardingForm: document.getElementById('onboarding-form'),
  heightFt: document.getElementById('setup-height-ft'),
  heightIn: document.getElementById('setup-height-in'),
  weight: document.getElementById('setup-weight'),
  maxPullups: document.getElementById('setup-max-pullups'),
  maxPushups: document.getElementById('setup-max-pushups'),
  maxSquats: document.getElementById('setup-max-squats'),
  btnViewFront: document.getElementById('btn-view-front'),
  btnViewBack: document.getElementById('btn-view-back'),
  anatomyMapContainer: document.getElementById('anatomy-map-container'),
  selectedMuscleTags: document.getElementById('selected-muscle-tags'),
  
  // Dashboard Header
  dashboardStats: document.getElementById('dashboard-stats-summary'),
  btnEditProfile: document.getElementById('btn-edit-profile'),
  
  // Workout Panel (Training)
  workoutList: document.getElementById('workout-list-container'),
  workoutProgressRing: document.getElementById('workout-completion-percentage'),
  btnCompleteWorkout: document.getElementById('btn-complete-workout'),
  
  // Nutrition Panel (Eating)
  fuelProgressFill: document.getElementById('dial-progress-fill'),
  fuelCaloriesCount: document.getElementById('fuel-calories-count'),
  fuelItemsContainer: document.getElementById('fuel-items-container'),
  customFuelName: document.getElementById('custom-fuel-name'),
  customFuelCalories: document.getElementById('custom-fuel-calories'),
  btnAddCustomFuel: document.getElementById('btn-add-custom-fuel'),
  
  // Analytics
  analyticsInfoGrid: document.getElementById('analytics-info-grid'),
  analyticsActionsContainer: document.getElementById('analytics-actions-container'),
  chartCanvases: {
    weight: document.getElementById('weight-chart-container'),
    workout: document.getElementById('workout-chart-container'),
    nutrition: document.getElementById('nutrition-chart-container')
  }
};

// Default Nutrition Items
const DEFAULT_FUEL_ITEMS = [
  { id: 'fuel_fairlife', name: 'Fairlife Core Power Shake', calories: 400, completed: false },
  { id: 'fuel_butter_oil', name: 'Liquid Gold (Added Olive Oil/Butter)', calories: 250, completed: false },
  { id: 'fuel_pb_toast', name: 'Late-Night Peanut Butter Toast', calories: 450, completed: false },
  { id: 'fuel_mass_shake', name: 'Mammoth Homemade Mass Shake', calories: 800, completed: false },
  { id: 'fuel_double_meat', name: 'Double Protein Lunch', calories: 300, completed: false },
  { id: 'fuel_milk_glass', name: '3 Glasses of Whole Milk', calories: 450, completed: false },
  { id: 'fuel_nuts_snack', name: 'Trail Mix / Mixed Nuts', calories: 300, completed: false }
];

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  
  if (state.profile) {
    showDashboard();
  } else {
    showOnboarding();
  }
  
  registerGlobalEvents();
});

// Load state from local storage
function loadSavedData() {
  // Automatically detect and purge old fake stock seed data
  const wHist = StorageService.getWeightHistory();
  if (wHist.length > 0 && wHist.some(log => log.date.includes('May'))) {
    StorageService.clearHistory();
  }

  state.profile = StorageService.getProfile();
  state.workout = StorageService.getWorkoutState() || [];
  state.fuel = StorageService.getDailyFuel();
  state.weightHistory = StorageService.getWeightHistory();
  state.workoutHistory = StorageService.getWorkoutHistory();
  state.eatingHistory = StorageService.getEatingHistory();
}

// --------------------------------------------------------------------------
// SCREEN ROUTER & DISPLAY MANAGER
// --------------------------------------------------------------------------

function showOnboarding() {
  DOM.onboardingScreen.classList.add('active');
  DOM.dashboardScreen.classList.remove('active');
  
  state.selectedMuscles = {};
  renderSelectedMuscleTags();
  
  if (state.profile) {
    DOM.heightFt.value = state.profile.heightFt;
    DOM.heightIn.value = state.profile.heightIn;
    DOM.weight.value = state.profile.weight;
    DOM.maxPullups.value = state.profile.maxPullups;
    DOM.maxPushups.value = state.profile.maxPushups;
    DOM.maxSquats.value = state.profile.maxSquats;
    state.selectedMuscles = { ...state.profile.selectedMuscles };
    renderSelectedMuscleTags();
  }

  initOnboardingBodyChart();
}

function showDashboard() {
  DOM.onboardingScreen.classList.remove('active');
  DOM.dashboardScreen.classList.add('active');
  
  if (state.bodyChartInstance) {
    state.bodyChartInstance.destroy();
    state.bodyChartInstance = null;
  }
  
  // Calibrate workout setsChecked states defensively
  state.workout.forEach(ex => {
    ex.setsChecked = ex.setsChecked || [false, false, false];
  });
  
  renderDashboardHeader();
  renderWorkoutRoutine();
  renderFuelChecklist();
  renderAnalyticsHub();
}

// --------------------------------------------------------------------------
// SCREEN 1: ONBOARDING ENGINE
// --------------------------------------------------------------------------

function initOnboardingBodyChart() {
  DOM.anatomyMapContainer.innerHTML = '';
  
  const bodyState = {};
  Object.keys(state.selectedMuscles).forEach(muscleId => {
    if (state.selectedMuscles[muscleId]) {
      bodyState[muscleId] = { intensity: 8, selected: true };
    }
  });

  state.bodyChartInstance = new BodyChart(DOM.anatomyMapContainer, {
    view: ViewSide.FRONT,
    bodyState,
    onMuscleClick(id, name) {
      state.selectedMuscles[id] = !state.selectedMuscles[id];
      
      const updatedBodyState = {};
      Object.keys(state.selectedMuscles).forEach(mId => {
        if (state.selectedMuscles[mId]) {
          updatedBodyState[mId] = { intensity: 8, selected: true };
        }
      });
      state.bodyChartInstance.update({ bodyState: updatedBodyState });
      renderSelectedMuscleTags();
    }
  });
}

function renderSelectedMuscleTags() {
  const categories = new Set();
  Object.keys(state.selectedMuscles).forEach(muscleId => {
    if (state.selectedMuscles[muscleId] && MUSCLE_TO_CATEGORY_MAP[muscleId]) {
      categories.add(MUSCLE_TO_CATEGORY_MAP[muscleId]);
    }
  });
  
  DOM.selectedMuscleTags.innerHTML = '';
  
  if (categories.size === 0) {
    const span = document.createElement('span');
    span.className = 'placeholder-tag';
    span.textContent = 'Click muscles above (or defaults to full body)';
    DOM.selectedMuscleTags.appendChild(span);
  } else {
    categories.forEach(category => {
      const tag = document.createElement('span');
      tag.className = 'muscle-tag';
      tag.textContent = category;
      DOM.selectedMuscleTags.appendChild(tag);
    });
  }
}

// --------------------------------------------------------------------------
// SCREEN 2 PANEL A: TRAINING LOG (SET-BY-SET)
// --------------------------------------------------------------------------

function renderWorkoutRoutine() {
  DOM.workoutList.innerHTML = '';
  
  if (state.workout.length === 0) {
    DOM.workoutList.innerHTML = `<p class="placeholder-tag" style="text-align: center; padding: 2rem;">No exercises generated. Click Edit Setup to add targets.</p>`;
    DOM.workoutProgressRing.textContent = '0%';
    DOM.btnCompleteWorkout.disabled = true;
    return;
  }
  
  let completedCount = 0;
  
  state.workout.forEach((ex, exIndex) => {
    ex.setsChecked = ex.setsChecked || [false, false, false];
    
    const isCompleted = ex.setsChecked.every(s => s === true);
    ex.completedToday = isCompleted;
    if (isCompleted) completedCount++;
    
    const row = document.createElement('div');
    row.className = `ex-triptych-row ${isCompleted ? 'completed' : ''}`;
    
    row.innerHTML = `
      <div class="ex-row-header-strip">
        <span class="ex-row-title-text" title="${ex.name}">${ex.name}</span>
        <span class="ex-row-presc-text">${ex.sets}s x ${ex.reps} ${ex.unit}</span>
      </div>
      <div class="ex-row-sets-picker-strip">
        <button type="button" class="set-circle-btn ${ex.setsChecked[0] ? 'checked' : ''}" data-ex="${exIndex}" data-set="0">1</button>
        <button type="button" class="set-circle-btn ${ex.setsChecked[1] ? 'checked' : ''}" data-ex="${exIndex}" data-set="1">2</button>
        <button type="button" class="set-circle-btn ${ex.setsChecked[2] ? 'checked' : ''}" data-ex="${exIndex}" data-set="2">3</button>
      </div>
    `;
    
    DOM.workoutList.appendChild(row);
  });
  
  // Progress Ring
  const pct = Math.round((completedCount / state.workout.length) * 100);
  DOM.workoutProgressRing.textContent = `${pct}%`;
  
  if (pct === 100) {
    DOM.workoutProgressRing.style.color = "var(--accent-emerald)";
  } else {
    DOM.workoutProgressRing.style.color = "var(--text-muted)";
  }
  
  // Enable logging at any time when exercises exist
  DOM.btnCompleteWorkout.disabled = state.workout.length === 0;
  
  // Bind set circles clicks
  document.querySelectorAll('.set-circle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIdx = parseInt(btn.getAttribute('data-ex'));
      const setIdx = parseInt(btn.getAttribute('data-set'));
      
      state.workout[exIdx].setsChecked[setIdx] = !state.workout[exIdx].setsChecked[setIdx];
      state.workout[exIdx].completedToday = state.workout[exIdx].setsChecked.every(s => s === true);
      
      StorageService.saveWorkoutState(state.workout);
      renderWorkoutRoutine();
    });
  });
}

// --------------------------------------------------------------------------
// SCREEN 2 PANEL B: NUTRITION LOG (CIRCULAR surplus DIAL)
// --------------------------------------------------------------------------

function renderFuelChecklist() {
  if (!state.fuel) {
    state.fuel = {
      lastUpdatedDate: new Date().toDateString(),
      items: [...DEFAULT_FUEL_ITEMS]
    };
    StorageService.saveDailyFuel(state.fuel);
  }

  DOM.fuelItemsContainer.innerHTML = '';
  
  let currentCalories = 0;
  
  state.fuel.items.forEach((item, index) => {
    if (item.completed) {
      currentCalories += item.calories;
    }
    
    const div = document.createElement('label');
    div.className = `checkbox-item ${item.completed ? 'checked' : ''}`;
    
    div.innerHTML = `
      <input type="checkbox" data-index="${index}" ${item.completed ? 'checked' : ''} />
      <div class="check-indicator"></div>
      <div class="fuel-text">
        <span class="fuel-title">${item.name}</span>
      </div>
      <span class="fuel-cal">+${item.calories}</span>
    `;
    
    DOM.fuelItemsContainer.appendChild(div);
  });
  
  const surplusTarget = 2500;
  const fillPct = Math.min(100, Math.round((currentCalories / surplusTarget) * 100));
  
  const circumference = 251.2;
  const offset = circumference - (fillPct / 100) * circumference;
  
  DOM.fuelCaloriesCount.textContent = currentCalories;
  
  if (DOM.fuelProgressFill) {
    DOM.fuelProgressFill.style.strokeDashoffset = offset;
    
    if (fillPct >= 100) {
      DOM.fuelProgressFill.style.stroke = "var(--accent-emerald)";
      DOM.fuelCaloriesCount.style.color = "var(--accent-emerald)";
    } else {
      DOM.fuelProgressFill.style.stroke = "var(--accent-cobalt)";
      DOM.fuelCaloriesCount.style.color = "var(--text-main)";
    }
  }
  
  // Bind Checklist changes
  DOM.fuelItemsContainer.querySelectorAll('input[type="checkbox"]').forEach(box => {
    box.addEventListener('change', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'));
      state.fuel.items[idx].completed = e.currentTarget.checked;
      StorageService.saveDailyFuel(state.fuel);
      renderFuelChecklist();
      
      if (state.activeAnalyticsTab === 'nutrition') {
        renderAnalyticsHub();
      }
    });
  });
}

// --------------------------------------------------------------------------
// SCREEN 2 PANEL C: PERFORMANCE ANALYTICS ENGINE (TABBED METRICS)
// --------------------------------------------------------------------------

function renderDashboardHeader() {
  const p = state.profile;
  if (!p) return;
  
  const heightInches = (parseInt(p.heightFt) * 12) + parseInt(p.heightIn);
  const weightLbs = parseFloat(p.weight);
  const bmi = heightInches > 0 ? ((weightLbs * 703) / (heightInches * heightInches)).toFixed(1) : 0;
  
  let statusText = "";
  let statusColor = "var(--text-muted)";
  
  if (bmi < 18.5) {
    statusText = "Caloric Deficit Phase";
    statusColor = "var(--accent-pink)";
  } else if (bmi >= 18.5 && bmi < 25) {
    statusText = "Lean Bulk Phase";
    statusColor = "var(--accent-emerald)";
  } else {
    statusText = "Recomposition Phase";
    statusColor = "var(--accent-cobalt)";
  }
  
  DOM.dashboardStats.innerHTML = `
    <span>Height: ${p.heightFt}'${p.heightIn}"</span> • 
    <span style="color: #fff; font-weight: 500;">Weight: ${weightLbs} lbs</span> • 
    <span>BMI: ${bmi}</span> • 
    <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
  `;
}

function renderAnalyticsHub() {
  // Toggle tab buttons active status
  document.querySelectorAll('.analytics-tabs-strip .tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === state.activeAnalyticsTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Toggle canvas active classes defensively (Ensuring no null errors)
  Object.keys(DOM.chartCanvases).forEach(tab => {
    const el = DOM.chartCanvases[tab];
    if (el) {
      if (tab === state.activeAnalyticsTab) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });

  // Plot and populate active metrics
  if (state.activeAnalyticsTab === 'weight') {
    plotWeightTrendGraph();
    renderWeightDetails();
  } else if (state.activeAnalyticsTab === 'workout') {
    plotWorkoutProgressionGraph();
    renderWorkoutDetails();
  } else if (state.activeAnalyticsTab === 'nutrition') {
    plotCaloricIntakeGraph();
    renderNutritionDetails();
  }
}

// ──────── GRAPH PLOTTER 1: WEIGHT TREND ────────
function plotWeightTrendGraph() {
  const container = DOM.chartCanvases.weight;
  if (!container) return;
  
  container.innerHTML = '';
  const history = state.weightHistory;
  const isGhost = history.length === 0;
  
  const width = 340;
  const height = 180;
  const padding = 15;
  
  let dataPoints = [];
  if (isGhost) {
    const startW = state.profile?.weight ? parseFloat(state.profile.weight) : 130;
    dataPoints = [
      { date: 'Day 1', weight: startW },
      { date: 'Day 2', weight: startW + 0.6 },
      { date: 'Day 3', weight: startW + 1.2 },
      { date: 'Day 4', weight: startW + 2.0 },
      { date: 'Day 5', weight: startW + 2.8 }
    ];
  } else {
    dataPoints = history;
  }
  
  const weights = dataPoints.map(h => h.weight);
  let minWeight = Math.min(...weights) - 1.5;
  let maxWeight = Math.max(...weights) + 1.5;
  
  if (minWeight === maxWeight) {
    minWeight -= 3;
    maxWeight += 3;
  }
  
  const pointCount = dataPoints.length;
  const coords = [];
  for (let i = 0; i < pointCount; i++) {
    const x = padding + (i * (width - 2 * padding) / Math.max(1, pointCount - 1));
    const y = height - padding - ((dataPoints[i].weight - minWeight) * (height - 2 * padding) / (maxWeight - minWeight));
    coords.push({ x, y, val: dataPoints[i].weight, date: dataPoints[i].date });
  }
  
  let svgContent = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.04)" />
  `;
  
  const opacity = isGhost ? "0.22" : "1.0";
  const strokeDash = isGhost ? "stroke-dasharray=\"4,3\"" : "";
  
  if (coords.length > 1) {
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x} ${coords[i].y}`;
    }
    svgContent += `<path d="${pathD}" fill="none" stroke="var(--accent-pink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" ${strokeDash} />`;
  }
  
  coords.forEach((c) => {
    svgContent += `
      <circle cx="${c.x}" cy="${c.y}" r="2.5" fill="var(--bg-dark)" stroke="var(--accent-pink)" stroke-width="1.5" opacity="${opacity}" />
      <text x="${c.x}" y="${c.y - 6}" fill="#fff" font-size="8" font-weight="600" text-anchor="middle" opacity="${opacity}">${c.val.toFixed(1)}</text>
      <text x="${c.x}" y="${height - padding + 11}" fill="rgba(255,255,255,0.2)" font-size="7.5" text-anchor="middle">${c.date}</text>
    `;
  });
  
  if (isGhost) {
    svgContent += `
      <rect x="90" y="70" width="160" height="24" rx="4" fill="rgba(17,18,23,0.9)" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
      <text x="170" y="84" fill="rgba(255,255,255,0.5)" font-size="7.5" font-weight="600" text-anchor="middle" letter-spacing="0.5">PROJECTION PROJECT TEMPLATE</text>
    `;
  }
  
  svgContent += `</svg>`;
  container.innerHTML = svgContent;
}

// ──────── GRAPH PLOTTER 2: WORKOUT PROGRESSION ────────
function plotWorkoutProgressionGraph() {
  const container = DOM.chartCanvases.workout;
  if (!container) return;
  
  container.innerHTML = '';
  const history = state.workoutHistory;
  const isGhost = history.length === 0;
  
  const width = 340;
  const height = 180;
  const padding = 15;
  
  let dataPoints = [];
  if (isGhost) {
    dataPoints = [
      { date: 'Session 1', reps: 15 },
      { date: 'Session 2', reps: 18 },
      { date: 'Session 3', reps: 20 },
      { date: 'Session 4', reps: 24 },
      { date: 'Session 5', reps: 22 }
    ];
  } else {
    dataPoints = history;
  }
  
  const repsVals = dataPoints.map(h => h.reps);
  const maxReps = Math.max(10, Math.max(...repsVals) + 5);
  
  const barWidth = 18;
  const gap = (width - 2 * padding - dataPoints.length * barWidth) / Math.max(1, dataPoints.length - 1);
  
  let svgContent = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.04)" />
  `;
  
  const opacity = isGhost ? "0.22" : "1.0";
  const strokeDash = isGhost ? "stroke-dasharray=\"2,2\"" : "";
  
  dataPoints.forEach((h, i) => {
    const x = padding + i * (barWidth + gap);
    const barHeight = (h.reps * (height - 2 * padding) / maxReps);
    const y = height - padding - barHeight;
    
    svgContent += `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="var(--accent-cobalt-light)" stroke="var(--accent-cobalt)" stroke-width="1" rx="2" opacity="${opacity}" ${strokeDash} />
      <text x="${x + barWidth / 2}" y="${y - 4}" fill="#fff" font-size="8" font-weight="600" text-anchor="middle" opacity="${opacity}">${h.reps}</text>
      <text x="${x + barWidth / 2}" y="${height - padding + 11}" fill="rgba(255,255,255,0.2)" font-size="7.5" text-anchor="middle">${h.date}</text>
    `;
  });
  
  if (isGhost) {
    svgContent += `
      <rect x="90" y="70" width="160" height="24" rx="4" fill="rgba(17,18,23,0.9)" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
      <text x="170" y="84" fill="rgba(255,255,255,0.5)" font-size="7.5" font-weight="600" text-anchor="middle" letter-spacing="0.5">PROJECTION PROJECT TEMPLATE</text>
    `;
  }
  
  svgContent += `</svg>`;
  container.innerHTML = svgContent;
}

// ──────── GRAPH PLOTTER 3: EATING CALORIC SURPLUS ────────
function plotCaloricIntakeGraph() {
  const container = DOM.chartCanvases.nutrition;
  if (!container) return;
  
  container.innerHTML = '';
  const history = state.eatingHistory;
  const isGhost = history.length === 0;
  
  const width = 340;
  const height = 180;
  const padding = 15;
  
  let dataPoints = [];
  if (isGhost) {
    dataPoints = [
      { date: 'Day 1', calories: 1800 },
      { date: 'Day 2', calories: 2100 },
      { date: 'Day 3', calories: 2550 },
      { date: 'Day 4', calories: 2300 },
      { date: 'Day 5', calories: 2600 }
    ];
  } else {
    dataPoints = history;
  }
  
  const target = 2500;
  const maxCals = Math.max(target, Math.max(...dataPoints.map(h => h.calories)) + 300);
  
  const barWidth = 18;
  const gap = (width - 2 * padding - dataPoints.length * barWidth) / Math.max(1, dataPoints.length - 1);
  
  let svgContent = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${padding}" y1="${height - padding - (target * (height - 2 * padding) / maxCals)}" x2="${width - padding}" y2="${height - padding - (target * (height - 2 * padding) / maxCals)}" stroke="rgba(16,185,129,0.25)" stroke-dasharray="2,2" />
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.04)" />
  `;
  
  const opacity = isGhost ? "0.22" : "1.0";
  const strokeDash = isGhost ? "stroke-dasharray=\"2,2\"" : "";
  
  dataPoints.forEach((h, i) => {
    const x = padding + i * (barWidth + gap);
    const barHeight = (h.calories * (height - 2 * padding) / maxCals);
    const y = height - padding - barHeight;
    
    const isSuccess = h.calories >= target;
    const strokeCol = isSuccess ? "var(--accent-emerald)" : "var(--accent-pink)";
    const fillCol = isSuccess ? "var(--accent-emerald-light)" : "rgba(244,63,94,0.15)";
    
    svgContent += `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${fillCol}" stroke="${strokeCol}" stroke-width="1" rx="2" opacity="${opacity}" ${strokeDash} />
      <text x="${x + barWidth / 2}" y="${y - 4}" fill="#fff" font-size="8" font-weight="600" text-anchor="middle" opacity="${opacity}">${h.calories}</text>
      <text x="${x + barWidth / 2}" y="${height - padding + 11}" fill="rgba(255,255,255,0.2)" font-size="7.5" text-anchor="middle">${h.date}</text>
    `;
  });
  
  if (isGhost) {
    svgContent += `
      <rect x="90" y="70" width="160" height="24" rx="4" fill="rgba(17,18,23,0.9)" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
      <text x="170" y="84" fill="rgba(255,255,255,0.5)" font-size="7.5" font-weight="600" text-anchor="middle" letter-spacing="0.5">PROJECTION PROJECT TEMPLATE</text>
    `;
  }
  
  svgContent += `</svg>`;
  container.innerHTML = svgContent;
}

// --------------------------------------------------------------------------
// PANEL 3 METRICS & INTERACTIONS
// --------------------------------------------------------------------------

function renderWeightDetails() {
  const history = state.weightHistory;
  const startWeight = history.length > 0 ? history[0].weight : (state.profile?.weight || 0);
  const currentWeight = history.length > 0 ? history[history.length - 1].weight : (state.profile?.weight || 0);
  const totalGain = (currentWeight - startWeight);
  const rateGain = history.length > 1 ? (totalGain / Math.max(1, history.length - 1)).toFixed(1) : "0.0";
  
  DOM.analyticsInfoGrid.innerHTML = `
    <div class="metric-cell">
      <span class="metric-cell-label">Start Weight</span>
      <span class="metric-cell-value">${startWeight.toFixed(1)} lbs</span>
    </div>
    <div class="metric-cell">
      <span class="metric-cell-label">Current Weight</span>
      <span class="metric-cell-value">${currentWeight.toFixed(1)} lbs</span>
    </div>
    <div class="metric-cell">
      <span class="metric-cell-label">Total Gain</span>
      <span class="metric-cell-value">${totalGain >= 0 ? '+' : ''}${totalGain.toFixed(1)} lbs</span>
    </div>
    <div class="metric-cell">
      <span class="metric-cell-label">Weekly Rate</span>
      <span class="metric-cell-value">${totalGain >= 0 ? '+' : ''}${rateGain} lbs/wk</span>
    </div>
  `;
  
  DOM.analyticsActionsContainer.innerHTML = `
    <div class="input-group-row">
      <input type="number" step="0.1" id="new-weight-input" placeholder="Today's weight (lbs)" class="neon-input small" />
      <button type="button" id="btn-log-weight" class="action-btn">Log Weight</button>
    </div>
  `;
  
  document.getElementById('btn-log-weight').addEventListener('click', () => {
    const input = document.getElementById('new-weight-input');
    const val = parseFloat(input.value);
    
    if (isNaN(val) || val <= 50 || val > 500) {
      alert("Please enter a realistic weight in lbs.");
      return;
    }
    
    StorageService.addWeightLog(val);
    state.profile.weight = val;
    StorageService.saveProfile(state.profile);
    
    loadSavedData();
    renderDashboardHeader();
    renderAnalyticsHub();
  });
}

function renderWorkoutDetails() {
  const history = state.workoutHistory;
  const totalSetsCompleted = history.length;
  const baseReps = history.length > 0 ? history[0].reps : 0;
  const currentReps = history.length > 0 ? history[history.length - 1].reps : 0;
  const progressDiff = Math.max(0, currentReps - baseReps);
  
  DOM.analyticsInfoGrid.innerHTML = `
    <div class="metric-cell">
      <span class="metric-cell-label">Reps Added</span>
      <span class="metric-cell-value">+${progressDiff} reps</span>
    </div>
    <div class="metric-cell">
      <span class="metric-cell-label">Sessions Met</span>
      <span class="metric-cell-value">${totalSetsCompleted} days</span>
    </div>
    <div class="metric-cell">
      <span class="metric-cell-label">Consistency</span>
      <span class="metric-cell-value">${totalSetsCompleted > 0 ? '100%' : '0%'}</span>
    </div>
    <div class="metric-cell">
      <span class="metric-cell-label">Engine Stage</span>
      <span class="metric-cell-value">Level ${Math.min(5, Math.floor(progressDiff / 3) + 1)}</span>
    </div>
  `;
  
  DOM.analyticsActionsContainer.innerHTML = `
    <span style="font-size: 0.75rem; color: var(--text-muted);">
      Training reps progress automatically. Complete today's sets in Panel 2 to save progression logs.
    </span>
  `;
}

function renderNutritionDetails() {
  const history = state.eatingHistory;
  const totalDaysLog = history.length;
  
  let totalCals = 0;
  let successCount = 0;
  history.forEach(h => {
    totalCals += h.calories;
    if (h.calories >= 2500) successCount++;
  });
  
  const avgCals = totalDaysLog > 0 ? Math.round(totalCals / totalDaysLog) : 0;
  const pctSuccess = totalDaysLog > 0 ? Math.round((successCount / totalDaysLog) * 100) : 0;
  
  DOM.analyticsInfoGrid.innerHTML = `
    <div class="metric-cell">
      <span class="metric-cell-label">Surplus Avg</span>
      <span class="metric-cell-value">${avgCals} kcal</span>
    </div>
    <div class="metric-cell">
      <span class="metric-cell-label">Surplus Target</span>
      <span class="metric-cell-value">2,500 kcal</span>
    </div>
    <div class="metric-cell">
      <span class="metric-cell-label">Achievement</span>
      <span class="metric-cell-value">${pctSuccess}% on-track</span>
    </div>
    <div class="metric-cell">
      <span class="metric-cell-label">Goal Met Days</span>
      <span class="metric-cell-value">${successCount} / ${totalDaysLog} days</span>
    </div>
  `;
  
  DOM.analyticsActionsContainer.innerHTML = `
    <span style="font-size: 0.75rem; color: var(--text-muted);">
      Nutrition surplus is live. Toggle caloric checkboxes in Panel 1 to plot today's log.
    </span>
  `;
}

// --------------------------------------------------------------------------
// GLOBAL EVENT BINDINGS
// --------------------------------------------------------------------------

function registerGlobalEvents() {
  
  // 1. Anatomy Switchers
  DOM.btnViewFront.addEventListener('click', () => {
    DOM.btnViewBack.classList.remove('active');
    DOM.btnViewFront.classList.add('active');
    state.bodyChartInstance?.update({ view: ViewSide.FRONT });
  });

  DOM.btnViewBack.addEventListener('click', () => {
    DOM.btnViewFront.classList.remove('active');
    DOM.btnViewBack.classList.add('active');
    state.bodyChartInstance?.update({ view: ViewSide.BACK });
  });
  
  // 2. Onboarding submit
  DOM.onboardingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const profileData = {
      heightFt: parseInt(DOM.heightFt.value),
      heightIn: parseInt(DOM.heightIn.value),
      weight: parseFloat(DOM.weight.value),
      maxPullups: parseInt(DOM.maxPullups.value),
      maxPushups: parseInt(DOM.maxPushups.value),
      maxSquats: parseInt(DOM.maxSquats.value),
      selectedMuscles: { ...state.selectedMuscles }
    };
    
    StorageService.saveProfile(profileData);
    
    const routine = generateWorkoutRoutine(profileData);
    routine.forEach(ex => {
      ex.setsChecked = [false, false, false];
    });
    StorageService.saveWorkoutState(routine);
    
    loadSavedData();
    showDashboard();
  });
  
  // 3. Edit setup
  DOM.btnEditProfile.addEventListener('click', () => {
    showOnboarding();
  });
  
  // 4. Log Completed workout routine
  DOM.btnCompleteWorkout.addEventListener('click', () => {
    if (state.workout.length === 0) return;
    
    let sumReps = 0;
    state.workout.forEach(ex => {
      if (ex.unit === 'seconds') {
        sumReps += Math.round(ex.reps / 5);
      } else {
        sumReps += parseInt(ex.reps) || 5;
      }
    });
    
    StorageService.addWorkoutHistoryLog(sumReps);
    
    const progressedWorkout = state.workout.map(ex => {
      const advanced = progressExercise(ex);
      advanced.setsChecked = [false, false, false]; // Reset checked circles
      return advanced;
    });
    StorageService.saveWorkoutState(progressedWorkout);
    
    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.top = '10%';
    banner.style.left = '50%';
    banner.style.transform = 'translate(-50%, -50%)';
    banner.style.background = 'var(--bg-card)';
    banner.style.color = 'var(--text-main)';
    banner.style.border = '1px solid var(--accent-emerald)';
    banner.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
    banner.style.padding = '1rem 2rem';
    banner.style.borderRadius = 'var(--border-radius)';
    banner.style.fontFamily = 'var(--font-display)';
    banner.style.fontWeight = '700';
    banner.style.fontSize = '1rem';
    banner.style.zIndex = '9999';
    banner.style.textAlign = 'center';
    banner.innerHTML = 'Workout Logged Successfully<br><span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">Progression advanced. Sets incremented by +1 rep.</span>';
    
    document.body.appendChild(banner);
    
    setTimeout(() => {
      banner.style.opacity = '0';
      banner.style.transition = 'opacity 0.4s ease';
      setTimeout(() => banner.remove(), 400);
    }, 2800);
    
    if (state.fuel) {
      state.fuel.items = state.fuel.items.map(item => ({ ...item, completed: false }));
      StorageService.saveDailyFuel(state.fuel);
    }
    
    loadSavedData();
    showDashboard();
  });
  
  // 5. Add custom fuel calorie snacks
  DOM.btnAddCustomFuel.addEventListener('click', () => {
    const name = DOM.customFuelName.value.trim();
    const cals = parseInt(DOM.customFuelCalories.value);
    
    if (!name || isNaN(cals) || cals <= 0) {
      alert("Please enter a valid name and calorie value.");
      return;
    }
    
    const customItem = {
      id: `fuel_custom_${Date.now()}`,
      name: name,
      calories: cals,
      completed: true
    };
    
    state.fuel.items.push(customItem);
    StorageService.saveDailyFuel(state.fuel);
    
    DOM.customFuelName.value = '';
    DOM.customFuelCalories.value = '';
    
    renderFuelChecklist();
  });

  // 6. Tab button click binds
  document.querySelectorAll('.analytics-tabs-strip .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeAnalyticsTab = btn.getAttribute('data-tab');
      renderAnalyticsHub();
    });
  });
  
}
