import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  PerspectiveCamera,
  shaderMaterial,
  Float,
  Stars,
  Sparkles,
  useTexture,
  Text
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MathUtils } from 'three';
import * as random from 'maath/random';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// --- Dynamic media list generation (supports both .jpg and .mp4) ---
const TOTAL_NUMBERED_PHOTOS = 300;
// Generate paths - supports both .jpg and .mp4 files
// The system will automatically detect file type
const bodyPhotoPaths = [
  '/photos/top', // Will try top.jpg or top.mp4
  ...Array.from({ length: TOTAL_NUMBERED_PHOTOS }, (_, i) => `/photos/${i + 1}`) // Will try 1.jpg/1.mp4, 2.jpg/2.mp4, etc.
];

// --- Helper: Get file path with extension ---
const getMediaPath = (basePath: string, preferVideo: boolean = false): string => {
  // Try video first if preferVideo, otherwise try image first
  if (preferVideo) {
    return `${basePath}.mp4`;
  }
  return `${basePath}.jpg`;
};

// --- Visual Configuration ---
const CONFIG = {
  colors: {
    primary: '#FF69B4', // Hot pink
    secondary: '#BA55D3', // Medium orchid
    gold: '#FFD700',
    silver: '#ECEFF1',
    pink: '#FFB6C1', // Light pink
    purple: '#9370DB', // Medium purple
    white: '#FFFFFF',
    warmLight: '#FFB6C1',
    lights: ['#FF69B4', '#FF1493', '#BA55D3', '#9370DB', '#FFD700', '#FFB6C1'], // Birthday party lights
    // Polaroid border colors (pastel birthday theme)
    borders: ['#FFB6C1', '#FFC0CB', '#FFDAB9', '#E6E6FA', '#F0E68C', '#FFE4E1', '#FFF0F5'],
    // Birthday decoration colors
    decorationColors: ['#FF69B4', '#FF1493', '#BA55D3', '#9370DB', '#FFD700', '#FFB6C1', '#FFC0CB'],
    cakeColors: ['#FFB6C1', '#FFF0F5', '#FFD700']
  },
  counts: {
    foliage: 15000,
    ornaments: 300,   // Polaroid photo count
    elements: 200,    // Birthday decoration count
    lights: 400       // Party lights count
  },
  tree: { height: 22, radius: 9 }, // Tree dimensions
  photos: {
    body: bodyPhotoPaths // Base paths without extension (will detect .jpg or .mp4)
  }
};

// --- Photo Captions/Dates Configuration ---
// Add your captions and dates here! Index corresponds to photo index (0 = top.jpg, 1 = 1.jpg, etc.)
// Photo captions - all captions removed (empty)
const PHOTO_CAPTIONS: Array<{ caption?: string; date?: string }> = [
  ...Array.from({ length: TOTAL_NUMBERED_PHOTOS + 1 }, () => ({ caption: "", date: "" }))
];

// --- Shader Material (Foliage) ---
const FoliageMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color(CONFIG.colors.primary), uProgress: 0 },
  `uniform float uTime; uniform float uProgress; attribute vec3 aTargetPos; attribute float aRandom;
  varying vec2 vUv; varying float vMix;
  float cubicInOut(float t) { return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0; }
  void main() {
    vUv = uv;
    vec3 noise = vec3(sin(uTime * 1.5 + position.x), cos(uTime + position.y), sin(uTime * 1.5 + position.z)) * 0.15;
    float t = cubicInOut(uProgress);
    vec3 finalPos = mix(position, aTargetPos + noise, t);
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_PointSize = (60.0 * (1.0 + aRandom)) / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
    vMix = t;
  }`,
  `uniform vec3 uColor; varying float vMix;
  void main() {
    float r = distance(gl_PointCoord, vec2(0.5)); if (r > 0.5) discard;
    vec3 finalColor = mix(uColor * 0.3, uColor * 1.2, vMix);
    gl_FragColor = vec4(finalColor, 1.0);
  }`
);
extend({ FoliageMaterial });

// --- Helper: Tree Shape ---
const getTreePosition = () => {
  const h = CONFIG.tree.height; const rBase = CONFIG.tree.radius;
  const y = (Math.random() * h) - (h / 2); const normalizedY = (y + (h/2)) / h;
  const currentRadius = rBase * (1 - normalizedY); const theta = Math.random() * Math.PI * 2;
  const r = Math.random() * currentRadius;
  return [r * Math.cos(theta), y, r * Math.sin(theta)];
};

// --- Component: Foliage ---
const Foliage = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const materialRef = useRef<any>(null);
  const { positions, targetPositions, randoms } = useMemo(() => {
    const count = CONFIG.counts.foliage;
    const positions = new Float32Array(count * 3); const targetPositions = new Float32Array(count * 3); const randoms = new Float32Array(count);
    const spherePoints = random.inSphere(new Float32Array(count * 3), { radius: 25 }) as Float32Array;
    for (let i = 0; i < count; i++) {
      positions[i*3] = spherePoints[i*3]; positions[i*3+1] = spherePoints[i*3+1]; positions[i*3+2] = spherePoints[i*3+2];
      const [tx, ty, tz] = getTreePosition();
      targetPositions[i*3] = tx; targetPositions[i*3+1] = ty; targetPositions[i*3+2] = tz;
      randoms[i] = Math.random();
    }
    return { positions, targetPositions, randoms };
  }, []);
  useFrame((rootState, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = rootState.clock.elapsedTime;
      const targetProgress = state === 'FORMED' ? 1 : 0;
      materialRef.current.uProgress = MathUtils.damp(materialRef.current.uProgress, targetProgress, 1.5, delta);
    }
  });
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTargetPos" args={[targetPositions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
      </bufferGeometry>
      {/* @ts-ignore */}
      <foliageMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// --- Texture Cache (loads all media once and reuses) ---
const textureCache = new Map<string, THREE.Texture>();
const videoCache = new Map<string, HTMLVideoElement>();

const loadMediaTexture = async (basePath: string): Promise<THREE.Texture | null> => {
  // Check cache first
  if (textureCache.has(basePath)) {
    return textureCache.get(basePath)!;
  }

  const videoPath = `${basePath}.mp4`;
  const imagePath = `${basePath}.jpg`;

  return new Promise((resolve) => {
    // Try video first
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    
    const tryVideo = () => {
      video.src = videoPath;
      video.load();
      
      video.oncanplay = () => {
        video.play().then(() => {
          const videoTexture = new THREE.VideoTexture(video);
          videoTexture.minFilter = THREE.LinearFilter;
          videoTexture.magFilter = THREE.LinearFilter;
          textureCache.set(basePath, videoTexture);
          videoCache.set(basePath, video);
          resolve(videoTexture);
        }).catch(() => tryImage());
      };
      
      video.onerror = () => tryImage();
      
      // Timeout fallback
      setTimeout(() => {
        if (!textureCache.has(basePath)) tryImage();
      }, 2000);
    };
    
    const tryImage = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const imgTexture = new THREE.Texture(img);
        imgTexture.needsUpdate = true;
        textureCache.set(basePath, imgTexture);
        resolve(imgTexture);
      };
      img.onerror = () => {
        console.warn(`Failed to load media: ${imagePath}`);
        resolve(null);
      };
      img.src = imagePath;
    };
    
    tryVideo();
  });
};

