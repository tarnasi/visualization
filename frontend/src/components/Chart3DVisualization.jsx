import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';

const getROPColor = (rop, minROP, maxROP) => {
  if (maxROP === minROP) return new THREE.Color(0, 1, 0);
  
  const normalized = (rop - minROP) / (maxROP - minROP);
  
  if (normalized < 0.5) {
    const r = 0;
    const g = normalized * 2;
    const b = 1 - normalized * 2;
    return new THREE.Color(r, g, b);
  } else {
    const r = (normalized - 0.5) * 2;
    const g = 1 - (normalized - 0.5) * 2;
    const b = 0;
    return new THREE.Color(r, g, b);
  }
};

const ScatterPlot3D = ({ data }) => {
  const { points, linePoints, minROP, maxROP, axes } = useMemo(() => {
    if (!data || data.length === 0) return { points: [], linePoints: [], minROP: 0, maxROP: 0, axes: {} };
    
    const minROP = Math.min(...data.map(d => d.rop));
    const maxROP = Math.max(...data.map(d => d.rop));
    const minDepth = Math.min(...data.map(d => d.depth));
    const maxDepth = Math.max(...data.map(d => d.depth));
    
    // Parse time to get min/max timestamps
    const timestamps = data.map(d => new Date(d.time).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    // Normalize data to 0-40 range
    const points = data.map(d => {
      const timeNorm = ((new Date(d.time).getTime() - minTime) / (maxTime - minTime || 1)) * 40;
      const ropNorm = ((d.rop - minROP) / (maxROP - minROP || 1)) * 40;
      const depthNorm = -((d.depth - minDepth) / (maxDepth - minDepth || 1)) * 40;
      
      return {
        position: [timeNorm, ropNorm, depthNorm],
        rop: d.rop,
        depth: d.depth,
        time: d.time
      };
    });
    
    // Create line connecting points
    const linePoints = points.map(p => p.position);
    
    // Axis information
    const axes = {
      minTime: new Date(minTime).toLocaleString(),
      maxTime: new Date(maxTime).toLocaleString(),
      minROP,
      maxROP,
      minDepth,
      maxDepth
    };
    
    return { points, linePoints, minROP, maxROP, axes };
  }, [data]);
  
  if (points.length === 0) {
    return (
      <Text position={[0, 0, 0]} fontSize={2} color="white">
        No Data Available
      </Text>
    );
  }
  
  return (
    <group>
      {/* Connecting line */}
      {linePoints.length > 1 && (
        <Line
          points={linePoints}
          color="white"
          lineWidth={1}
          opacity={0.3}
          transparent
        />
      )}
      
      {/* Data points */}
      {points.map((point, i) => (
        <mesh key={i} position={point.position}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial 
            color={getROPColor(point.rop, minROP, maxROP)}
            emissive={getROPColor(point.rop, minROP, maxROP)}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
      
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <pointLight position={[20, 20, 20]} intensity={1} />
      <pointLight position={[-20, -20, 20]} intensity={0.5} />
    </group>
  );
};

const Axes3D = () => {
  return (
    <group>
      {/* X-axis (Time - Red) */}
      <Line
        points={[[0, 0, 0], [45, 0, 0]]}
        color="red"
        lineWidth={2}
      />
      <Text position={[47, 0, 0]} fontSize={1.5} color="red">
        Time
      </Text>
      {[0, 10, 20, 30, 40].map(x => (
        <group key={x}>
          <mesh position={[x, -0.5, 0]}>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="red" />
          </mesh>
          <Text position={[x, -2, 0]} fontSize={0.8} color="white">
            {x}
          </Text>
        </group>
      ))}
      
      {/* Y-axis (ROP - Green) */}
      <Line
        points={[[0, 0, 0], [0, 45, 0]]}
        color="green"
        lineWidth={2}
      />
      <Text position={[0, 47, 0]} fontSize={1.5} color="green">
        ROP
      </Text>
      {[0, 10, 20, 30, 40].map(y => (
        <group key={y}>
          <mesh position={[-0.5, y, 0]}>
            <boxGeometry args={[0.5, 0.1, 0.1]} />
            <meshStandardMaterial color="green" />
          </mesh>
          <Text position={[-2.5, y, 0]} fontSize={0.8} color="white">
            {y}
          </Text>
        </group>
      ))}
      
      {/* Z-axis (Depth - Blue) */}
      <Line
        points={[[0, 0, 0], [0, 0, -45]]}
        color="blue"
        lineWidth={2}
      />
      <Text position={[0, 0, -47]} fontSize={1.5} color="blue">
        Depth
      </Text>
      {[0, -10, -20, -30, -40].map(z => (
        <group key={z}>
          <mesh position={[0, -0.5, z]}>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="blue" />
          </mesh>
          <Text position={[0, -2, z]} fontSize={0.8} color="white">
            {Math.abs(z)}
          </Text>
        </group>
      ))}
    </group>
  );
};

const Chart3DVisualization = ({ data }) => {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#0a0a0a' }}>
      <Canvas camera={{ position: [60, 40, 40], fov: 50 }}>
        <color attach="background" args={['#0a0a0a']} />
        <ScatterPlot3D data={data} />
        <Axes3D />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={150}
          minDistance={10}
        />
        <gridHelper args={[80, 80, '#333', '#222']} rotation={[0, 0, 0]} />
      </Canvas>
    </div>
  );
};

export default Chart3DVisualization;
