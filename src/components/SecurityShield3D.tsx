import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import { Mesh, Group } from "three";
import * as THREE from "three";

const Satellite = ({ position, speed }: { position: [number, number, number], speed: number }) => {
  const meshRef = useRef<Mesh>(null!);
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime * speed;
      meshRef.current.position.x = Math.cos(time) * position[0];
      meshRef.current.position.z = Math.sin(time) * position[2];
      meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.2;
      meshRef.current.rotation.y += 0.05;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.04, 0.04, 0.08]} />
      <meshStandardMaterial 
        color="#00aaff" 
        emissive="#00aaff" 
        emissiveIntensity={0.6}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
};

const DataStream = ({ radius }: { radius: number }) => {
  const groupRef = useRef<Group>(null!);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 0.5,
        Math.sin(angle) * radius
      ));
    }
    return pts;
  }, [radius]);

  return (
    <group ref={groupRef}>
      {points.map((point, index) => (
        <mesh key={index} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshBasicMaterial 
            color="#00ff88" 
            transparent 
            opacity={0.7} 
          />
        </mesh>
      ))}
    </group>
  );
};

const PlanetRings = () => {
  const ringsRef = useRef<Group>(null!);
  
  useFrame((state) => {
    if (ringsRef.current) {
      ringsRef.current.rotation.z = state.clock.elapsedTime * 0.2;
      ringsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={ringsRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2.2, 64]} />
        <meshBasicMaterial 
          color="#00aaff" 
          transparent 
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.6, 64]} />
        <meshBasicMaterial 
          color="#0088cc" 
          transparent 
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

const SecurityPlanet = () => {
  const planetRef = useRef<Group>(null!);
  const surfaceRef = useRef<Mesh>(null!);
  const atmosphereRef = useRef<Mesh>(null!);
  const coreRef = useRef<Mesh>(null!);
  
  useFrame((state) => {
    if (planetRef.current) {
      planetRef.current.rotation.y += 0.005;
    }
    if (surfaceRef.current) {
      surfaceRef.current.rotation.y += 0.008;
      surfaceRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y -= 0.003;
      const scale = 1.02 + Math.sin(state.clock.elapsedTime * 2) * 0.01;
      atmosphereRef.current.scale.setScalar(scale);
    }
    if (coreRef.current) {
      const pulse = 0.95 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      coreRef.current.scale.setScalar(pulse);
    }
  });

  // Create detailed surface texture with noise
  const surfaceGeometry = useMemo(() => {
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const positions = geometry.attributes.position.array;
    
    // Add surface detail with noise
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const noise = Math.sin(x * 5) * Math.cos(y * 5) * Math.sin(z * 5) * 0.02;
      const length = Math.sqrt(x * x + y * y + z * z);
      
      positions[i] = x * (1 + noise);
      positions[i + 1] = y * (1 + noise);
      positions[i + 2] = z * (1 + noise);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  return (
    <group ref={planetRef}>
      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[1.15, 32, 32]} />
        <meshBasicMaterial 
          color="#4488ff" 
          transparent 
          opacity={0.1} 
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Main planet surface */}
      <mesh ref={surfaceRef} geometry={surfaceGeometry}>
        <meshStandardMaterial 
          color="#2255aa" 
          emissive="#001122" 
          emissiveIntensity={0.2}
          metalness={0.3}
          roughness={0.8}
        />
      </mesh>
      
      {/* Continent details */}
      <mesh>
        <sphereGeometry args={[1.002, 32, 32]} />
        <meshStandardMaterial 
          color="#00aa44" 
          emissive="#002211" 
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Security grid overlay */}
      <mesh>
        <sphereGeometry args={[1.005, 16, 16]} />
        <meshBasicMaterial 
          color="#00ff88" 
          transparent 
          opacity={0.2}
          wireframe={true}
        />
      </mesh>
      
      {/* Core energy */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
          color="#ffaa00" 
          emissive="#ff8800" 
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Data nodes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const phi = Math.acos(-1 + (2 * i) / 8);
        const theta = Math.sqrt(8 * Math.PI) * phi;
        const x = Math.cos(theta) * Math.sin(phi) * 1.1;
        const y = Math.sin(theta) * Math.sin(phi) * 1.1;
        const z = Math.cos(phi) * 1.1;
        
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial 
              color="#00ff88" 
              emissive="#00ff88" 
              emissiveIntensity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export const SecurityShield3D = () => {
  // Generate satellite positions
  const satellites = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => ({
      position: [2 + i * 0.3, (Math.random() - 0.5) * 0.8, 2 + i * 0.3] as [number, number, number],
      speed: 0.5 + Math.random() * 0.5
    }));
  }, []);

  return (
    <div className="w-full h-64 relative">
      <Canvas camera={{ position: [0, 0, 4], fov: 60 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#4488ff" />
        <pointLight position={[-5, -5, -3]} intensity={1.0} color="#0066cc" />
        <pointLight position={[0, 0, 8]} intensity={2.0} color="#00aaff" />
        <spotLight 
          position={[0, 8, 5]} 
          angle={0.4} 
          penumbra={0.3} 
          intensity={1.5} 
          color="#ffffff"
          target-position={[0, 0, 0]}
        />
        
        <SecurityPlanet />
        <PlanetRings />
        <DataStream radius={3} />
        <DataStream radius={3.5} />
        
        {satellites.map((satellite, index) => (
          <Satellite key={index} position={satellite.position} speed={satellite.speed} />
        ))}
      </Canvas>
    </div>
  );
};