// --- Hook: Load Media (Image or Video) ---
const useMediaTexture = (basePath: string) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Check cache first
    if (textureCache.has(basePath)) {
      setTexture(textureCache.get(basePath)!);
      return;
    }
    
    // Load new texture
    loadMediaTexture(basePath).then((loadedTexture) => {
      if (isMounted && loadedTexture) {
        setTexture(loadedTexture);
      }
    });
    
    return () => {
      isMounted = false;
    };
  }, [basePath]);

  return { texture };
};

// --- Component: Single Photo/Video Ornament ---
const MediaOrnament = ({ 
  basePath, 
  textureIndex, 
  state, 
  onPhotoClick, 
  caption, 
  geometry, 
  borderGeometry, 
  borderColor,
  scale,
  position,
  rotation,
  targetLookPos
}: {
  basePath: string;
  textureIndex: number;
  state: 'CHAOS' | 'FORMED';
  onPhotoClick?: (photoIndex: number) => void;
  caption?: { caption?: string; date?: string };
  geometry: THREE.PlaneGeometry;
  borderGeometry: THREE.PlaneGeometry;
  borderColor: string;
  scale: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  targetLookPos?: THREE.Vector3;
}) => {
  const { texture } = useMediaTexture(basePath);
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.rotation.copy(rotation);
      if (targetLookPos && state === 'FORMED') {
        groupRef.current.lookAt(targetLookPos);
      }
    }
  });
  
  if (!texture) return null;
  
  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* Front side */}
      <group position={[0, 0, 0.015]}>
        <mesh 
          geometry={geometry}
          onClick={(e) => {
            e.stopPropagation();
            if (onPhotoClick) {
              onPhotoClick(textureIndex);
            }
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
          }}
        >
          <meshStandardMaterial
            map={texture}
            roughness={0.5} 
            metalness={0}
            emissive={CONFIG.colors.white} 
            emissiveMap={texture} 
            emissiveIntensity={1.0}
            side={THREE.FrontSide}
          />
        </mesh>
        <mesh geometry={borderGeometry} position={[0, -0.15, -0.01]}>
          <meshStandardMaterial color={borderColor} roughness={0.9} metalness={0} side={THREE.FrontSide} />
        </mesh>
        {/* Photo Caption on Polaroid */}
        {caption && (caption.caption || caption.date) && state === 'FORMED' && (
          <Text
            position={[0, -0.6, 0.02]}
            fontSize={0.15}
            color="#333333"
            anchorX="center"
            anchorY="top"
            maxWidth={1.0}
          >
            {caption.caption || caption.date}
          </Text>
        )}
      </group>
      {/* Back side */}
      <group position={[0, 0, -0.015]} rotation={[0, Math.PI, 0]}>
        <mesh 
          geometry={geometry}
          onClick={(e) => {
            e.stopPropagation();
            if (onPhotoClick) {
              onPhotoClick(textureIndex);
            }
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
          }}
        >
          <meshStandardMaterial
            map={texture}
            roughness={0.5} 
            metalness={0}
            emissive={CONFIG.colors.white} 
            emissiveMap={texture} 
            emissiveIntensity={1.0}
            side={THREE.FrontSide}
          />
        </mesh>
        <mesh geometry={borderGeometry} position={[0, -0.15, -0.01]}>
          <meshStandardMaterial color={borderColor} roughness={0.9} metalness={0} side={THREE.FrontSide} />
        </mesh>
      </group>
    </group>
  );
};

// --- Component: Photo Ornaments (Double-Sided Polaroid) ---
const PhotoOrnaments = ({ state, onPhotoClick, captions, maxPhotos }: { 
  state: 'CHAOS' | 'FORMED'; 
  onPhotoClick?: (photoIndex: number) => void;
  captions?: Array<{ caption?: string; date?: string }>;
  maxPhotos?: number;
}) => {
  const count = maxPhotos !== undefined ? Math.min(maxPhotos, CONFIG.counts.ornaments) : CONFIG.counts.ornaments;
  const groupRef = useRef<THREE.Group>(null);

  const borderGeometry = useMemo(() => new THREE.PlaneGeometry(1.2, 1.5), []);
  const photoGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*70, (Math.random()-0.5)*70, (Math.random()-0.5)*70);
      const h = CONFIG.tree.height; const y = (Math.random() * h) - (h / 2);
      const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h/2)) / h)) + 0.5;
      const theta = Math.random() * Math.PI * 2;
      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));

      const isBig = Math.random() < 0.2;
      const baseScale = isBig ? 2.2 : 0.8 + Math.random() * 0.6;
      const weight = 0.8 + Math.random() * 1.2;
      const borderColor = CONFIG.colors.borders[Math.floor(Math.random() * CONFIG.colors.borders.length)];

      const rotationSpeed = {
        x: (Math.random() - 0.5) * 1.0,
        y: (Math.random() - 0.5) * 1.0,
        z: (Math.random() - 0.5) * 1.0
      };
      const chaosRotation = new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);

      // Assign photos in filename order (0=top, 1=1.jpg, 2=2.jpg, etc.)
      const textureIndex = i % bodyPhotoPaths.length;
      const basePath = bodyPhotoPaths[textureIndex];

      return {
        chaosPos, targetPos, scale: baseScale, weight,
        textureIndex,
        basePath,
        borderColor,
        currentPos: chaosPos.clone(),
        currentRotation: chaosRotation.clone(),
        chaosRotation,
        rotationSpeed,
        wobbleOffset: Math.random() * 10,
        wobbleSpeed: 0.5 + Math.random() * 0.5,
        targetLookPos: undefined as THREE.Vector3 | undefined
      };
    });
  }, [count]);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;

    data.forEach((objData, i) => {
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      objData.currentPos.lerp(target, delta * (isFormed ? 0.8 * objData.weight : 0.5));
      
      if (isFormed) {
        const wobbleX = Math.sin(time * objData.wobbleSpeed + objData.wobbleOffset) * 0.05;
        const wobbleZ = Math.cos(time * objData.wobbleSpeed * 0.8 + objData.wobbleOffset) * 0.05;
        objData.currentRotation = new THREE.Euler(wobbleX, 0, wobbleZ);
        objData.targetLookPos = new THREE.Vector3(objData.currentPos.x * 2, objData.currentPos.y + 0.5, objData.currentPos.z * 2);
      } else {
        objData.currentRotation = new THREE.Euler(
          objData.chaosRotation.x + time * objData.rotationSpeed.x,
          objData.chaosRotation.y + time * objData.rotationSpeed.y,
          objData.chaosRotation.z + time * objData.rotationSpeed.z
        );
        objData.targetLookPos = undefined;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <MediaOrnament
          key={i}
          basePath={obj.basePath}
          textureIndex={obj.textureIndex}
          state={state}
          onPhotoClick={onPhotoClick}
          caption={captions ? captions[obj.textureIndex] : undefined}
          geometry={photoGeometry}
          borderGeometry={borderGeometry}
          borderColor={obj.borderColor}
          scale={obj.scale}
          position={obj.currentPos}
          rotation={obj.currentRotation || (state === 'CHAOS' ? obj.chaosRotation : new THREE.Euler(0, 0, 0))}
          targetLookPos={obj.targetLookPos}
        />
      ))}
    </group>
  );
};

