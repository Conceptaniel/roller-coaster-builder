import { create } from "zustand";
import * as THREE from "three";

export type CoasterMode = "build" | "ride" | "preview";

export interface TrackPoint {
  id: string;
  position: THREE.Vector3;
  tilt: number;
}

interface RollerCoasterState {
  mode: CoasterMode;
  trackPoints: TrackPoint[];
  selectedPointId: string | null;
  rideProgress: number;
  isRiding: boolean;
  rideSpeed: number;
  isDraggingPoint: boolean;
  isAddingPoints: boolean;
  isLooped: boolean;
  hasChainLift: boolean;
  showWoodSupports: boolean;
  isNightMode: boolean;
  cameraTarget: THREE.Vector3 | null;
  
  setMode: (mode: CoasterMode) => void;
  setCameraTarget: (target: THREE.Vector3 | null) => void;
  addTrackPoint: (position: THREE.Vector3) => void;
  updateTrackPoint: (id: string, position: THREE.Vector3) => void;
  updateTrackPointTilt: (id: string, tilt: number) => void;
  removeTrackPoint: (id: string) => void;
  createLoopAtPoint: (id: string) => void;
  selectPoint: (id: string | null) => void;
  clearTrack: () => void;
  setRideProgress: (progress: number) => void;
  setIsRiding: (riding: boolean) => void;
  setRideSpeed: (speed: number) => void;
  setIsDraggingPoint: (dragging: boolean) => void;
  setIsAddingPoints: (adding: boolean) => void;
  setIsLooped: (looped: boolean) => void;
  setHasChainLift: (hasChain: boolean) => void;
  setShowWoodSupports: (show: boolean) => void;
  setIsNightMode: (night: boolean) => void;
  startRide: () => void;
  stopRide: () => void;
}

let pointCounter = 0;

