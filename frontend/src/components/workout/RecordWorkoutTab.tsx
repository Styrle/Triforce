import { useState } from 'react';
import { Plus } from 'lucide-react';
import { WorkoutLogTab } from './WorkoutLogTab';
import { NewWorkoutModal } from './NewWorkoutModal';

export function RecordWorkoutTab() {
  const [showNewWorkout, setShowNewWorkout] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNewWorkout(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Workout
        </button>
      </div>
      <WorkoutLogTab />
      {showNewWorkout && <NewWorkoutModal onClose={() => setShowNewWorkout(false)} />}
    </div>
  );
}
