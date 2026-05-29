/**
 * Trophia Mass - Workout Logic Engine
 * Maps clicked anatomy regions to compound exercises, defines customized progression rules,
 * and handles "max rep" based starting weights/reps (accommodating absolute beginners).
 */

// Mapping of body-muscles package groups to high-level categories
export const MUSCLE_TO_CATEGORY_MAP = {
  // Chest
  'chest-upper-left': 'Chest',
  'chest-upper-right': 'Chest',
  'chest-lower-left': 'Chest',
  'chest-lower-right': 'Chest',

  // Back
  'lats-upper-left': 'Back',
  'lats-mid-left': 'Back',
  'lats-lower-left': 'Back',
  'lats-upper-right': 'Back',
  'lats-mid-right': 'Back',
  'lats-lower-right': 'Back',
  'lower-back-erectors-left': 'Back',
  'lower-back-ql-left': 'Back',
  'lower-back-erectors-right': 'Back',
  'lower-back-ql-right': 'Back',
  'spine': 'Back',
  'traps-upper-left': 'Back',
  'traps-mid-left': 'Back',
  'traps-lower-left': 'Back',
  'traps-upper-right': 'Back',
  'traps-mid-right': 'Back',
  'traps-lower-right': 'Back',

  // Shoulders
  'shoulder-front-left': 'Shoulders',
  'shoulder-front-right': 'Shoulders',
  'shoulder-side-left': 'Shoulders',
  'shoulder-side-right': 'Shoulders',
  'deltoid-rear-left': 'Shoulders',
  'deltoid-rear-right': 'Shoulders',

  // Arms
  'biceps-left': 'Arms',
  'biceps-right': 'Arms',
  'triceps-long-left': 'Arms',
  'triceps-lateral-left': 'Arms',
  'triceps-long-right': 'Arms',
  'triceps-lateral-right': 'Arms',
  'forearm-left': 'Arms',
  'forearm-right': 'Arms',
  'forearm-flexors-left': 'Arms',
  'forearm-extensors-left': 'Arms',
  'forearm-flexors-right': 'Arms',
  'forearm-extensors-right': 'Arms',

  // Abdominals (Core)
  'abs-upper-left': 'Abdominals',
  'abs-upper-right': 'Abdominals',
  'abs-lower-left': 'Abdominals',
  'abs-lower-right': 'Abdominals',
  'obliques-left': 'Abdominals',
  'obliques-right': 'Abdominals',
  'serratus-anterior-left': 'Abdominals',
  'serratus-anterior-right': 'Abdominals',

  // Legs & Glutes
  'quads-left': 'Legs',
  'quads-right': 'Legs',
  'hamstrings-medial-left': 'Legs',
  'hamstrings-lateral-left': 'Legs',
  'hamstrings-medial-right': 'Legs',
  'hamstrings-lateral-right': 'Legs',
  'adductors-left': 'Legs',
  'adductors-right': 'Legs',
  'calves-gastroc-medial-left': 'Legs',
  'calves-gastroc-lateral-left': 'Legs',
  'calves-soleus-left': 'Legs',
  'calves-gastroc-medial-right': 'Legs',
  'calves-gastroc-lateral-right': 'Legs',
  'calves-soleus-right': 'Legs',
  'gluteus-medius-left': 'Legs',
  'gluteus-maximus-left': 'Legs',
  'gluteus-medius-right': 'Legs',
  'gluteus-maximus-right': 'Legs'
};

