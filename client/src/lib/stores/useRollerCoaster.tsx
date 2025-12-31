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
      const pos = basePoint.position;
      
      let direction = new THREE.Vector3(1, 0, 0);
      if (pointIndex > 0) {
        const prevPoint = state.trackPoints[pointIndex - 1];
        direction = pos.clone().sub(prevPoint.position).normalize();
        direction.y = 0;
        if (direction.length() < 0.1) {
          direction = new THREE.Vector3(1, 0, 0);
        } else {
          direction.normalize();
        }
      }
      
      const loopRadius = 8;
      const numLoopPoints = 12;
      const allPoints: TrackPoint[] = [];
      
      // Lead-in: 2 points that gradually rise and curve upward
      const leadInDist = 4;
      allPoints.push({
        id: `point-${++pointCounter}`,
        position: new THREE.Vector3(
          pos.x + direction.x * leadInDist,
          pos.y + 1,
          pos.z + direction.z * leadInDist
        ),
        tilt: 0
      });
      allPoints.push({
        id: `point-${++pointCounter}`,
        position: new THREE.Vector3(
          pos.x + direction.x * (leadInDist + 3),
          pos.y + 3,
          pos.z + direction.z * (leadInDist + 3)
        ),
        tilt: 0
      });
      
      // Loop center is offset forward from the lead-in
      const loopCenterOffset = leadInDist + 3;
      const loopCenterX = pos.x + direction.x * loopCenterOffset;
      const loopCenterZ = pos.z + direction.z * loopCenterOffset;
      const loopBaseY = pos.y + loopRadius;
      
      // Main loop points - start from bottom going up
      for (let i = 1; i <= numLoopPoints; i++) {
        // Start at bottom (angle 0), go counter-clockwise in the vertical plane
        const angle = (i / numLoopPoints) * Math.PI * 2;
        
        // Forward offset: sin creates the forward/backward motion
        const forwardOffset = Math.sin(angle) * loopRadius;
        // Height: cos creates the up/down motion, centered at loopBaseY
        const heightOffset = -Math.cos(angle) * loopRadius;
        
        const newPos = new THREE.Vector3(
          loopCenterX + direction.x * forwardOffset,
          loopBaseY + heightOffset,
          loopCenterZ + direction.z * forwardOffset
        );
        
        // Tilt slightly inward at the top of the loop
        let tilt = 0;
        const normalizedAngle = angle / (Math.PI * 2);
        if (normalizedAngle > 0.25 && normalizedAngle < 0.75) {
          // Top half of loop - tilt inward
          const topProgress = (normalizedAngle - 0.25) / 0.5;
          tilt = -Math.sin(topProgress * Math.PI) * 5;
        }
        
        allPoints.push({
          id: `point-${++pointCounter}`,
          position: newPos,
          tilt
        });
      }
      
      // Lead-out: 2 points that gradually descend and straighten
      const exitX = loopCenterX + direction.x * loopRadius;
      const exitZ = loopCenterZ + direction.z * loopRadius;
      allPoints.push({
        id: `point-${++pointCounter}`,
        position: new THREE.Vector3(
          exitX + direction.x * 3,
          pos.y + 3,
          exitZ + direction.z * 3
        ),
        tilt: 0
      });
      allPoints.push({
        id: `point-${++pointCounter}`,
        position: new THREE.Vector3(
          exitX + direction.x * 6,
          pos.y + 1,
          exitZ + direction.z * 6
        ),
        tilt: 0
      });
      
      const newTrackPoints = [
        ...state.trackPoints.slice(0, pointIndex + 1),
        ...allPoints,
        ...state.trackPoints.slice(pointIndex + 1)
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