// --- Component: Birthday Decorations ---
const BirthdayDecorations = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const count = CONFIG.counts.elements;
  const groupRef = useRef<THREE.Group>(null);

  const boxGeometry = useMemo(() => new THREE.BoxGeometry(0.8, 0.8, 0.8), []);
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);
  const coneGeometry = useMemo(() => new THREE.ConeGeometry(0.3, 0.8, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
      const h = CONFIG.tree.height;
      const y = (Math.random() * h) - (h / 2);
      const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h/2)) / h)) * 0.95;
      const theta = Math.random() * Math.PI * 2;

      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));

      const type = Math.floor(Math.random() * 3);
      let color; let scale = 1;
      if (type === 0) { color = CONFIG.colors.decorationColors[Math.floor(Math.random() * CONFIG.colors.decorationColors.length)]; scale = 0.8 + Math.random() * 0.4; }
      else if (type === 1) { color = CONFIG.colors.decorationColors[Math.floor(Math.random() * CONFIG.colors.decorationColors.length)]; scale = 0.6 + Math.random() * 0.4; }
      else { color = Math.random() > 0.5 ? CONFIG.colors.pink : CONFIG.colors.white; scale = 0.7 + Math.random() * 0.3; }

      const rotationSpeed = { x: (Math.random()-0.5)*2.0, y: (Math.random()-0.5)*2.0, z: (Math.random()-0.5)*2.0 };
      return { type, chaosPos, targetPos, color, scale, currentPos: chaosPos.clone(), chaosRotation: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI), rotationSpeed };
    });
  }, [boxGeometry, sphereGeometry, coneGeometry]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      objData.currentPos.lerp(target, delta * 1.5);
      mesh.position.copy(objData.currentPos);
      mesh.rotation.x += delta * objData.rotationSpeed.x; mesh.rotation.y += delta * objData.rotationSpeed.y; mesh.rotation.z += delta * objData.rotationSpeed.z;
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => {
        let geometry; if (obj.type === 0) geometry = boxGeometry; else if (obj.type === 1) geometry = sphereGeometry; else geometry = coneGeometry;
        return ( <mesh key={i} scale={[obj.scale, obj.scale, obj.scale]} geometry={geometry} rotation={obj.chaosRotation}>
          <meshStandardMaterial color={obj.color} roughness={0.3} metalness={0.4} emissive={obj.color} emissiveIntensity={0.2} />
        </mesh> )})}
    </group>
  );
};

// --- Component: Fairy Lights ---
const FairyLights = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const count = CONFIG.counts.lights;
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(0.8, 8, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
      const h = CONFIG.tree.height; const y = (Math.random() * h) - (h / 2); const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h/2)) / h)) + 0.3; const theta = Math.random() * Math.PI * 2;
      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));
      const color = CONFIG.colors.lights[Math.floor(Math.random() * CONFIG.colors.lights.length)];
      const speed = 2 + Math.random() * 3;
      return { chaosPos, targetPos, color, speed, currentPos: chaosPos.clone(), timeOffset: Math.random() * 100 };
    });
  }, []);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      objData.currentPos.lerp(target, delta * 2.0);
      const mesh = child as THREE.Mesh;
      mesh.position.copy(objData.currentPos);
      const intensity = (Math.sin(time * objData.speed + objData.timeOffset) + 1) / 2;
      if (mesh.material) { (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isFormed ? 3 + intensity * 4 : 0; }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => ( <mesh key={i} scale={[0.15, 0.15, 0.15]} geometry={geometry}>
          <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0} toneMapped={false} />
        </mesh> ))}
    </group>
  );
};

// --- Component: Floating Hearts ---
const FloatingHearts = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const groupRef = useRef<THREE.Group>(null);
  const count = 50;
  
  const heartShape = useMemo(() => {
    const shape = new THREE.Shape();
    const x = 0, y = 0;
    shape.moveTo(x, y + 0.25);
    shape.bezierCurveTo(x, y, x - 0.25, y, x - 0.25, y + 0.25);
    shape.bezierCurveTo(x - 0.25, y + 0.5, x, y + 0.75, x, y + 1.0);
    shape.bezierCurveTo(x, y + 0.75, x + 0.25, y + 0.5, x + 0.25, y + 0.25);
    shape.bezierCurveTo(x + 0.25, y, x, y, x, y + 0.25);
    return shape;
  }, []);
  
  const heartGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
    });
  }, [heartShape]);
  
  const hearts = useMemo(() => {
    return Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 20;
      const height = -10 + Math.random() * 30;
      
      return {
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          0.3 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        rotation: new THREE.Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        scale: 0.3 + Math.random() * 0.4,
        color: CONFIG.colors.decorationColors[Math.floor(Math.random() * CONFIG.colors.decorationColors.length)],
        timeOffset: Math.random() * Math.PI * 2
      };
    });
  }, []);
  
  useFrame((stateObj, delta) => {
    if (!groupRef.current || state !== 'FORMED') return;
    
    const time = stateObj.clock.elapsedTime;
    
    hearts.forEach((heart, i) => {
      // Update position with floating motion
      heart.position.y += heart.velocity.y * delta;
      heart.position.x += Math.sin(time + heart.timeOffset) * 0.1 * delta;
      heart.position.z += Math.cos(time + heart.timeOffset) * 0.1 * delta;
      
      // Reset if too high
      if (heart.position.y > 30) {
        heart.position.y = -10;
      }
      
      // Update rotation
      heart.rotation.x += heart.rotationSpeed.x * delta;
      heart.rotation.y += heart.rotationSpeed.y * delta;
      heart.rotation.z += heart.rotationSpeed.z * delta;
      
      // Update mesh
      if (groupRef.current && groupRef.current.children[i]) {
        const mesh = groupRef.current.children[i] as THREE.Mesh;
        mesh.position.copy(heart.position);
        mesh.rotation.set(heart.rotation.x, heart.rotation.y, heart.rotation.z);
        mesh.scale.setScalar(heart.scale);
        
        // Pulsing glow
        const pulse = (Math.sin(time * 2 + heart.timeOffset) + 1) / 2;
        if (mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + pulse * 0.5;
        }
      }
    });
  });
  
  return (
    <group ref={groupRef} visible={state === 'FORMED'}>
      {hearts.map((heart, i) => (
        <mesh key={i} geometry={heartGeometry} position={heart.position}>
          <meshStandardMaterial
            color={heart.color}
            emissive={heart.color}
            emissiveIntensity={0.5}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
};

// --- Component: Fireworks ---
const Fireworks = ({ trigger }: { trigger: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const count = 8; // Number of firework bursts
  const particlesPerBurst = 100;
  
  const fireworkData = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 20 + Math.random() * 15;
      const height = 5 + Math.random() * 15;
      
      return {
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ),
        particles: Array.from({ length: particlesPerBurst }, () => {
          const particleAngle = Math.random() * Math.PI * 2;
          const particleElevation = (Math.random() - 0.5) * Math.PI;
          const speed = 5 + Math.random() * 5;
          
          return {
            position: new THREE.Vector3(0, 0, 0),
            velocity: new THREE.Vector3(
              Math.cos(particleAngle) * Math.cos(particleElevation) * speed,
              Math.sin(particleElevation) * speed,
              Math.sin(particleAngle) * Math.cos(particleElevation) * speed
            ),
            color: CONFIG.colors.decorationColors[Math.floor(Math.random() * CONFIG.colors.decorationColors.length)],
            life: 0,
            maxLife: 2 + Math.random()
          };
        })
      };
    });
  }, []);
  
  const particleGeometry = useMemo(() => new THREE.SphereGeometry(0.1, 8, 8), []);
  const timeRef = useRef(0);
  const activeRef = useRef(false);
  const prevTriggerRef = useRef(false);
  
  useEffect(() => {
    if (trigger && !prevTriggerRef.current) {
      activeRef.current = true;
      timeRef.current = 0;
      // Reset all particles
      fireworkData.forEach(firework => {
        firework.particles.forEach(particle => {
          particle.position.set(0, 0, 0);
          particle.life = 0;
        });
      });
    }
    prevTriggerRef.current = trigger;
  }, [trigger, fireworkData]);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    if (activeRef.current) {
      timeRef.current += delta;
      
      fireworkData.forEach((firework, fwIndex) => {
        firework.particles.forEach((particle, pIndex) => {
          // Apply gravity
          particle.velocity.y -= 9.8 * delta;
          
          // Update position relative to firework origin
          particle.position.add(particle.velocity.clone().multiplyScalar(delta));
          
          // Update life
          particle.life += delta;
          
          // Update mesh
          const meshIndex = fwIndex * particlesPerBurst + pIndex;
          if (groupRef.current && groupRef.current.children[meshIndex]) {
            const mesh = groupRef.current.children[meshIndex] as THREE.Mesh;
            // World position = firework position + particle offset
            const worldPos = firework.position.clone().add(particle.position);
            mesh.position.copy(worldPos);
            
            // Fade out
            const opacity = Math.max(0, 1 - (particle.life / particle.maxLife));
            if (mesh.material) {
              (mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
              (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = opacity * 2;
            }
          }
        });
      });
      
      // Stop after max life
      if (timeRef.current > 3) {
        activeRef.current = false;
      }
    }
  });
  
  return (
    <group ref={groupRef} visible={trigger || activeRef.current}>
      {fireworkData.map((firework, fwIndex) =>
        firework.particles.map((particle, pIndex) => {
          const meshIndex = fwIndex * particlesPerBurst + pIndex;
          return (
            <mesh
              key={`${fwIndex}-${pIndex}`}
              geometry={particleGeometry}
              position={firework.position}
            >
              <meshStandardMaterial
                color={particle.color}
                emissive={particle.color}
                emissiveIntensity={2}
                transparent
                opacity={1}
              />
            </mesh>
          );
        })
      )}
    </group>
  );
};

