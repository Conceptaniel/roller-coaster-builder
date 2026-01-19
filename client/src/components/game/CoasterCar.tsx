import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRollerCoaster, LoopSegment } from "@/lib/stores/useRollerCoaster";
import { getTrackCurve } from "./Track";

interface TrackSection {
  type: "spline" | "roll";
  startProgress: number;
  endProgress: number;
  arcLength: number;
  rollFrame?: BarrelRollFrame;
  splineStartT?: number;
  splineEndT?: number;
  pointIndex?: number;
}

interface BarrelRollFrame {
  entryPos: THREE.Vector3;
  forward: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
  radius: number;
  pitch: number;
}

// Vertical loop with corkscrew offset to prevent self-intersection
function sampleVerticalLoopAnalytically(
  frame: BarrelRollFrame,
  t: number
): { point: THREE.Vector3; tangent: THREE.Vector3; up: THREE.Vector3 } {
  const { entryPos, forward, up: U0, right: R0, radius, pitch } = frame;
  
  const twoPi = Math.PI * 2;
  const corkscrewOffset = radius * 0.4;
  
  const theta = twoPi * (t - Math.sin(twoPi * t) / twoPi);
  const dThetaDt = twoPi * (1 - Math.cos(twoPi * t));
  
  // Vertical loop with lateral corkscrew offset
  const point = new THREE.Vector3()
    .copy(entryPos)
    .addScaledVector(forward, pitch * t + radius * Math.sin(theta))
    .addScaledVector(U0, radius * (1 - Math.cos(theta)))
    .addScaledVector(R0, corkscrewOffset * Math.sin(theta));
  
  const tangent = new THREE.Vector3()
    .copy(forward).multiplyScalar(pitch + radius * Math.cos(theta) * dThetaDt)
    .addScaledVector(U0, radius * Math.sin(theta) * dThetaDt)
    .addScaledVector(R0, corkscrewOffset * Math.cos(theta) * dThetaDt)
    .normalize();
  
  // Up rotates around right axis - upside down at θ=π
  const rotatedUp = new THREE.Vector3()
    .addScaledVector(U0, Math.cos(theta))
    .addScaledVector(forward, -Math.sin(theta))
    .normalize();
  
  return { point, tangent, up: rotatedUp };
}

function computeRollFrame(
  spline: THREE.CatmullRomCurve3,
  splineT: number,
  radius: number,
  pitch: number,
  rollOffset: THREE.Vector3
): BarrelRollFrame {
  const entryPos = spline.getPoint(splineT).add(rollOffset);
  const forward = spline.getTangent(splineT).normalize();
  
  // Use WORLD up to build roll frame - keeps roll horizontal and going UP first
  const worldUp = new THREE.Vector3(0, 1, 0);
  let entryUp = worldUp.clone();
  const upDot = entryUp.dot(forward);
  entryUp.sub(forward.clone().multiplyScalar(upDot));
  if (entryUp.length() > 0.001) {
    entryUp.normalize();
  } else {
    entryUp.set(1, 0, 0);
    const d = entryUp.dot(forward);
    entryUp.sub(forward.clone().multiplyScalar(d)).normalize();
  }
  
  const right = new THREE.Vector3().crossVectors(forward, entryUp).normalize();
  
  return { entryPos, forward, up: entryUp, right, radius, pitch };
}

function computeRollArcLength(radius: number, pitch: number): number {
  const steps = 100;
  let length = 0;
  const twoPi = Math.PI * 2;
  
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps;
    const t2 = (i + 1) / steps;
    
    const theta1 = twoPi * (t1 - Math.sin(twoPi * t1) / twoPi);
    const theta2 = twoPi * (t2 - Math.sin(twoPi * t2) / twoPi);
    const dTheta = theta2 - theta1;
    
    const dForward = pitch / steps;
    const dRadial = radius * Math.sqrt(dTheta * dTheta);
    
    length += Math.sqrt(dForward * dForward + dRadial * dRadial);
  }
  
  return length;
}

