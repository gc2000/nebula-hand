
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyConfig } from '../types';
import { CELESTIAL_BODIES } from '../data';

interface ParticleSystemProps {
  expansion: number; // 0 (contracted/Planet) to 1 (expanded/Universe)
  rotationInfluence: { x: number, y: number };
  bodyConfig: CelestialBodyConfig;
}

// Simple pseudo-noise function
// Range: roughly -1.5 to 1.5
const noise = (x: number, y: number, z: number) => {
  return Math.sin(x * 12.0) * Math.cos(y * 12.0) * Math.sin(z * 12.0) +
         Math.sin(x * 4.0) * Math.sin(y * 4.0) * Math.cos(z * 4.0) * 0.5;
};

// Safe color retrieval helper
const getSafeColor = (colors: THREE.Color[], idx: number) => {
    if (!colors || colors.length === 0) return new THREE.Color(1, 1, 1);
    
    // Handle NaN or non-finite numbers which cause array access issues
    let safeIndex = idx;
    if (!Number.isFinite(safeIndex)) {
        safeIndex = 0;
    }

    safeIndex = Math.max(0, Math.min(Math.floor(safeIndex), colors.length - 1));
    const color = colors[safeIndex];
    
    // Double check existence to prevent 'reading clone of undefined'
    if (!color) return new THREE.Color(1, 1, 1);
    
    return color.clone();
};