// Base details for all exercises
export const EXERCISE_DATABASE = {
  // Chest
  incline_pushups: {
    id: 'incline_pushups',
    name: 'Incline Push-ups',
    category: 'Chest',
    description: 'Place hands on a bed, desk, or chair. Keep body in a straight line. Lower chest to edge, then push up.',
    tip: 'Perfect for building a solid upper chest and easier to complete high reps than floor push-ups.',
    equipment: 'Desk / Bed / Chair',
    unit: 'reps'
  },
  standard_pushups: {
    id: 'standard_pushups',
    name: 'Standard Push-ups',
    category: 'Chest',
    description: 'Hands shoulder-width apart, squeeze glutes and abs, lower until chest almost touches the floor, push back up.',
    tip: 'Keep elbows tucked at a 45-degree angle. Do not flare them out.',
    equipment: 'Bodyweight',
    unit: 'reps'
  },
  db_floor_press: {
    id: 'db_floor_press',
    name: 'Floor Dumbbell Press',
    category: 'Chest',
    description: 'Lie on your back on the floor, knees bent. Hold dumbbells (or a heavy backpack) at chest height. Press straight up.',
    tip: 'Squeeze your chest muscles hard at the top of the press.',
    equipment: 'Dumbbells / Backpack',
    unit: 'reps'
  },

  // Back
  negative_pullups: {
    id: 'negative_pullups',
    name: 'Negative Pull-ups',
    category: 'Back',
    description: 'Jump or step up until your chin is over the bar. Lower yourself down as slowly as possible (target: 5 full seconds).',
    tip: 'The lowering (eccentric) phase is a massive trigger for back growth if you cannot do a pull-up yet!',
    equipment: 'Pull-up Bar / Door frame',
    unit: 'reps'
  },
  standard_pullups: {
    id: 'standard_pullups',
    name: 'Standard Pull-ups',
    category: 'Back',
    description: 'Hang from a bar with hands slightly wider than shoulders. Pull your collarbones to the bar, lead with your chest.',
    tip: 'Imagine driving your elbows down into your back pockets.',
    equipment: 'Pull-up Bar',
    unit: 'reps'
  },
  db_rows: {
    id: 'db_rows',
    name: 'Dumbbell Rows',
    category: 'Back',
    description: 'Place one knee and hand on a chair/bed. Hold a dumbbell in the other hand. Row the weight up towards your hip.',
    tip: 'Keep your back flat. Squeeze your lat at the top, do not just lift with your arm.',
    equipment: 'Dumbbell / Heavy Jug',
    unit: 'reps'
  },

  // Shoulders
  pike_pushups: {
    id: 'pike_pushups',
    name: 'Pike Push-ups',
    category: 'Shoulders',
    description: 'Get into a push-up position, then walk your feet forward so your hips are high in a "V" shape. Lower your head to the floor.',
    tip: 'Look at your feet, not hands. This targets the shoulders instead of the chest.',
    equipment: 'Bodyweight',
    unit: 'reps'
  },
  db_lateral_raises: {
    id: 'db_lateral_raises',
    name: 'Dumbbell Lateral Raises',
    category: 'Shoulders',
    description: 'Stand tall with a light weight in each hand. Keep arms mostly straight and raise them out to the sides until parallel to floor.',
    tip: 'Lead with your elbows and pinkies to build that wide shoulder "V-taper" frame.',
    equipment: 'Dumbbells / Water Jugs',
    unit: 'reps'
  },

  // Arms
  bicep_curls: {
    id: 'bicep_curls',
    name: 'Bicep Curls',
    category: 'Arms',
    description: 'Stand with weights at your sides, palms facing forward. Keep elbows locked at your ribs and curl the weights up.',
    tip: 'Do not swing your body. Squeeze the biceps at the top for 1 second.',
    equipment: 'Dumbbells / Backpack',
    unit: 'reps'
  },
  tricep_dips: {
    id: 'tricep_dips',
    name: 'Tricep Chair Dips',
    category: 'Arms',
    description: 'Sit on the edge of a chair or bed. Place hands next to hips, slide off, and bend elbows to lower hips. Press up.',
    tip: 'Keep your back close to the chair. Squeeze your triceps at the peak.',
    equipment: 'Chair / Bed',
    unit: 'reps'
  },

  // Legs & Glutes
  goblet_squats: {
    id: 'goblet_squats',
    name: 'Goblet Squats',
    category: 'Legs',
    description: 'Hold a heavy dumbbell or backpack close to your chest. Stand with feet shoulder-width, squat down deep, and stand back up.',
    tip: 'Keep your chest proud and drive your knees outward as you squat down.',
    equipment: 'Dumbbell / Heavy Backpack',
    unit: 'reps'
  },
  bulgarian_split_squats: {
    id: 'bulgarian_split_squats',
    name: 'Bulgarian Split Squats',
    category: 'Legs',
    description: 'Place one foot behind you on a bed or chair. Stand on the other leg. Squat down until back knee almost touches the floor.',
    tip: 'An absolute mass-maker for skinny legs. Lean slightly forward to hit glutes more, or stay upright for quads.',
    equipment: 'Chair / Bed / Dumbbells',
    unit: 'reps (per leg)'
  },

  // Abdominals (Core)
  plank: {
    id: 'plank',
    name: 'Forearm Plank',
    category: 'Abdominals',
    description: 'Hold a push-up style position resting on your forearms. Keep body perfectly straight, squeeze abs and glutes.',
    tip: 'Do not let your hips sag. Keep your neck relaxed.',
    equipment: 'Bodyweight',
    unit: 'seconds'
  },
  lying_leg_raises: {
    id: 'lying_leg_raises',
    name: 'Lying Leg Raises',
    category: 'Abdominals',
    description: 'Lie flat on your back, hands under glutes. Keep legs straight and lift them up to 90 degrees, then lower slowly.',
    tip: 'Keep your lower back pressed firmly into the floor. Do not let it arch.',
    equipment: 'Bodyweight',
    unit: 'reps'
  }
};

/**
 * Generate starting workouts list based on user inputs
 * @param {Object} profile - { heightFt, heightIn, weight, maxPushups, maxPullups, maxSquats, selectedMuscles: { id: true } }
 * @returns {Array} List of workout exercises with sets/reps
 */
