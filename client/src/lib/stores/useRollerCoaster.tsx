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
      
      const entryPoint = state.trackPoints[pointIndex];
      const entryPos = entryPoint.position.clone();
      
      // Calculate forward direction from track
      let forward = new THREE.Vector3(1, 0, 0);
      if (pointIndex > 0) {
        const prevPoint = state.trackPoints[pointIndex - 1];
        forward = entryPos.clone().sub(prevPoint.position);
        forward.y = 0;
        if (forward.length() < 0.1) {
          forward = new THREE.Vector3(1, 0, 0);
        }
        forward.normalize();
      }
      
      const loopRadius = 8;
      const numPoints = 20;
      const loopPoints: TrackPoint[] = [];
      
      // Compute right vector (perpendicular to forward in horizontal plane)
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(forward, up).normalize();
      
      // Pure circular loop in forward-up plane:
      // θ from 0 to 2π
      // forward = sin(θ) * R: 0 → +R → 0 → -R → 0 (goes forward to far side, back to near)
      // vertical = (1-cos(θ)) * R: 0 → R → 2R → R → 0 (up and over)
      // Train travels on INSIDE of loop, up far side, over top, down near side
      
      for (let i = 1; i < numPoints; i++) {
        const t = i / numPoints;
        const theta = t * Math.PI * 2;
        
        const forwardOffset = Math.sin(theta) * loopRadius;
        const verticalOffset = (1 - Math.cos(theta)) * loopRadius;
        
        const x = entryPos.x + forward.x * forwardOffset;
        const y = entryPos.y + verticalOffset;
        const z = entryPos.z + forward.z * forwardOffset;
        
        loopPoints.push({
          id: `point-${++pointCounter}`,
          position: new THREE.Vector3(x, y, z),
          tilt: 0
        });
      }
      
      // Separation distance for downstream track (lateral shift to prevent collision)
      const separationDist = loopRadius * 2 + 4;
      
      // Add transition point to smoothly connect loop exit to shifted downstream
      const transitionPoint: TrackPoint = {
        id: `point-${++pointCounter}`,
        position: new THREE.Vector3(
          entryPos.x + right.x * separationDist,
          entryPos.y,
          entryPos.z + right.z * separationDist
        ),
        tilt: 0
      };
      
      // Shift all downstream points laterally
      const shiftedDownstreamPoints = state.trackPoints.slice(pointIndex + 1).map(p => ({
        ...p,
        position: new THREE.Vector3(
          p.position.x + right.x * separationDist,
          p.position.y,
          p.position.z + right.z * separationDist
        )
      }));
      
      // Combine: original up to entry + loop + transition + shifted remainder
      const newTrackPoints = [
        ...state.trackPoints.slice(0, pointIndex + 1),
        ...loopPoints,
        transitionPoint,
        ...shiftedDownstreamPoints
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
