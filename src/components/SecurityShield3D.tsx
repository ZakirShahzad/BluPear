import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import { Mesh, Group } from "three";
import * as THREE from "three";

const FloatingParticle = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<Mesh>(null!);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.01;
      meshRef.current.position.x += Math.cos(state.clock.elapsedTime + position[1]) * 0.005;
      meshRef.current.rotation.x += 0.02;
      meshRef.current.rotation.y += 0.02;
      meshRef.current.rotation.z += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshStandardMaterial 
        color="#00ff88" 
        emissive="#00ff88" 
        emissiveIntensity={0.5}
        transparent 
        opacity={0.8} 
      />
    </mesh>
  );
};

const ScanLine = () => {
  const lineRef = useRef<Group>(null!);
  
  useFrame((state) => {
    if (lineRef.current) {
      lineRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={lineRef}>
      <mesh position={[0, 0, 0.2]}>
        <planeGeometry args={[3, 0.05]} />
        <meshBasicMaterial 
          color="#00ff88" 
          transparent 
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

const SecurityShield = () => {
  const shieldRef = useRef<Group>(null!);
  const glowRef = useRef<Mesh>(null!);
  const innerRef = useRef<Mesh>(null!);
  const coreRef = useRef<Mesh>(null!);
  
  useFrame((state) => {
    if (shieldRef.current) {
      shieldRef.current.rotation.y += 0.008;
      shieldRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.004;
      const scale = 1.1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      glowRef.current.scale.setScalar(scale);
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= 0.01;
      innerRef.current.rotation.z += 0.005;
    }
    if (coreRef.current) {
      coreRef.current.rotation.x += 0.02;
      coreRef.current.rotation.y += 0.03;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      coreRef.current.scale.setScalar(pulse);
    }
  });

  // Enhanced shield shape
  const shieldShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.2);
    shape.bezierCurveTo(-0.3, 1.1, -0.7, 0.8, -0.9, 0.4);
    shape.lineTo(-0.9, -0.3);
    shape.bezierCurveTo(-0.9, -0.7, -0.5, -0.9, 0, -1.1);
    shape.bezierCurveTo(0.5, -0.9, 0.9, -0.7, 0.9, -0.3);
    shape.lineTo(0.9, 0.4);
    shape.bezierCurveTo(0.7, 0.8, 0.3, 1.1, 0, 1.2);
    shape.closePath();
    return shape;
  }, []);

  // Inner shield pattern
  const innerPattern = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.8);
    shape.bezierCurveTo(-0.2, 0.7, -0.5, 0.5, -0.6, 0.2);
    shape.lineTo(-0.6, -0.2);
    shape.bezierCurveTo(-0.6, -0.5, -0.3, -0.7, 0, -0.8);
    shape.bezierCurveTo(0.3, -0.7, 0.6, -0.5, 0.6, -0.2);
    shape.lineTo(0.6, 0.2);
    shape.bezierCurveTo(0.5, 0.5, 0.2, 0.7, 0, 0.8);
    shape.closePath();
    return shape;
  }, []);

  return (
    <group ref={shieldRef}>
      {/* Outer glow */}
      <mesh ref={glowRef} position={[0, 0, -0.05]}>
        <extrudeGeometry args={[shieldShape, { depth: 0.05, bevelEnabled: false }]} />
        <meshBasicMaterial 
          color="#00ff88" 
          transparent 
          opacity={0.15} 
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Main shield body */}
      <mesh position={[0, 0, 0]}>
        <extrudeGeometry args={[shieldShape, { 
          depth: 0.2, 
          bevelEnabled: true, 
          bevelSize: 0.03, 
          bevelThickness: 0.03,
          bevelSegments: 8
        }]} />
        <meshStandardMaterial 
          color="#0066cc" 
          emissive="#003366" 
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
      
      {/* Inner pattern */}
      <mesh ref={innerRef} position={[0, 0, 0.15]}>
        <extrudeGeometry args={[innerPattern, { depth: 0.05, bevelEnabled: false }]} />
        <meshStandardMaterial 
          color="#00aaff" 
          emissive="#0088cc" 
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Central core */}
      <mesh ref={coreRef} position={[0, 0, 0.25]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial 
          color="#00ff88" 
          emissive="#00ff88" 
          emissiveIntensity={0.8}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Lock symbol */}
      <mesh position={[0, 0.1, 0.22]}>
        <boxGeometry args={[0.12, 0.08, 0.03]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#00aaff" 
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0, 0.2, 0.22]}>
        <torusGeometry args={[0.06, 0.02, 8, 16]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#00aaff" 
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
};

export const SecurityShield3D = () => {
  // Generate random particle positions
  const particles = useMemo(() => {
    return Array.from({ length: 15 }, () => [
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 3,
    ] as [number, number, number]);
  }, []);

  return (
    <div className="w-full h-64 relative">
      <Canvas camera={{ position: [0, 0, 4], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1.2} color="#00ff88" />
        <pointLight position={[-5, -5, -3]} intensity={0.8} color="#0066cc" />
        <spotLight 
          position={[0, 0, 10]} 
          angle={0.3} 
          penumbra={0.5} 
          intensity={1} 
          color="#00aaff"
          target-position={[0, 0, 0]}
        />
        
        <SecurityShield />
        <ScanLine />
        
        {particles.map((position, index) => (
          <FloatingParticle key={index} position={position} />
        ))}
      </Canvas>
    </div>
  );
};