export function generateWorkoutRoutine(profile) {
  const selectedMuscles = profile.selectedMuscles || {};
  const maxPushups = parseInt(profile.maxPushups) || 0;
  const maxPullups = parseInt(profile.maxPullups) || 0;
  const maxSquats = parseInt(profile.maxSquats) || 0;

  // Determine active high-level categories based on clicked muscles
  const activeCategories = new Set();
  Object.keys(selectedMuscles).forEach(muscleId => {
    if (selectedMuscles[muscleId] && MUSCLE_TO_CATEGORY_MAP[muscleId]) {
      activeCategories.add(MUSCLE_TO_CATEGORY_MAP[muscleId]);
    }
  });

  // If no muscles selected, default to all of them for a full-body routine
  if (activeCategories.size === 0) {
    activeCategories.add('Chest');
    activeCategories.add('Back');
    activeCategories.add('Shoulders');
    activeCategories.add('Arms');
    activeCategories.add('Legs');
    activeCategories.add('Abdominals');
  }

  const routine = [];

  // 1. CHEST
  if (activeCategories.has('Chest')) {
    if (maxPushups < 5) {
      routine.push({
        ...EXERCISE_DATABASE.incline_pushups,
        sets: 3,
        reps: 5,
        completedToday: false
      });
    } else {
      const startingReps = Math.max(5, Math.round(maxPushups * 0.5));
      routine.push({
        ...EXERCISE_DATABASE.standard_pushups,
        sets: 3,
        reps: startingReps,
        completedToday: false
      });
    }
    routine.push({
      ...EXERCISE_DATABASE.db_floor_press,
      sets: 3,
      reps: 8,
      completedToday: false
    });
  }

  // 2. BACK
  if (activeCategories.has('Back')) {
    if (maxPullups < 2) {
      routine.push({
        ...EXERCISE_DATABASE.negative_pullups,
        sets: 3,
        reps: 4, // 4 negatives is standard for beginners
        completedToday: false
      });
    } else {
      const startingReps = Math.max(3, Math.round(maxPullups * 0.5));
      routine.push({
        ...EXERCISE_DATABASE.standard_pullups,
        sets: 3,
        reps: startingReps,
        completedToday: false
      });
    }
    routine.push({
      ...EXERCISE_DATABASE.db_rows,
      sets: 3,
      reps: 8,
      completedToday: false
    });
  }

  // 3. SHOULDERS
  if (activeCategories.has('Shoulders')) {
    const pikeReps = maxPushups < 8 ? 5 : 8;
    routine.push({
      ...EXERCISE_DATABASE.pike_pushups,
      sets: 3,
      reps: pikeReps,
      completedToday: false
    });
    routine.push({
      ...EXERCISE_DATABASE.db_lateral_raises,
      sets: 3,
      reps: 10,
      completedToday: false
    });
  }

  // 4. ARMS
  if (activeCategories.has('Arms')) {
    routine.push({
      ...EXERCISE_DATABASE.bicep_curls,
      sets: 3,
      reps: 8,
      completedToday: false
    });
    const dipReps = maxPushups < 8 ? 5 : 8;
    routine.push({
      ...EXERCISE_DATABASE.tricep_dips,
      sets: 3,
      reps: dipReps,
      completedToday: false
    });
  }

  // 5. LEGS
  if (activeCategories.has('Legs')) {
    const squatReps = Math.max(8, Math.round(maxSquats * 0.5) || 8);
    routine.push({
      ...EXERCISE_DATABASE.goblet_squats,
      sets: 3,
      reps: squatReps,
      completedToday: false
    });
    routine.push({
      ...EXERCISE_DATABASE.bulgarian_split_squats,
      sets: 3,
      reps: 6,
      completedToday: false
    });
  }

  // 6. ABDOMINALS (Core)
  if (activeCategories.has('Abdominals')) {
    routine.push({
      ...EXERCISE_DATABASE.plank,
      sets: 3,
      reps: 30, // seconds
      completedToday: false
    });
    routine.push({
      ...EXERCISE_DATABASE.lying_leg_raises,
      sets: 3,
      reps: 8,
      completedToday: false
    });
  }

  return routine;
}

/**
 * Progression logic: Increment target reps by 1
 * @param {Object} exercise - Single exercise state
 * @returns {Object} Updated exercise state
 */
export function progressExercise(exercise) {
  const updated = { ...exercise };
  
  if (updated.unit === 'seconds') {
    // For plank/time-based, add 5 seconds
    updated.reps = (parseInt(updated.reps) || 30) + 5;
  } else {
    // For reps, add 1 rep
    updated.reps = (parseInt(updated.reps) || 5) + 1;
  }
  
  // Reset completion state for the next workout
  updated.completedToday = false;
  
  return updated;
}

/**
 * Calculate dynamic calorie target based on user profile
 * @param {Object} profile - { heightFt, heightIn, weight }
 * @returns {Number} Dynamic calorie target
 */
export function calculateCalorieTarget(profile) {
  if (!profile || !profile.weight) return 2500;
  
  const heightInches = (parseInt(profile.heightFt) * 12) + parseInt(profile.heightIn);
  const weightLbs = parseFloat(profile.weight);
  const bmi = heightInches > 0 ? ((weightLbs * 703) / (heightInches * heightInches)) : 0;
  
  const tdee = Math.round(weightLbs * 15);
  
  if (bmi < 18.5) {
    // Lean Bulk Phase (same logic as main.js dashboard header)
    return tdee + 300;
  } else if (bmi >= 18.5 && bmi < 25) {
    // Recomposition Phase
    return tdee;
  } else {
    // Caloric Deficit Phase
    return tdee - 500;
  }
}
