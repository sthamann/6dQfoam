import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HeatCubeProps {
  epsilon: number;
}

export default function HeatCube({ epsilon }: HeatCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Generate particle positions based on Lorentz violation
  const { positions, colors } = useMemo(() => {
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Generate positions in a cube
      const x = (Math.random() - 0.5) * 4;
      const y = (Math.random() - 0.5) * 4;
      const z = (Math.random() - 0.5) * 4;
      
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      
      // Color based on epsilon and position
      // Red indicates higher Lorentz violation
      const distance = Math.sqrt(x*x + y*y + z*z);
      const violation = epsilon * (1 + Math.sin(distance * 2) * 0.5);
      
      if (violation < 1e-6) {
        // Green for excellent Lorentz invariance
        colors[i3] = 0.2;     // R
        colors[i3 + 1] = 1.0; // G
        colors[i3 + 2] = 0.3; // B
      } else if (violation < 1e-3) {
        // Yellow for good
        colors[i3] = 1.0;     // R
        colors[i3 + 1] = 1.0; // G
        colors[i3 + 2] = 0.0; // B
      } else {
        // Red for poor
        colors[i3] = 1.0;     // R
        colors[i3 + 1] = 0.2; // G
        colors[i3 + 2] = 0.2; // B
      }
    }
    
    return { positions, colors };
  }, [epsilon]);

  // Create geometry and material
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
  }, [positions, colors]);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
  }, []);

  // Animate rotation
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <group>
      {/* Main particle system showing isotropy violation */}
      <points ref={particlesRef} geometry={geometry} material={material} />
      
      {/* Wireframe cube for reference */}
      <mesh ref={meshRef}>
        <boxGeometry args={[4, 4, 4]} />
        <meshBasicMaterial 
          color={epsilon < 1e-6 ? "#22c55e" : epsilon < 1e-3 ? "#eab308" : "#ef4444"}
          wireframe 
          transparent 
          opacity={0.2} 
        />
      </mesh>
      
      {/* Coordinate axes */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={6}
            array={new Float32Array([
              -3, 0, 0, 3, 0, 0,  // X axis
              0, -3, 0, 0, 3, 0,  // Y axis
              0, 0, -3, 0, 0, 3   // Z axis
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#666666" />
      </line>
    </group>
  );
}