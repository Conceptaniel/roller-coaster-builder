import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRollerCoaster } from "@/lib/stores/useRollerCoaster";
import { getTrackCurve } from "./Track";

export function CoasterCar() {
  const meshRef = useRef<THREE.Group>(null);
  const { trackPoints, rideProgress, isRiding, mode } = useRollerCoaster();
  
  useFrame(() => {
    if (!meshRef.current || !isRiding) return;
    
    const curve = getTrackCurve(trackPoints);
    if (!curve) return;
    
    const position = curve.getPoint(rideProgress);
    const tangent = curve.getTangent(rideProgress);
    
    meshRef.current.position.copy(position);
    meshRef.current.position.y -= 0.3;
    
    const angle = Math.atan2(tangent.x, tangent.z);
    meshRef.current.rotation.y = angle;
    
    const pitch = Math.asin(-tangent.y);
    meshRef.current.rotation.x = pitch;
  });
  
  if (!isRiding || mode !== "ride") return null;
  
  return (
    <group ref={meshRef}>
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