function sampleHybridTrack(
  progress: number,
  sections: TrackSection[],
  spline: THREE.CatmullRomCurve3,
  loopSegments: LoopSegment[],
  trackPoints: { id: string; position: THREE.Vector3 }[],
  isLooped: boolean
): { point: THREE.Vector3; tangent: THREE.Vector3; up: THREE.Vector3 } | null {
  if (sections.length === 0) return null;
  
  progress = Math.max(0, Math.min(progress, 0.9999));
  
  let section: TrackSection | null = null;
  for (const s of sections) {
    if (progress >= s.startProgress && progress < s.endProgress) {
      section = s;
      break;
    }
  }
  
  if (!section) {
    section = sections[sections.length - 1];
  }
  
  const localT = (progress - section.startProgress) / (section.endProgress - section.startProgress);
  
  if (section.type === "roll" && section.rollFrame) {
    return sampleVerticalLoopAnalytically(section.rollFrame, localT);
  } else if (section.splineStartT !== undefined && section.splineEndT !== undefined) {
    const splineT = section.splineStartT + localT * (section.splineEndT - section.splineStartT);
    const point = spline.getPoint(splineT);
    const tangent = spline.getTangent(splineT).normalize();
    
    let rollOffset = new THREE.Vector3(0, 0, 0);
    const loopMap = new Map<string, LoopSegment>();
    for (const seg of loopSegments) {
      loopMap.set(seg.entryPointId, seg);
    }
    
    const numPoints = trackPoints.length;
    const totalSplineSegments = isLooped ? numPoints : numPoints - 1;
    
    for (let i = 0; i < numPoints && i <= (section.pointIndex ?? 0); i++) {
      const tp = trackPoints[i];
      const loopSeg = loopMap.get(tp.id);
      if (loopSeg) {
        const spT = i / totalSplineSegments;
        const fwd = spline.getTangent(spT).normalize();
        rollOffset.addScaledVector(fwd, loopSeg.pitch);
      }
    }
    
    point.add(rollOffset);
    
    let up = new THREE.Vector3(0, 1, 0);
    const dot = up.dot(tangent);
    up.sub(tangent.clone().multiplyScalar(dot));
    if (up.lengthSq() > 0.001) {
      up.normalize();
    } else {
      up.set(1, 0, 0);
      const d = up.dot(tangent);
      up.sub(tangent.clone().multiplyScalar(d)).normalize();
    }
    
    return { point, tangent, up };
  }
  
  return null;
}

