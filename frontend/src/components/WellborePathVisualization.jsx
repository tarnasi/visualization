import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';

const getROPColor = (rop, minROP, maxROP) => {
  if (maxROP === minROP) return new THREE.Color(0, 1, 0);
  
  const normalized = (rop - minROP) / (maxROP - minROP);
  
  if (normalized < 0.5) {
    // Blue to green
    const r = 0;
    const g = normalized * 2;
    const b = 1 - normalized * 2;
    return new THREE.Color(r, g, b);
  } else {
    // Green to red
    const r = (normalized - 0.5) * 2;
    const g = 1 - (normalized - 0.5) * 2;
    const b = 0;
    return new THREE.Color(r, g, b);
  }
};

const WellborePath = ({ data }) => {
  const { points, segments, depthMarkers, minROP, maxROP } = useMemo(() => {
    if (!data || data.length === 0) return { points: [], segments: [], depthMarkers: [], minROP: 0, maxROP: 0 };
    
    const minROP = Math.min(...data.map(d => d.rop));
    const maxROP = Math.max(...data.map(d => d.rop));
    const maxDepth = Math.max(...data.map(d => d.depth));
    
    // Create points along wellbore path (every 10th point for performance)
    const points = [];
    const segments = [];
    
    for (let i = 0; i < data.length; i += 10) {
      const point = data[i];
      const z = -(point.depth / maxDepth) * 40; // Normalize to -40 range
      points.push({
        position: [0, 0, z],
        rop: point.rop,
        depth: point.depth
      });
    }
    
    // Create segments with colors
    for (let i = 0; i < points.length - 1; i++) {
      segments.push({
        start: points[i].position,
        end: points[i + 1].position,
        color: getROPColor(points[i].rop, minROP, maxROP)
      });
    }
    
    // Create depth markers every 5 units
    const depthMarkers = [];
    for (let i = 0; i < points.length; i++) {
      if (i % 5 === 0) {
        depthMarkers.push({
          position: points[i].position,
          depth: points[i].depth
        });
      }
    }
    
    return { points, segments, depthMarkers, minROP, maxROP };
  }, [data]);
  
  if (points.length === 0) {
    return (
      <Text position={[0, 0, 0]} fontSize={1} color="white">
        No Data Available
      </Text>
    );
  }
  
  return (
    <group>
      {/* Wellbore path segments */}
      {segments.map((segment, i) => (
        <Line
          key={i}
          points={[segment.start, segment.end]}
          color={segment.color}
          lineWidth={3}
        />
      ))}
      
      {/* ROP spheres */}
      {points.map((point, i) => (
        <mesh key={i} position={point.position}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial 
            color={getROPColor(point.rop, minROP, maxROP)} 
            emissive={getROPColor(point.rop, minROP, maxROP)}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
      
      {/* Depth markers */}
      {depthMarkers.map((marker, i) => (
        <Text
          key={i}
          position={[2, 0, marker.position[2]]}
          fontSize={0.5}
          color="white"
          anchorX="left"
        >
          {marker.depth.toFixed(1)}m
        </Text>
      ))}
      
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
    </group>
  );
};

const ColorLegend = () => {
  return (
    <group position={[15, 0, 0]}>
      <Text position={[0, 5, 0]} fontSize={0.8} color="white">
        ROP (m/h)
      </Text>
      
      {/* Legend gradient */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((value, i) => {
        const color = value < 0.5
          ? new THREE.Color(0, value * 2, 1 - value * 2)
          : new THREE.Color((value - 0.5) * 2, 1 - (value - 0.5) * 2, 0);
        
        return (
          <group key={i} position={[0, 3 - i * 1.2, 0]}>
            <mesh position={[-1, 0, 0]}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
            </mesh>
            <Text position={[0.5, 0, 0]} fontSize={0.4} color="white" anchorX="left">
              {value === 0 ? 'Low' : value === 1 ? 'High' : ''}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

const WellborePathVisualization = ({ data }) => {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#0a0a0a' }}>
      <Canvas camera={{ position: [20, 10, 10], fov: 50 }}>
        <color attach="background" args={['#0a0a0a']} />
        <WellborePath data={data} />
        <ColorLegend />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={100}
          minDistance={5}
        />
        <gridHelper args={[50, 50, '#333', '#222']} />
      </Canvas>
    </div>
  );
};

export default WellborePathVisualization;