export const useRollerCoaster = create<RollerCoasterState>((set, get) => ({
  mode: "build",
  trackPoints: [],
  selectedPointId: null,
  rideProgress: 0,
  isRiding: false,
  rideSpeed: 1.0,
  isDraggingPoint: false,
  isAddingPoints: true,
  isLooped: false,
  hasChainLift: true,
  showWoodSupports: false,
  isNightMode: false,
  cameraTarget: null,
  
  setMode: (mode) => set({ mode }),
  
  setCameraTarget: (target) => set({ cameraTarget: target }),
  
  setIsDraggingPoint: (dragging) => set({ isDraggingPoint: dragging }),
  
  setIsAddingPoints: (adding) => set({ isAddingPoints: adding }),
  
  setIsLooped: (looped) => set({ isLooped: looped }),
  
  setHasChainLift: (hasChain) => set({ hasChainLift: hasChain }),
  
  setShowWoodSupports: (show) => set({ showWoodSupports: show }),
  
  setIsNightMode: (night) => set({ isNightMode: night }),
  
  addTrackPoint: (position) => {
    const id = `point-${++pointCounter}`;
    set((state) => ({
      trackPoints: [...state.trackPoints, { id, position: position.clone(), tilt: 0 }],
    }));
  },
  
  updateTrackPoint: (id, position) => {
    set((state) => ({
      trackPoints: state.trackPoints.map((point) =>
        point.id === id ? { ...point, position: position.clone() } : point
      ),
    }));
  },
  
  updateTrackPointTilt: (id, tilt) => {
    set((state) => ({
      trackPoints: state.trackPoints.map((point) =>
        point.id === id ? { ...point, tilt } : point
      ),
    }));
  },
  
  removeTrackPoint: (id) => {
    set((state) => ({
      trackPoints: state.trackPoints.filter((point) => point.id !== id),
      selectedPointId: state.selectedPointId === id ? null : state.selectedPointId,
    }));
  },
  
  createLoopAtPoint: (id) => {
    set((state) => {
      const pointIndex = state.trackPoints.findIndex((p) => p.id === id);
      if (pointIndex === -1) return state;
      
      const basePoint = state.trackPoints[pointIndex];
      const pos = basePoint.position.clone();
      
      // Calculate forward direction (along track, horizontal)
      let forward = new THREE.Vector3(1, 0, 0);
      if (pointIndex > 0) {
        const prevPoint = state.trackPoints[pointIndex - 1];
        forward = pos.clone().sub(prevPoint.position);
        forward.y = 0;
        if (forward.length() < 0.1) {
          forward = new THREE.Vector3(1, 0, 0);
        }
        forward.normalize();
      }
      
      const loopRadius = 8;
      const leadIn = 3;
      const leadOut = 3;
      const totalLoopLength = leadIn + (loopRadius * 2) + leadOut;
      
      // STEP 1: Shift all subsequent points forward to make room for the loop
      const shiftedPoints = state.trackPoints.slice(pointIndex + 1).map(p => ({
        ...p,
        position: new THREE.Vector3(
          p.position.x + forward.x * totalLoopLength,
          p.position.y,
          p.position.z + forward.z * totalLoopLength
        )
      }));
      
      // STEP 2: Create vertical loop in the forward-up plane
      const loopPoints: TrackPoint[] = [];
      
      // Lead-in point
      loopPoints.push({
        id: `point-${++pointCounter}`,
        position: new THREE.Vector3(
          pos.x + forward.x * leadIn,
          pos.y,
          pos.z + forward.z * leadIn
        ),
        tilt: 0
      });
      
      // Loop center is at leadIn + loopRadius forward, loopRadius up
      const loopCenterX = pos.x + forward.x * (leadIn + loopRadius);
      const loopCenterY = pos.y + loopRadius;
      const loopCenterZ = pos.z + forward.z * (leadIn + loopRadius);
      
      // Generate loop points: start at bottom-back, go up-back, over top, down-front, to bottom-front
      // Angle -PI/2 = bottom-back (entrance), angle 3PI/2 = bottom-front (exit)
      const arcPoints = 10;
      for (let i = 1; i < arcPoints; i++) {
        const t = i / arcPoints;
        const angle = -Math.PI / 2 + t * Math.PI * 2;
        
        // sin gives forward offset: -1 at back, +1 at front
        const forwardOffset = Math.sin(angle) * loopRadius;
        // cos gives height offset: -1 at bottom, +1 at top
        const heightOffset = Math.cos(angle) * loopRadius;
        
        loopPoints.push({
          id: `point-${++pointCounter}`,
          position: new THREE.Vector3(
            loopCenterX + forward.x * forwardOffset,
            loopCenterY + heightOffset,
            loopCenterZ + forward.z * forwardOffset
          ),
          tilt: 0
        });
      }
      
      // Lead-out point
      loopPoints.push({
        id: `point-${++pointCounter}`,
        position: new THREE.Vector3(
          pos.x + forward.x * (leadIn + loopRadius * 2 + leadOut),
          pos.y,
          pos.z + forward.z * (leadIn + loopRadius * 2 + leadOut)
        ),
        tilt: 0
      });
      
      // Combine: original up to selected + loop + shifted remainder
      const newTrackPoints = [
        ...state.trackPoints.slice(0, pointIndex + 1),
        ...loopPoints,
        ...shiftedPoints
      ];
      
      return { trackPoints: newTrackPoints };
    });
  },
  
  selectPoint: (id) => set({ selectedPointId: id }),
  
  clearTrack: () => {
    set({ trackPoints: [], selectedPointId: null, rideProgress: 0, isRiding: false });
  },
  
  setRideProgress: (progress) => set({ rideProgress: progress }),
  
  setIsRiding: (riding) => set({ isRiding: riding }),
  
  setRideSpeed: (speed) => set({ rideSpeed: speed }),
  
  startRide: () => {
    const { trackPoints } = get();
    if (trackPoints.length >= 2) {
      set({ mode: "ride", isRiding: true, rideProgress: 0 });
    }
  },
  
  stopRide: () => {
    set({ mode: "build", isRiding: false, rideProgress: 0 });
  },
}));