export function CoasterCar() {
  const meshRef = useRef<THREE.Group>(null);
  const { trackPoints, loopSegments, rideProgress, isRiding, mode, isLooped, setRideProgress, rideSpeed } = useRollerCoaster();
  
  const sections = useMemo(() => {
    if (trackPoints.length < 2) return [];
    
    const curve = getTrackCurve(trackPoints, isLooped);
    if (!curve) return [];
    
    const loopMap = new Map<string, LoopSegment>();
    for (const seg of loopSegments) {
      loopMap.set(seg.entryPointId, seg);
    }
    
    const numPoints = trackPoints.length;
    const totalSplineSegments = isLooped ? numPoints : numPoints - 1;
    const sections: TrackSection[] = [];
    let accumulatedLength = 0;
    let rollOffset = new THREE.Vector3(0, 0, 0);
    
    let prevTangent = curve.getTangent(0).normalize();
    let prevUp = new THREE.Vector3(0, 1, 0);
    const initDot = prevUp.dot(prevTangent);
    prevUp.sub(prevTangent.clone().multiplyScalar(initDot));
    if (prevUp.length() < 0.01) {
      prevUp.set(1, 0, 0);
      const d = prevUp.dot(prevTangent);
      prevUp.sub(prevTangent.clone().multiplyScalar(d));
    }
    prevUp.normalize();
    
    for (let i = 0; i < numPoints; i++) {
      const point = trackPoints[i];
      const loopSeg = loopMap.get(point.id);
      
      if (loopSeg) {
        const splineT = i / totalSplineSegments;
        const rollFrame = computeRollFrame(curve, splineT, loopSeg.radius, loopSeg.pitch, rollOffset.clone());
        
        const rollArcLength = computeRollArcLength(loopSeg.radius, loopSeg.pitch);
        
        sections.push({
          type: "roll",
          startProgress: 0,
          endProgress: 0,
          arcLength: rollArcLength,
          rollFrame,
          pointIndex: i
        });
        accumulatedLength += rollArcLength;
        
        rollOffset.addScaledVector(rollFrame.forward, loopSeg.pitch);
        
        prevTangent.copy(rollFrame.forward);
        prevUp.copy(rollFrame.up);
      }
      
      if (i >= numPoints - 1 && !isLooped) continue;
      
      const splineStartT = i / totalSplineSegments;
      const splineEndT = (i + 1) / totalSplineSegments;
      
      let segmentLength = 0;
      const subSamples = 10;
      for (let s = 0; s < subSamples; s++) {
        const t1 = splineStartT + (s / subSamples) * (splineEndT - splineStartT);
        const t2 = splineStartT + ((s + 1) / subSamples) * (splineEndT - splineStartT);
        const p1 = curve.getPoint(t1);
        const p2 = curve.getPoint(t2);
        segmentLength += p1.distanceTo(p2);
      }
      
      sections.push({
        type: "spline",
        startProgress: 0,
        endProgress: 0,
        arcLength: segmentLength,
        splineStartT,
        splineEndT,
        pointIndex: i
      });
      accumulatedLength += segmentLength;
      
      const endTangent = curve.getTangent(splineEndT).normalize();
      const dot = Math.max(-1, Math.min(1, prevTangent.dot(endTangent)));
      if (dot < 0.9999 && dot > -0.9999) {
        const axis = new THREE.Vector3().crossVectors(prevTangent, endTangent);
        if (axis.length() > 0.0001) {
          axis.normalize();
          const angle = Math.acos(dot);
          const quat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
          prevUp.applyQuaternion(quat);
        }
      }
      const upDot = prevUp.dot(endTangent);
      prevUp.sub(endTangent.clone().multiplyScalar(upDot));
      if (prevUp.length() > 0.001) prevUp.normalize();
      prevTangent.copy(endTangent);
    }
    
    let runningLength = 0;
    for (const section of sections) {
      section.startProgress = runningLength / accumulatedLength;
      runningLength += section.arcLength;
      section.endProgress = runningLength / accumulatedLength;
    }
    
    return sections;
  }, [trackPoints, loopSegments, isLooped]);
  
  // Physics state reference for realistic speed based on height
  const physicsRef = useRef({ 
    currentSpeed: 0, 
    lastHeight: 0,
    lastProgress: 0 
  });
  
  const computeRealisticSpeed = (progress: number, currentHeight: number) => {
    const physics = physicsRef.current;
    const maxSpeed = 3.5; // Maximum speed in units/frame
    const g = 0.98; // Gravity constant for realistic acceleration
    const friction = 0.02; // Friction/air resistance on flats
    const liftSpeed = 0.5; // Maximum climb speed on lift hill
    
    // Initial speed on lift hill
    const isOnLift = progress < 0.08; // First 8% is lift
    if (isOnLift) {
      physics.currentSpeed = Math.min(liftSpeed, physics.currentSpeed + 0.05);
    } else {
      // Calculate height change
      const heightDelta = physics.lastHeight - currentHeight;
      
      // Energy conservation: v² = v₀² + 2gh
      const energyFromGravity = Math.sqrt(Math.max(0, physics.currentSpeed ** 2 + 2 * g * heightDelta));
      
      // Apply friction on flat/uphill sections
      const angle = Math.atan2(physics.lastHeight - currentHeight, 1);
      const frictionFactor = angle > 0 ? 1 - friction : 1 - friction * 0.5;
      
      physics.currentSpeed = Math.min(maxSpeed, energyFromGravity * frictionFactor);
    }
    
    // Brake zones (last 10% of track)
    if (progress > 0.9) {
      physics.currentSpeed *= 0.96;
    }
    
    physics.lastHeight = currentHeight;
    physics.lastProgress = progress;
    
    return physics.currentSpeed;
  };

  useFrame(() => {
    if (!meshRef.current || !isRiding) return;
    
    const curve = getTrackCurve(trackPoints, isLooped);
    if (!curve || sections.length === 0) return;
    
    const sample = sampleHybridTrack(rideProgress, sections, curve, loopSegments, trackPoints, isLooped);
    if (!sample) return;
    
    const { point: position, tangent, up } = sample;
    
    // Update physics-based speed
    const realisticSpeed = computeRealisticSpeed(rideProgress, position.y);
    
    // Update progress with realistic speed
    const deltaProgress = realisticSpeed * 0.001; // Small delta for smooth animation
    const newProgress = Math.min(rideProgress + deltaProgress * rideSpeed, 0.9999);
    setRideProgress(newProgress);
    
    meshRef.current.position.copy(position);
    meshRef.current.position.addScaledVector(up, -0.18); // Scaled down offset (0.3 * 0.6)
    
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const matrix = new THREE.Matrix4().makeBasis(right, up, tangent);
    const euler = new THREE.Euler().setFromRotationMatrix(matrix);
    
    meshRef.current.rotation.copy(euler);
  });
  
  if (!isRiding || mode !== "ride") return null;
  
  // Scale factor to match the track size - smaller car for a smaller track
  const CAR_SCALE = 0.6;
  
  return (
    <group ref={meshRef} scale={[CAR_SCALE, CAR_SCALE, CAR_SCALE]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 0.5, 2]} />
        <meshStandardMaterial color="#ff0000" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.4, -0.5]}>
        <boxGeometry args={[0.8, 0.3, 0.6]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.5, -0.35, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#222222" metalness={0.8} />
      </mesh>
      <mesh position={[0.5, -0.35, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#222222" metalness={0.8} />
      </mesh>
      <mesh position={[-0.5, -0.35, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#222222" metalness={0.8} />
      </mesh>
      <mesh position={[0.5, -0.35, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#222222" metalness={0.8} />
      </mesh>
    </group>
  );
}