// --- Component: Confetti Explosion ---
const ConfettiExplosion = ({ trigger, position }: { trigger: boolean; position: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const count = 500; // Number of confetti pieces (increased from 200)
  const colors = ['#FF69B4', '#FF1493', '#BA55D3', '#9370DB', '#FFD700', '#FFB6C1', '#FFC0CB', '#FFFFFF'];
  
  const confettiData = useMemo(() => {
    return Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI * 0.6;
      const speed = 5 + Math.random() * 6; // Increased speed for bigger spread
      
      return {
        position: new THREE.Vector3(position[0], position[1], position[2]),
        velocity: new THREE.Vector3(
          Math.cos(angle) * Math.cos(elevation) * speed,
          Math.sin(elevation) * speed + 3, // Increased upward velocity
          Math.sin(angle) * Math.cos(elevation) * speed
        ),
        rotation: new THREE.Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        color: colors[Math.floor(Math.random() * colors.length)],
        scale: 0.4 + Math.random() * 0.6, // Increased scale (was 0.2-0.5, now 0.4-1.0)
        life: 0,
        maxLife: 4 + Math.random() * 3 // Longer life (was 3-5, now 4-7)
      };
    });
  }, [position]);
  
  const geometry = useMemo(() => new THREE.PlaneGeometry(0.4, 0.4), []); // Increased geometry size (was 0.2, now 0.4)
  
  const timeRef = useRef(0);
  const activeRef = useRef(false);
  const prevTriggerRef = useRef(false);
  
  useEffect(() => {
    if (trigger && !prevTriggerRef.current) {
      activeRef.current = true;
      timeRef.current = 0;
      // Reset all confetti to explosion point
      confettiData.forEach(confetti => {
        confetti.position.set(position[0], position[1], position[2]);
        confetti.life = 0;
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.3) * Math.PI * 0.6;
        const speed = 5 + Math.random() * 6; // Increased speed for bigger spread
        confetti.velocity.set(
          Math.cos(angle) * Math.cos(elevation) * speed,
          Math.sin(elevation) * speed + 3, // Increased upward velocity
          Math.sin(angle) * Math.cos(elevation) * speed
        );
      });
    }
    prevTriggerRef.current = trigger;
  }, [trigger, position, confettiData]);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    if (activeRef.current) {
      timeRef.current += delta;
      
      confettiData.forEach((confetti, i) => {
        // Apply gravity
        confetti.velocity.y -= 9.8 * delta;
        
        // Update position
        confetti.position.add(confetti.velocity.clone().multiplyScalar(delta));
        
        // Update rotation
        confetti.rotation.x += confetti.rotationSpeed.x * delta;
        confetti.rotation.y += confetti.rotationSpeed.y * delta;
        confetti.rotation.z += confetti.rotationSpeed.z * delta;
        
        // Update life
        confetti.life += delta;
        
        // Update mesh
        if (groupRef.current && groupRef.current.children[i]) {
          const mesh = groupRef.current.children[i] as THREE.Mesh;
          mesh.position.copy(confetti.position);
          mesh.rotation.set(confetti.rotation.x, confetti.rotation.y, confetti.rotation.z);
          mesh.scale.setScalar(confetti.scale);
          
          // Fade out
          const opacity = Math.max(0, 1 - (confetti.life / confetti.maxLife));
          if (mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
          }
        }
      });
      
      // Stop after max life
      if (timeRef.current > 7) { // Increased duration (was 5, now 7)
        activeRef.current = false;
      }
    }
  });
  
  return (
    <group ref={groupRef} visible={trigger || activeRef.current}>
      {confettiData.map((confetti, i) => (
        <mesh key={i} geometry={geometry} position={confetti.position}>
          <meshStandardMaterial
            color={confetti.color}
            transparent
            opacity={1}
            emissive={confetti.color}
            emissiveIntensity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// --- Component: Flying Photos (Star-like orbital motion) ---
const FlyingPhotos = ({ 
  state, 
  onPhotoClick, 
  captions 
}: { 
  state: 'CHAOS' | 'FORMED'; 
  onPhotoClick?: (photoIndex: number) => void;
  captions?: Array<{ caption?: string; date?: string }>;
}) => {
  const count = 20; // Number of flying photos
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  
  const photoGeometry = useMemo(() => new THREE.PlaneGeometry(0.8, 0.8), []);
  const borderGeometry = useMemo(() => new THREE.PlaneGeometry(1.0, 1.0), []);
  
  // Create orbital paths for each photo
  const orbits = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Different orbital parameters for each photo
      const radius = 40 + Math.random() * 30; // Distance from center
      const inclination = (Math.PI / 4) + (Math.random() - 0.5) * (Math.PI / 3); // Angle of orbit
      const phase = (i / count) * Math.PI * 2; // Starting phase
      const speed = 0.3 + Math.random() * 0.4; // Orbital speed
      const verticalSpeed = 0.1 + Math.random() * 0.2; // Vertical oscillation
      const verticalAmplitude = 5 + Math.random() * 10; // Vertical range
      
      // Select photos in filename order (cycling through sequentially)
      const textureIndex = i % bodyPhotoPaths.length;
      const basePath = bodyPhotoPaths[textureIndex];
      
      const borderColor = CONFIG.colors.borders[Math.floor(Math.random() * CONFIG.colors.borders.length)];
      const scale = 0.6 + Math.random() * 0.4;
      
      return {
        radius,
        inclination,
        phase,
        speed,
        verticalSpeed,
        verticalAmplitude,
        textureIndex,
        basePath,
        borderColor,
        scale,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.5,
          z: (Math.random() - 0.5) * 0.5
        }
      };
    });
  }, []);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    timeRef.current += delta;
    
    orbits.forEach((orbit, i) => {
      const child = groupRef.current?.children[i];
      if (!child) return;
      
      // Calculate orbital position
      const angle = orbit.phase + timeRef.current * orbit.speed;
      const x = Math.cos(angle) * orbit.radius * Math.cos(orbit.inclination);
      const z = Math.sin(angle) * orbit.radius * Math.cos(orbit.inclination);
      const y = Math.sin(timeRef.current * orbit.verticalSpeed) * orbit.verticalAmplitude;
      
      child.position.set(x, y, z);
      
      // Rotate photo to face center of scene
      child.lookAt(0, 0, 0);
      child.rotateY(Math.PI); // Flip to face outward
      // Add gentle rotation animation
      child.rotateX(orbit.rotationSpeed.x * timeRef.current * 0.5);
      child.rotateY(orbit.rotationSpeed.y * timeRef.current * 0.5);
      child.rotateZ(orbit.rotationSpeed.z * timeRef.current * 0.5);
    });
  });
  
  return (
    <group ref={groupRef} visible={state === 'FORMED'}>
      {orbits.map((orbit, i) => (
        <FlyingPhoto
          key={i}
          basePath={orbit.basePath}
          textureIndex={orbit.textureIndex}
          onPhotoClick={onPhotoClick}
          caption={captions ? captions[orbit.textureIndex] : undefined}
          geometry={photoGeometry}
          borderGeometry={borderGeometry}
          borderColor={orbit.borderColor}
          scale={orbit.scale}
        />
      ))}
    </group>
  );
};