const ParticleSystem: React.FC<ParticleSystemProps> = ({ expansion, rotationInfluence, bodyConfig }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const count = 64000;

  // Initialize geometries based on current bodyConfig
  const { initialPositions, targetPositions, colors, randoms } = useMemo(() => {
    const initPos = new Float32Array(count * 3);
    const targetPos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const rands = new Float32Array(count * 3);
    
    // --- HELPER TO SET COLOR ---
    const setColor = (i: number, color: THREE.Color) => {
       cols[i * 3] = color.r;
       cols[i * 3 + 1] = color.g;
       cols[i * 3 + 2] = color.b;
    };
    
    // --- GENERATION LOGIC ---
    
    if (bodyConfig.name === "Sun") {
       // === SOLAR SYSTEM VISUALIZATION ===
       // Reference layout: Sun -> Mercury -> Venus -> Earth -> Moon -> Mars -> Asteroids -> Jupiter -> Saturn -> Uranus -> Neptune -> Pluto
       
       const sunColors = bodyConfig.colors.map(c => new THREE.Color(c));
       const orbitColor = new THREE.Color(0.2, 0.4, 0.8); // Light Blue orbit lines
       const asteroidColor = new THREE.Color(0.5, 0.5, 0.5); // Grey/Rock

       // Partitioning the particles
       const sunCount = 20000;
       const orbitCount = 9000; 
       const asteroidCount = 8000;
       
       // Extended radii array to cover all bodies in CELESTIAL_BODIES (Sun excluded)
       // Mercury, Venus, Earth, Moon, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto (10 bodies)
       const radii = [6, 8, 10, 11, 14, 20, 26, 32, 38, 44]; 
       const planetList = CELESTIAL_BODIES.filter(b => b.name !== 'Sun');

       let currentIdx = 0;

       // 1. THE SUN (Central Sphere)
       for (let i = 0; i < sunCount; i++) {
          const r = 3.5; // Large Sun
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          
          // Turbulent surface
          const tx = r * Math.sin(phi) * Math.cos(theta);
          const ty = r * Math.cos(phi);
          const tz = r * Math.sin(phi) * Math.sin(theta);
          
          const n = noise(tx, ty, tz);
          const normN = (n + 1.5) / 3;
          const cIdx = normN * sunColors.length;
          let color = getSafeColor(sunColors, cIdx);
          if (Math.random() > 0.7) color.addScalar(0.2); // Glow

          targetPos[currentIdx * 3] = tx;
          targetPos[currentIdx * 3 + 1] = ty;
          targetPos[currentIdx * 3 + 2] = tz;
          setColor(currentIdx, color);
          currentIdx++;
       }

       // 2. ORBIT RINGS (Concentric Circles)
       for (let rIdx = 0; rIdx < radii.length; rIdx++) {
           const r = radii[rIdx];
           const particlesInRing = Math.floor(orbitCount / radii.length);
           for (let j = 0; j < particlesInRing; j++) {
               const theta = (j / particlesInRing) * Math.PI * 2;
               // Slight thickness to the line
               const jitter = (Math.random() - 0.5) * 0.1;
               
               targetPos[currentIdx * 3] = (r + jitter) * Math.cos(theta);
               targetPos[currentIdx * 3 + 1] = (Math.random() - 0.5) * 0.05; // Flat plane
               targetPos[currentIdx * 3 + 2] = (r + jitter) * Math.sin(theta);
               
               // Fade orbit lines based on angle for style
               const shade = 0.3 + Math.random() * 0.5;
               setColor(currentIdx, orbitColor.clone().multiplyScalar(shade));
               currentIdx++;
           }
       }

       // 3. ASTEROID BELT (Between Mars and Jupiter)
       for (let i = 0; i < asteroidCount; i++) {
           const rBase = 16;
           const rWidth = 3.0;
           const r = rBase + (Math.random() - 0.5) * rWidth;
           const theta = Math.random() * Math.PI * 2;
           
           targetPos[currentIdx * 3] = r * Math.cos(theta);
           targetPos[currentIdx * 3 + 1] = (Math.random() - 0.5) * 0.8; // Some vertical spread
           targetPos[currentIdx * 3 + 2] = r * Math.sin(theta);
           
           const c = asteroidColor.clone().multiplyScalar(0.5 + Math.random() * 0.5);
           setColor(currentIdx, c);
           currentIdx++;
       }

       // 4. PLANETS
       const particlesPerPlanet = Math.floor((count - currentIdx) / planetList.length);
       
       for (let p = 0; p < planetList.length; p++) {
           const planet = planetList[p];
           // Use modulo to safely access radii if list length mismatches (FIX for NaN)
           const orbitR = radii[p % radii.length];
           
           // Place planets at fixed random angles so they aren't all aligned
           const planetAngle = (p * 2.5) % (Math.PI * 2); 
           
           const cx = orbitR * Math.cos(planetAngle);
           const cz = orbitR * Math.sin(planetAngle);
           
           const pColors = planet.colors.map(c => new THREE.Color(c));
           const pRingColors = planet.ringColors ? planet.ringColors.map(c => new THREE.Color(c)) : [];

           for (let k = 0; k < particlesPerPlanet; k++) {
               if (currentIdx >= count) break;

               const isRing = planet.hasRings && k > particlesPerPlanet * 0.7;
               
               let px, py, pz;
               let col = new THREE.Color();

               if (isRing) {
                   const rInner = planet.radius * 0.15 * 1.4;
                   const rOuter = planet.radius * 0.15 * 2.2;
                   const rRing = rInner + Math.random() * (rOuter - rInner);
                   const thetaRing = Math.random() * Math.PI * 2;
                   
                   px = cx + rRing * Math.cos(thetaRing);
                   pz = cz + rRing * Math.sin(thetaRing);
                   py = (Math.random() - 0.5) * 0.05;

                   const cIdx = Math.floor(Math.random() * pRingColors.length);
                   col = getSafeColor(pRingColors, cIdx);
               } else {
                   const pr = planet.radius * 0.15; // Scale down for solar view
                   const theta = Math.random() * Math.PI * 2;
                   const phi = Math.acos(2 * Math.random() - 1);
                   
                   px = cx + pr * Math.sin(phi) * Math.cos(theta);
                   py = pr * Math.cos(phi);
                   pz = cz + pr * Math.sin(phi) * Math.sin(theta);
                   
                   // Simplified noise for mini planets
                   const n = noise(px, py, pz);
                   const cIdx = ((n + 1.5)/3) * pColors.length;
                   col = getSafeColor(pColors, cIdx);
               }

               targetPos[currentIdx * 3] = px;
               targetPos[currentIdx * 3 + 1] = py;
               targetPos[currentIdx * 3 + 2] = pz;
               setColor(currentIdx, col);
               currentIdx++;
           }
       }

       // Fill remaining with void
       while (currentIdx < count) {
           targetPos[currentIdx * 3] = 0;
           targetPos[currentIdx * 3+1] = 0;
           targetPos[currentIdx * 3+2] = 0;
           currentIdx++;
       }

    } else {
       // === SINGLE PLANET MODE ===
       const bodyColors = bodyConfig.colors.map(c => new THREE.Color(c));
       const ringColors = bodyConfig.ringColors ? bodyConfig.ringColors.map(c => new THREE.Color(c)) : [];
       
       const ringParticleCount = bodyConfig.hasRings ? Math.floor(count * 0.35) : 0;
       const bodyParticleCount = count - ringParticleCount;

       for (let i = 0; i < count; i++) {
         const i3 = i * 3;
         let tx, ty, tz;
         let color = new THREE.Color();
         const isRing = i >= bodyParticleCount;

         if (isRing && bodyConfig.hasRings) {
            // RING GENERATION
            const inner = bodyConfig.radius * 1.3;
            const outer = bodyConfig.radius * 2.2;
            const r = inner + Math.random() * (outer - inner);
            const theta = Math.random() * Math.PI * 2;
            tx = r * Math.cos(theta);
            tz = r * Math.sin(theta);
            ty = (Math.random() - 0.5) * 0.05;
            
            const normalizedR = (r - inner) / (outer - inner);
            const ringLen = ringColors.length;
            const cIdx = normalizedR * ringLen * 3; 
            color = getSafeColor(ringColors, ringLen > 0 ? cIdx % ringLen : 0);
            
            if (normalizedR > 0.6 && normalizedR < 0.65) {
                color.multiplyScalar(0.2); // Cassini gap
            }

         } else {
            // BODY SPHERE
            const r = bodyConfig.radius;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            tx = r * Math.sin(phi) * Math.cos(theta);
            ty = r * Math.cos(phi);
            tz = r * Math.sin(phi) * Math.sin(theta);

            // Coordinates for noise
            const nY = (ty / r + 1) / 2; // 0 to 1 (South to North)
            const nX = (Math.atan2(tz, tx) / (2 * Math.PI)) + 0.5; // 0 to 1
            
            if (bodyConfig.name === 'Earth') {
                // === REALISTIC EARTH GENERATION ===
                const lat = ty / r; // -1 to 1
                const absLat = Math.abs(lat);

                // 1. Continent Shape (Low Frequency)
                const nCont = noise(tx * 1.0, ty * 1.0, tz * 1.0); 

                // 2. Terrain Detail (High Frequency)
                const nDet = noise(tx * 5, ty * 5, tz * 5);

                // 3. Moisture/Climate (Determines Forest vs Desert)
                const nMoist = noise(tx * 2.0 + 100, ty * 2.0 + 100, tz * 2.0 + 100);

                // Combine for Terrain Height
                let h = nCont + nDet * 0.2; 

                // 4. Cloud Layer (Separate Noise)
                const nCloud = noise(tx * 3.5 + 50, ty * 3.5, tz * 3.5 + 50);

                // --- COLOR ASSIGNMENT ---
                
                // OCEAN LOGIC
                if (h < 0.05) {
                   const depth = h - 0.05; // Negative value
                   // Shallow water near coasts (h close to 0.05)
                   if (depth > -0.15) color = getSafeColor(bodyColors, 2); // Shallow (Teal)
                   else if (depth > -0.45) color = getSafeColor(bodyColors, 1); // Mid Ocean
                   else color = getSafeColor(bodyColors, 0); // Deep Ocean
                } else {
                   // LAND LOGIC
                   // Ice Caps
                   if (absLat > 0.85) {
                       color = getSafeColor(bodyColors, 6); // Ice
                   } else {
                       // Land Biomes
                       // High altitude (mountains) or low moisture
                       const isHigh = nDet > 0.4 || h > 0.6;
                       
                       if (isHigh) {
                           color = getSafeColor(bodyColors, 5); // Mountain/Brown
                       } else {
                           // Vegetation based on moisture
                           if (nMoist > 0.1) {
                                if (nMoist > 0.5) color = getSafeColor(bodyColors, 3); // Deep Forest
                                else color = getSafeColor(bodyColors, 4); // Grassland
                           } else {
                               // Arid / Savanna
                               if (nMoist < -0.3) color = getSafeColor(bodyColors, 5); // Desert
                               else color = getSafeColor(bodyColors, 4).lerp(new THREE.Color(bodyColors[5]), 0.5); // Mix
                           }
                       }
                   }
                }

                // ATMOSPHERE/CLOUDS
                // If cloud noise is high, overlay with white
                // Push radius out slightly for parallax
                if (nCloud > 0.55 && Math.random() > 0.1) {
                   color = getSafeColor(bodyColors, 6); // Cloud White
                   // Add transparency or brightness
                   const cloudHeight = 0.04; // Clouds float above
                   tx *= (1 + cloudHeight);
                   ty *= (1 + cloudHeight);
                   tz *= (1 + cloudHeight);
                }

            } else if (bodyConfig.name === 'Jupiter') {
                const bandFreq = 15;
                const turbulence = Math.sin(nX * 10) * 0.05;
                const bandVal = Math.cos((nY + turbulence) * bandFreq * Math.PI);
                const colorIdx = ((bandVal + 1) / 2) * bodyColors.length;
                color = getSafeColor(bodyColors, colorIdx);

            } else if (bodyConfig.name === 'Saturn') {
                const bandVal = Math.cos(nY * 20 * Math.PI);
                const colorIdx = ((bandVal + 1) / 2) * bodyColors.length;
                color = getSafeColor(bodyColors, colorIdx);

            } else if (bodyConfig.name === 'Mars') {
                const n = noise(tx*2, ty*2, tz*2);
                const normalizedN = Math.max(0, Math.min(1, (n + 1.5) / 3));
                const colorIdx = normalizedN * bodyColors.length;
                color = getSafeColor(bodyColors, colorIdx);

            } else {
                // Generic Planet/Moon
                const n = noise(tx, ty, tz);
                const normalizedN = Math.max(0, Math.min(1, (n + 1.5) / 3));
                const colorIdx = normalizedN * bodyColors.length;
                color = getSafeColor(bodyColors, colorIdx);
            }
         }
         
         targetPos[i3] = tx;
         targetPos[i3 + 1] = ty;
         targetPos[i3 + 2] = tz;
         setColor(i, color);
       }
    }

    // --- UNIVERSAL EXPLOSION (Same for all) ---
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const spread = 50;
        const spreadR = spread * Math.cbrt(Math.random());
        const spreadTheta = Math.random() * Math.PI * 2;
        const spreadPhi = Math.acos(2 * Math.random() - 1);

        initPos[i3] = spreadR * Math.sin(spreadPhi) * Math.cos(spreadTheta);
        initPos[i3 + 1] = spreadR * Math.sin(spreadPhi) * Math.sin(spreadTheta);
        initPos[i3 + 2] = spreadR * Math.cos(spreadPhi);
        
        rands[i3] = Math.random();
        rands[i3 + 1] = Math.random();
        rands[i3 + 2] = Math.random();
    }

    return {
      initialPositions: initPos,
      targetPositions: targetPos,
      colors: cols,
      randoms: rands
    };
  }, [bodyConfig]); // Re-run when bodyConfig changes

  const currentPositions = useMemo(() => new Float32Array(count * 3), [count]);
  
  // Re-initialize buffer when config changes
  useMemo(() => {
     for (let i = 0; i < count * 3; i++) {
        currentPositions[i] = initialPositions[i];
     }
  }, [initialPositions, currentPositions, count]);


  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

    const lerpSpeed = 0.08; 

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      const tX = expansion * initialPositions[i3] + (1 - expansion) * targetPositions[i3];
      const tY = expansion * initialPositions[i3 + 1] + (1 - expansion) * targetPositions[i3 + 1];
      const tZ = expansion * initialPositions[i3 + 2] + (1 - expansion) * targetPositions[i3 + 2];

      const noiseIntensity = expansion * 0.8 + (bodyConfig.type === 'star' && expansion < 0.1 ? 0.05 : 0.02);
      
      const nx = Math.sin(time * 0.5 + randoms[i3] * 100) * noiseIntensity * 0.2;
      const ny = Math.cos(time * 0.3 + randoms[i3 + 1] * 100) * noiseIntensity * 0.2;
      const nz = Math.sin(time * 0.5 + randoms[i3 + 2] * 100) * noiseIntensity * 0.2;

      positions[i3] += (tX + nx - positions[i3]) * lerpSpeed;
      positions[i3 + 1] += (tY + ny - positions[i3 + 1]) * lerpSpeed;
      positions[i3 + 2] += (tZ + nz - positions[i3 + 2]) * lerpSpeed;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
    
    // Rotation
    const baseRotationSpeed = (bodyConfig.name === 'Sun' ? 0.05 : 0.1) * delta;
    const handRotationX = rotationInfluence.x * 2.0 * delta; 
    const handRotationY = rotationInfluence.y * 1.0 * delta;

    pointsRef.current.rotation.y += baseRotationSpeed + handRotationX;
    pointsRef.current.rotation.x += handRotationY;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={currentPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06} 
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default ParticleSystem;
