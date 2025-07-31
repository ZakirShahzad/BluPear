import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import { Mesh, Vector3 } from "three";
import * as THREE from "three";

const FloatingParticle = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<Mesh>(null!);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.002;
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.05, 0.05, 0.05]} />
      <meshBasicMaterial color="#00AAFF" transparent opacity={0.6} />
    </mesh>
  );
};

const SecurityShield = () => {
  const shieldRef = useRef<Mesh>(null!);
  const glowRef = useRef<Mesh>(null!);
  
  useFrame((state) => {
    if (shieldRef.current) {
      shieldRef.current.rotation.y += 0.005;
      shieldRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.003;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      glowRef.current.scale.setScalar(scale);
    }
  });

  // Create shield shape
  const shieldShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1);
    shape.lineTo(-0.8, 0.3);
    shape.lineTo(-0.8, -0.5);
    shape.lineTo(0, -1);
    shape.lineTo(0.8, -0.5);
    shape.lineTo(0.8, 0.3);
    shape.closePath();
    return shape;
  }, []);

  return (
    <group>
      {/* Glow effect */}
      <mesh ref={glowRef}>
        <extrudeGeometry args={[shieldShape, { depth: 0.1, bevelEnabled: false }]} />
        <meshBasicMaterial color="#00AAFF" transparent opacity={0.2} />
      </mesh>
      
      {/* Main shield */}
      <mesh ref={shieldRef}>
        <extrudeGeometry args={[shieldShape, { depth: 0.15, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 }]} />
        <meshPhongMaterial color="#0080FF" emissive="#004080" emissiveIntensity={0.2} />
      </mesh>
      
      {/* Shield details */}
      <mesh position={[0, 0, 0.16]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 6]} />
        <meshPhongMaterial color="#00AAFF" emissive="#0080FF" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
};

export const SecurityShield3D = () => {
  // Generate random particle positions
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, () => [
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 4,
    ] as [number, number, number]);
  }, []);

  return (
    <div className="w-full h-64 relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00AAFF" />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#0080FF" />
        
        <SecurityShield />
        
        {particles.map((position, index) => (
          <FloatingParticle key={index} position={position} />
        ))}
      </Canvas>
    </div>
  );
};