// --- Component: Single Flying Photo ---
const FlyingPhoto = ({
  basePath,
  textureIndex,
  onPhotoClick,
  caption,
  geometry,
  borderGeometry,
  borderColor,
  scale
}: {
  basePath: string;
  textureIndex: number;
  onPhotoClick?: (photoIndex: number) => void;
  caption?: { caption?: string; date?: string };
  geometry: THREE.PlaneGeometry;
  borderGeometry: THREE.PlaneGeometry;
  borderColor: string;
  scale: number;
}) => {
  const { texture } = useMediaTexture(basePath);
  const groupRef = useRef<THREE.Group>(null);
  
  if (!texture) return null;
  
  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* Front side */}
      <group position={[0, 0, 0.01]}>
        <mesh 
          geometry={geometry}
          onClick={(e) => {
            e.stopPropagation();
            if (onPhotoClick) {
              onPhotoClick(textureIndex);
            }
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
          }}
        >
          <meshStandardMaterial
            map={texture}
            roughness={0.5}
            metalness={0}
            emissive={CONFIG.colors.white}
            emissiveMap={texture}
            emissiveIntensity={1.2}
            side={THREE.FrontSide}
          />
        </mesh>
        <mesh geometry={borderGeometry} position={[0, 0, -0.005]}>
          <meshStandardMaterial 
            color={borderColor} 
            roughness={0.9} 
            metalness={0} 
            side={THREE.FrontSide}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
      {/* Back side */}
      <group position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]}>
        <mesh 
          geometry={geometry}
          onClick={(e) => {
            e.stopPropagation();
            if (onPhotoClick) {
              onPhotoClick(textureIndex);
            }
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
          }}
        >
          <meshStandardMaterial
            map={texture}
            roughness={0.5}
            metalness={0}
            emissive={CONFIG.colors.white}
            emissiveMap={texture}
            emissiveIntensity={1.2}
            side={THREE.FrontSide}
          />
        </mesh>
        <mesh geometry={borderGeometry} position={[0, 0, -0.005]}>
          <meshStandardMaterial 
            color={borderColor} 
            roughness={0.9} 
            metalness={0} 
            side={THREE.FrontSide}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
    </group>
  );
};

// --- Component: Birthday Cake with Candle ---
const BirthdayCake = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const groupRef = useRef<THREE.Group>(null);
  const candlesRef = useRef<THREE.Group[]>([]);
  const sprinklesRef = useRef<THREE.Group>(null);

  // Multi-layer cake
  const cakeLayer1 = useMemo(() => new THREE.CylinderGeometry(1.8, 2.0, 0.8, 16), []);
  const cakeLayer2 = useMemo(() => new THREE.CylinderGeometry(1.4, 1.6, 0.8, 16), []);
  const cakeLayer3 = useMemo(() => new THREE.CylinderGeometry(1.0, 1.2, 0.6, 16), []);
  const frosting1 = useMemo(() => new THREE.CylinderGeometry(1.9, 2.1, 0.15, 16), []);
  const frosting2 = useMemo(() => new THREE.CylinderGeometry(1.5, 1.7, 0.15, 16), []);
  const frosting3 = useMemo(() => new THREE.CylinderGeometry(1.1, 1.3, 0.15, 16), []);
  const candleGeometry = useMemo(() => new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), []);
  const flameGeometry = useMemo(() => new THREE.ConeGeometry(0.12, 0.3, 8), []);
  const sprinkleGeometry = useMemo(() => new THREE.SphereGeometry(0.03, 6, 6), []);

  // Colorful cake layers
  const cakeMaterial1 = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFB6C1',
    roughness: 0.7,
    metalness: 0.1,
    emissive: '#FFB6C1',
    emissiveIntensity: 0.2,
  }), []);
  
  const cakeMaterial2 = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFC0CB',
    roughness: 0.7,
    metalness: 0.1,
    emissive: '#FFC0CB',
    emissiveIntensity: 0.2,
  }), []);

  const cakeMaterial3 = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFDAB9',
    roughness: 0.7,
    metalness: 0.1,
    emissive: '#FFDAB9',
    emissiveIntensity: 0.2,
  }), []);

  const frostingMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: CONFIG.colors.white,
    roughness: 0.2,
    metalness: 0.3,
    emissive: CONFIG.colors.white,
    emissiveIntensity: 0.5,
  }), []);

  const candleMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.5,
    metalness: 0.1,
  }), []);

  // Create multiple candles with different colors
  const candlePositions = useMemo(() => [
    { x: -0.3, z: 0, color: '#FF69B4' },
    { x: 0, z: 0, color: '#BA55D3' },
    { x: 0.3, z: 0, color: '#FFD700' },
  ], []);

  // Create sprinkles
  const sprinklePositions = useMemo(() => {
    const positions: Array<{ x: number; y: number; z: number; color: string }> = [];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const radius = 1.2 + Math.random() * 0.4;
      positions.push({
        x: Math.cos(angle) * radius,
        y: -0.2 + Math.random() * 1.0,
        z: Math.sin(angle) * radius,
        color: CONFIG.colors.decorationColors[Math.floor(Math.random() * CONFIG.colors.decorationColors.length)]
      });
    }
    return positions;
  }, []);

  useFrame((stateObj, delta) => {
    if (groupRef.current) {
      const targetScale = state === 'FORMED' ? 1 : 0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 3);
      groupRef.current.rotation.y += delta * 0.3;
      
      // Gentle floating animation
      const time = stateObj.clock.elapsedTime;
      groupRef.current.position.y = CONFIG.tree.height / 2 + 2 + Math.sin(time * 0.5) * 0.1;
    }

    // Animate candles
    if (state === 'FORMED') {
      const time = stateObj.clock.elapsedTime;
      candlesRef.current.forEach((candleGroup, i) => {
        if (candleGroup) {
          const offset = i * 0.5;
          candleGroup.rotation.z = Math.sin(time * 2 + offset) * 0.15;
          candleGroup.rotation.x = Math.cos(time * 1.5 + offset) * 0.1;
          
          // Flickering flame
          const flame = candleGroup.children.find(child => child.type === 'Mesh' && (child as THREE.Mesh).material === candleGroup.userData.flameMaterial);
          if (flame) {
            const intensity = 2.5 + Math.sin(time * 8 + offset) * 1.5;
            ((flame as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
            flame.scale.setScalar(1 + Math.sin(time * 6 + offset) * 0.2);
          }
        }
      });
    }

    // Rotate sprinkles
    if (sprinklesRef.current && state === 'FORMED') {
      sprinklesRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[0, CONFIG.tree.height / 2 + 2, 0]}>
      {/* Birthday Text */}
      {state === 'FORMED' && (
        <Text
          position={[0, 2.5, 0]}
          fontSize={0.8}
          color="#FF69B4"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#FFFFFF"
          fontWeight="bold"
        >
          Happy Birthday Bibub
        </Text>
      )}

      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.15}>
        {/* Cake Layer 1 (Bottom) */}
        <mesh geometry={cakeLayer1} material={cakeMaterial1} position={[0, -0.8, 0]} />
        <mesh geometry={frosting1} material={frostingMaterial} position={[0, -0.4, 0]} />
        
        {/* Cake Layer 2 (Middle) */}
        <mesh geometry={cakeLayer2} material={cakeMaterial2} position={[0, -0.1, 0]} />
        <mesh geometry={frosting2} material={frostingMaterial} position={[0, 0.3, 0]} />
        
        {/* Cake Layer 3 (Top) */}
        <mesh geometry={cakeLayer3} material={cakeMaterial3} position={[0, 0.7, 0]} />
        <mesh geometry={frosting3} material={frostingMaterial} position={[0, 1.0, 0]} />

        {/* Multiple Candles */}
        {candlePositions.map((pos, i) => {
          const flameMaterial = new THREE.MeshStandardMaterial({
            color: pos.color,
            emissive: '#FF4500',
            emissiveIntensity: 2.5,
            transparent: true,
            opacity: 0.9,
          });
          
          return (
            <group
              key={i}
              ref={(el) => {
                if (el) {
                  candlesRef.current[i] = el;
                  el.userData.flameMaterial = flameMaterial;
                }
              }}
              position={[pos.x, 1.4, pos.z]}
            >
              <mesh geometry={candleGeometry} material={candleMaterial} />
              <mesh geometry={flameGeometry} material={flameMaterial} position={[0, 0.45, 0]} />
            </group>
          );
        })}

        {/* Colorful Sprinkles */}
        <group ref={sprinklesRef}>
          {sprinklePositions.map((pos, i) => (
            <mesh
              key={i}
              geometry={sprinkleGeometry}
              position={[pos.x, pos.y, pos.z]}
            >
              <meshStandardMaterial
                color={pos.color}
                emissive={pos.color}
                emissiveIntensity={0.8}
              />
            </mesh>
          ))}
        </group>
      </Float>
    </group>
  );
};

// --- Main Scene Experience ---
const Experience = ({ sceneState, rotationSpeed, onPhotoClick, maxPhotos }: { sceneState: 'CHAOS' | 'FORMED', rotationSpeed: number, onPhotoClick?: (photoIndex: number) => void, maxPhotos?: number }) => {
  const controlsRef = useRef<any>(null);
  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() + rotationSpeed);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 60]} fov={45} />
      <OrbitControls ref={controlsRef} enablePan={false} enableZoom={true} minDistance={30} maxDistance={120} autoRotate={rotationSpeed === 0 && sceneState === 'FORMED'} autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 1.7} />

      <color attach="background" args={['#1a0033']} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0.3} fade speed={1} />
      <Environment preset="night" background={false} />

      <ambientLight intensity={0.4} color="#330033" />
      <pointLight position={[30, 30, 30]} intensity={100} color={CONFIG.colors.pink} />
      <pointLight position={[-30, 10, -30]} intensity={50} color={CONFIG.colors.purple} />
      <pointLight position={[0, -20, 10]} intensity={30} color={CONFIG.colors.warmLight} />

      <group position={[0, -6, 0]}>
        <Foliage state={sceneState} />
        <Suspense fallback={null}>
           <PhotoOrnaments state={sceneState} onPhotoClick={onPhotoClick} captions={PHOTO_CAPTIONS} maxPhotos={maxPhotos} />
           <BirthdayDecorations state={sceneState} />
           <FairyLights state={sceneState} />
           <BirthdayCake state={sceneState} />
        </Suspense>
        {/* Magic particles disabled for performance with 300 photos */}
        {/* <Sparkles count={600} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} /> */}
        <FloatingHearts state={sceneState} />
        <Suspense fallback={null}>
          <FlyingPhotos state={sceneState} onPhotoClick={onPhotoClick} captions={PHOTO_CAPTIONS} />
        </Suspense>
      </group>
      
      {/* Confetti Explosion from Cake */}
      <ConfettiExplosion 
        trigger={sceneState === 'FORMED'} 
        position={[0, CONFIG.tree.height / 2 + 4, 0]} 
      />
      
      {/* Fireworks Effect */}
      <Fireworks trigger={sceneState === 'FORMED'} />

      <EffectComposer>
        <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.1} intensity={1.5} radius={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.1} darkness={1.2} />
      </EffectComposer>
    </>
  );
};

// --- Gesture Controller ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GestureController = ({ onGesture, onMove, onStatus, debugMode }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let gestureRecognizer: GestureRecognizer;
    let requestRef: number;

    const setup = async () => {
      onStatus("DOWNLOADING AI...");
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        onStatus("REQUESTING CAMERA...");
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            onStatus("AI READY: SHOW HAND");
            predictWebcam();
          }
        } else {
            onStatus("ERROR: CAMERA PERMISSION DENIED");
        }
      } catch (err: any) {
        onStatus(`ERROR: ${err.message || 'MODEL FAILED'}`);
      }
    };

    const predictWebcam = () => {
      if (gestureRecognizer && videoRef.current && canvasRef.current) {
        if (videoRef.current.videoWidth > 0) {
            const results = gestureRecognizer.recognizeForVideo(videoRef.current, Date.now());
            const ctx = canvasRef.current.getContext("2d");
            if (ctx && debugMode) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                canvasRef.current.width = videoRef.current.videoWidth; canvasRef.current.height = videoRef.current.videoHeight;
                if (results.landmarks) for (const landmarks of results.landmarks) {
                        const drawingUtils = new DrawingUtils(ctx);
                        drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "#FFD700", lineWidth: 2 });
                        drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1 });
                }
            } else if (ctx && !debugMode) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            if (results.gestures.length > 0) {
              const name = results.gestures[0][0].categoryName; const score = results.gestures[0][0].score;
              if (score > 0.4) {
                 if (name === "Open_Palm") onGesture("CHAOS"); if (name === "Closed_Fist") onGesture("FORMED");
                 if (debugMode) onStatus(`DETECTED: ${name}`);
              }
              if (results.landmarks.length > 0) {
                const speed = (0.5 - results.landmarks[0][0].x) * 0.15;
                onMove(Math.abs(speed) > 0.01 ? speed : 0);
              }
            } else { onMove(0); if (debugMode) onStatus("AI READY: NO HAND"); }
        }
        requestRef = requestAnimationFrame(predictWebcam);
      }
    };
    setup();
    return () => cancelAnimationFrame(requestRef);
  }, [onGesture, onMove, onStatus, debugMode]);

  return (
    <>
      <video ref={videoRef} style={{ opacity: debugMode ? 0.6 : 0, position: 'fixed', top: 0, right: 0, width: debugMode ? '320px' : '1px', zIndex: debugMode ? 100 : -1, pointerEvents: 'none', transform: 'scaleX(-1)' }} playsInline muted autoPlay />
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, right: 0, width: debugMode ? '320px' : '1px', height: debugMode ? 'auto' : '1px', zIndex: debugMode ? 101 : -1, pointerEvents: 'none', transform: 'scaleX(-1)' }} />
    </>
  );
};

// --- Music Player Component ---
const MusicPlayer = ({ isPlaying, onToggle, autoPlay }: { isPlaying: boolean; onToggle: () => void; autoPlay: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5; // 50% volume
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && autoPlay) {
        audioRef.current.play().catch(err => {
          console.log('Auto-play prevented by browser. User interaction required.');
        });
      } else if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, autoPlay]);

  return (
    <>
      <audio ref={audioRef} src="/music/birthday-song.mp3" preload="auto" />
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '12px 20px',
          backgroundColor: isPlaying ? '#FF69B4' : 'rgba(0,0,0,0.5)',
          border: '1px solid #FF69B4',
          color: isPlaying ? '#000' : '#FF69B4',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          borderRadius: '8px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {isPlaying ? '🔊' : '🔇'} {isPlaying ? 'Music On' : 'Music Off'}
      </button>
    </>
  );
};

// --- Photo Viewer Modal ---
const PhotoViewer = ({ photoIndex, onClose, onNext, onPrev, totalPhotos, captions }: { 
  photoIndex: number | null; 
  onClose: () => void; 
  onNext: () => void;
  onPrev: () => void;
  totalPhotos: number;
  captions?: Array<{ caption?: string; date?: string }>;
}) => {
  // All hooks must be declared before any early returns
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'loading'>('loading');
  const [mediaSrc, setMediaSrc] = useState<string>('');
  const [mediaError, setMediaError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Calculate basePath - handle null case
  const basePath = photoIndex !== null 
    ? (bodyPhotoPaths[photoIndex] || (photoIndex === 0 ? '/photos/top' : `/photos/${photoIndex}`))
    : '';
  const photoCaption = photoIndex !== null && captions && captions[photoIndex] ? captions[photoIndex] : null;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (photoIndex === null) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoIndex, onClose, onNext, onPrev]);

  // Detect if file is video or image - try image first (most common)
  useEffect(() => {
    if (photoIndex === null || !basePath) {
      setMediaType('loading');
      setMediaSrc('');
      setMediaError(false);
      return;
    }
    
    setMediaType('loading');
    setMediaError(false);
    setMediaSrc('');
    const videoPath = `${basePath}.mp4`;
    const imagePath = `${basePath}.jpg`;
    
    // Try image first (most photos are images)
    const img = new Image();
    
    img.onload = () => {
      setMediaType('image');
      setMediaSrc(imagePath);
    };
    
    img.onerror = () => {
      // Image doesn't exist, try video
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      
      video.onloadedmetadata = () => {
        setMediaType('video');
        setMediaSrc(videoPath);
      };
      
      video.oncanplay = () => {
        setMediaType('video');
        setMediaSrc(videoPath);
      };
      
      video.onerror = () => {
        // Neither exists
        setMediaError(true);
        setMediaType('image'); // Default to image to show error message
        console.error('Media not found:', imagePath, 'or', videoPath);
      };
      
      video.src = videoPath;
      video.load();
    };
    
    img.src = imagePath;
  }, [photoIndex, basePath]);

  // Early return AFTER all hooks
  if (photoIndex === null) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Button */}
        {totalPhotos > 1 && (
          <button
            onClick={onPrev}
            style={{
              padding: '15px 20px',
              backgroundColor: 'rgba(255, 105, 180, 0.3)',
              border: '2px solid #FF69B4',
              color: '#FF69B4',
              fontSize: '24px',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}
          >
            ‹
          </button>
        )}

        {/* Photo or Video */}
        {mediaType === 'loading' ? (
          <div style={{
            width: '400px',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF69B4',
            fontSize: '18px'
          }}>
            Loading...
          </div>
        ) : mediaError ? (
          <div style={{
            width: '400px',
            height: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF69B4',
            fontSize: '16px',
            textAlign: 'center',
            gap: '10px'
          }}>
            <p>Media not found</p>
            <p style={{ fontSize: '12px', color: '#888' }}>
              Looking for: {basePath}.jpg or {basePath}.mp4
            </p>
          </div>
        ) : mediaType === 'video' && mediaSrc ? (
          <video
            key={mediaSrc}
            ref={videoRef}
            src={mediaSrc}
            autoPlay
            loop
            muted
            playsInline
            style={{
              maxWidth: '80vw',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: '10px',
              boxShadow: '0 0 50px rgba(255, 105, 180, 0.5)'
            }}
            onLoadedData={() => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
              }
            }}
            onError={() => {
              console.error('Video failed to load:', mediaSrc);
              setMediaError(true);
            }}
          />
        ) : mediaType === 'image' && mediaSrc ? (
          <img
            key={mediaSrc}
            src={mediaSrc}
            alt={`Memory ${photoIndex + 1}`}
            style={{
              maxWidth: '80vw',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: '10px',
              boxShadow: '0 0 50px rgba(255, 105, 180, 0.5)'
            }}
            onError={() => {
              console.error('Image failed to load:', mediaSrc);
              setMediaError(true);
            }}
          />
        ) : null}

        {/* Next Button */}
        {totalPhotos > 1 && (
          <button
            onClick={onNext}
            style={{
              padding: '15px 20px',
              backgroundColor: 'rgba(255, 105, 180, 0.3)',
              border: '2px solid #FF69B4',
              color: '#FF69B4',
              fontSize: '24px',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}
          >
            ›
          </button>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '10px 15px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '2px solid #FF69B4',
            color: '#FF69B4',
            fontSize: '20px',
            cursor: 'pointer',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}
        >
          ✕ Close
        </button>

        {/* Photo Counter */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#FF69B4',
            fontSize: '14px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '8px 16px',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)'
          }}
        >
          {photoIndex + 1} / {totalPhotos}
        </div>

        {/* Photo Caption and Date */}
        {photoCaption && (photoCaption.caption || photoCaption.date) && (
          <div
            style={{
              position: 'absolute',
              bottom: '70px',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              maxWidth: '80%',
              background: 'linear-gradient(135deg, rgba(255, 105, 180, 0.3), rgba(186, 85, 211, 0.3))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 105, 180, 0.5)',
              borderRadius: '15px',
              padding: '15px 25px',
              boxShadow: '0 0 30px rgba(255, 105, 180, 0.3)'
            }}
          >
            {photoCaption.caption && (
              <p
                style={{
                  color: '#FF69B4',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  margin: '0 0 5px 0',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                }}
              >
                {photoCaption.caption}
              </p>
            )}
            {photoCaption.date && (
              <p
                style={{
                  color: '#BA55D3',
                  fontSize: '14px',
                  margin: 0,
                  opacity: 0.9
                }}
              >
                {photoCaption.date}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Romantic Message Component ---
const RomanticMessage = ({ visible, message }: { visible: boolean; message: string }) => {
  const [show, setShow] = useState(false);
  const [opacity, setOpacity] = useState(0);
  
  useEffect(() => {
    if (visible) {
      setShow(true);
      setTimeout(() => setOpacity(1), 100);
      
      // Hide message after 5 seconds
      const hideTimer = setTimeout(() => {
        setOpacity(0);
        setTimeout(() => setShow(false), 500);
      }, 5000);
      
      return () => clearTimeout(hideTimer);
    } else {
      setOpacity(0);
      setTimeout(() => setShow(false), 500);
    }
  }, [visible]);
  
  if (!show) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        opacity: opacity,
        transition: 'opacity 0.5s ease-in-out',
        pointerEvents: 'none',
        textAlign: 'center',
        maxWidth: '80vw'
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 105, 180, 0.2), rgba(186, 85, 211, 0.2))',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(255, 105, 180, 0.5)',
          borderRadius: '20px',
          padding: '40px 60px',
          boxShadow: '0 0 50px rgba(255, 105, 180, 0.5)'
        }}
      >
        <p
          style={{
            fontSize: 'clamp(24px, 4vw, 48px)',
            color: '#FF69B4',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 105, 180, 0.5)',
            margin: 0,
            lineHeight: '1.4',
            fontFamily: 'serif'
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

// --- App Entry ---
export default function GrandTreeApp() {
  const [sceneState, setSceneState] = useState<'CHAOS' | 'FORMED'>('CHAOS');
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [aiStatus, setAiStatus] = useState("INITIALIZING...");
  const [debugMode, setDebugMode] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [detectedPhotoCount, setDetectedPhotoCount] = useState<number | null>(null);
  
  // Customize your romantic message here!
  const romanticMessage = "Every moment with you is a beautiful memory. Happy Birthday, my Bibub lope lope! 💕";
  
  // Auto-detect number of photos by checking which files exist
  useEffect(() => {
    let mounted = true;
    let checkedCount = 0;
    let foundCount = 0;
    const maxCheck = Math.min(500, TOTAL_NUMBERED_PHOTOS + 1); // Check up to 500 or configured max
    
    const checkPhoto = async (index: number): Promise<boolean> => {
      if (index === 0) {
        // Check top.jpg or top.mp4
        const topImagePath = '/photos/top.jpg';
        const topVideoPath = '/photos/top.mp4';
        
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => resolve(true);
            video.onerror = () => resolve(false);
            video.src = topVideoPath;
          };
          img.src = topImagePath;
        });
      } else {
        // Check numbered photos
        const imagePath = `/photos/${index}.jpg`;
        const videoPath = `/photos/${index}.mp4`;
        
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => resolve(true);
            video.onerror = () => resolve(false);
            video.src = videoPath;
          };
          img.src = imagePath;
        });
      }
    };
    
    const detectPhotos = async () => {
      let consecutiveMissing = 0;
      const maxConsecutiveMissing = 2; // Stop after 2 consecutive missing photos
      
      // Check photos sequentially
      for (let i = 0; i < maxCheck && mounted; i++) {
        const exists = await checkPhoto(i);
        if (exists) {
          foundCount = i + 1; // +1 because we found photo at index i
          consecutiveMissing = 0; // Reset counter
          
          // Update count as we find photos (for progressive display)
          if (mounted) {
            setDetectedPhotoCount(foundCount);
          }
        } else {
          consecutiveMissing++;
          // If we hit consecutive missing photos, stop checking
          if (consecutiveMissing >= maxConsecutiveMissing && i > 0) {
            break;
          }
        }
        checkedCount++;
      }
      
      if (mounted) {
        setDetectedPhotoCount(foundCount);
      }
    };
    
    detectPhotos();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  const totalPhotos = detectedPhotoCount !== null ? detectedPhotoCount : bodyPhotoPaths.length;

  // Auto-play music when tree forms (after user interaction)
  useEffect(() => {
    if (sceneState === 'FORMED' && hasUserInteracted && !isMusicPlaying) {
      setIsMusicPlaying(true);
    }
  }, [sceneState, hasUserInteracted]);

  const handleMusicToggle = () => {
    setHasUserInteracted(true);
    setIsMusicPlaying(!isMusicPlaying);
  };

  const handlePhotoClick = (photoIndex: number) => {
    setSelectedPhotoIndex(photoIndex);
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex + 1) % totalPhotos);
    }
  };

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex - 1 + totalPhotos) % totalPhotos);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Canvas dpr={[1, 2]} gl={{ toneMapping: THREE.ReinhardToneMapping }} shadows>
            <Experience sceneState={sceneState} rotationSpeed={rotationSpeed} onPhotoClick={handlePhotoClick} maxPhotos={detectedPhotoCount || undefined} />
        </Canvas>
      </div>
      <GestureController onGesture={setSceneState} onMove={setRotationSpeed} onStatus={setAiStatus} debugMode={debugMode} />
      <MusicPlayer isPlaying={isMusicPlaying} onToggle={handleMusicToggle} autoPlay={hasUserInteracted} />

      {/* UI - Stats */}
      <div style={{ position: 'absolute', bottom: '30px', left: '40px', color: '#888', zIndex: 10, fontFamily: 'sans-serif', userSelect: 'none' }}>
        <div style={{ marginBottom: '15px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Our Memories</p>
          <p style={{ fontSize: '24px', color: '#FF69B4', fontWeight: 'bold', margin: 0 }}>
            {detectedPhotoCount !== null ? detectedPhotoCount.toLocaleString() : '...'} <span style={{ fontSize: '10px', color: '#555', fontWeight: 'normal' }}>PHOTOS</span>
          </p>
        </div>
        {/* Magic Particles UI hidden */}
        {/* <div>
          <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Magic Particles</p>
          <p style={{ fontSize: '24px', color: '#BA55D3', fontWeight: 'bold', margin: 0 }}>
            {(CONFIG.counts.foliage / 1000).toFixed(0)}K <span style={{ fontSize: '10px', color: '#555', fontWeight: 'normal' }}>SPARKLES</span>
          </p>
        </div> */}
      </div>

      {/* UI - Buttons */}
      <div style={{ position: 'absolute', bottom: '30px', right: '40px', zIndex: 10, display: 'flex', gap: '10px' }}>
        <button onClick={() => setDebugMode(!debugMode)} style={{ padding: '12px 15px', backgroundColor: debugMode ? '#FF69B4' : 'rgba(0,0,0,0.5)', border: '1px solid #FF69B4', color: debugMode ? '#000' : '#FF69B4', fontFamily: 'sans-serif', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
           {debugMode ? 'HIDE DEBUG' : '🛠 DEBUG'}
        </button>
        <button onClick={() => setSceneState(s => s === 'CHAOS' ? 'FORMED' : 'CHAOS')} style={{ padding: '12px 30px', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255, 105, 180, 0.5)', color: '#FF69B4', fontFamily: 'serif', fontSize: '14px', fontWeight: 'bold', letterSpacing: '3px', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
           {sceneState === 'CHAOS' ? '🎂 Create Magic' : '✨ Disperse'}
        </button>
      </div>

      {/* UI - AI Status */}
      <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', color: aiStatus.includes('ERROR') ? '#FF0000' : 'rgba(255, 105, 180, 0.6)', fontSize: '10px', letterSpacing: '2px', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
        {aiStatus}
      </div>

      {/* Photo Viewer Modal */}
      <PhotoViewer
        photoIndex={selectedPhotoIndex}
        onClose={() => setSelectedPhotoIndex(null)}
        onNext={handleNextPhoto}
        onPrev={handlePrevPhoto}
        totalPhotos={totalPhotos}
        captions={PHOTO_CAPTIONS}
      />

      {/* Romantic Message */}
      <RomanticMessage 
        visible={sceneState === 'FORMED'} 
        message={romanticMessage}
      />
    </div>
  );
}