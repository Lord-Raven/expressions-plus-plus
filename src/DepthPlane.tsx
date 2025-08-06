import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';

interface DepthPlaneProps {
  imageUrl: string;
  depthUrl: string;
  mousePosition: { x: number; y: number };
}

export const PARALLAX_STRENGTH: number = 0.1; // This is used to calculate some positions elsewhere

const DepthPlane = ({ imageUrl, depthUrl, mousePosition }: DepthPlaneProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const colorMap = useLoader(TextureLoader, imageUrl);
  const depthMap = useLoader(TextureLoader, depthUrl);
  depthMap.minFilter = THREE.NearestFilter; // Use nearest filtering for discrete steps
  depthMap.magFilter = THREE.NearestFilter; // Use nearest filtering for discrete steps

  // Calculate scale and position for object-fit: cover behavior with 5% crop
  const { scale, position } = useMemo(() => {
    const canvasAspect = size.width / size.height;
    const imageAspect = colorMap.image.width / colorMap.image.height;

    // Calculate the visible area at the mesh's z position
    const distance = Math.abs(camera.position.z);
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const visibleHeight = 2 * Math.tan(fov / 2) * distance;
    const visibleWidth = visibleHeight * canvasAspect;

    // Calculate scale for cover behavior (fill the most constrained dimension)
    let scaleX, scaleY;
    const cropFactor = 1.2; // Scale up by 20% to crop 10% from each side

    if (imageAspect > canvasAspect) {
      // Image is wider than canvas, scale to fill height + crop
      scaleY = visibleHeight * cropFactor;
      scaleX = scaleY * imageAspect;
    } else {
      // Image is taller than canvas, scale to fill width + crop
      scaleX = visibleWidth * cropFactor;
      scaleY = scaleX / imageAspect;
    }

    // Position for "center bottom" - center horizontally, align to bottom
    const posX = 0; // Center horizontally
    const posY = 0; // Center vertically

    return {
      scale: [scaleX, scaleY, 1] as [number, number, number],
      position: [posX, posY, 0] as [number, number, number],
    };
  }, [colorMap, camera, size]);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColorMap: { value: colorMap },
          uDepthMap: { value: depthMap},
          uMouse: { value: new THREE.Vector2(0, 0) },
          uParallaxStrength: { value: PARALLAX_STRENGTH },
        },
        vertexShader: `
        precision highp float;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uColorMap;
        uniform sampler2D uDepthMap;
        uniform vec2 uMouse;
        uniform float uParallaxStrength;

        void main() {
          // Sample depth with better filtering
          float depth = texture2D(uDepthMap, vUv).r;
          //float depthDx = dFdx(depth);
          //float depthDy = dFdy(depth);
          //float edgeStrength = length(vec2(depthDx, depthDy));
          //depth *= 1.0 - smoothstep(0.1, 0.4, edgeStrength);
          
          // Calculate parallax offset with reduced strength for smoother effect
          vec2 parallaxOffset = uMouse * depth * uParallaxStrength;
          
          // Apply offset to UV coordinates with clamping to prevent sampling outside texture
          vec2 offsetUV = clamp(vUv + parallaxOffset, 0.0, 1.0);
          
          // Sample color with linear filtering
          vec4 color = texture2D(uColorMap, offsetUV);
          
          gl_FragColor = color;
        }
      `,
      }),
    [colorMap, depthMap]
  );

  useFrame(() => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uMouse.value.set(mousePosition.x, mousePosition.y);
    }
  });

  return (
    <mesh ref={meshRef} scale={scale} position={position}>
      <planeGeometry args={[1, 1, 128, 128]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
};

export default function DepthScene({ imageUrl, depthUrl }: Omit<DepthPlaneProps, 'mousePosition'>) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Calculate position relative to the viewport
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      setMousePosition({ x, y });
    };

    // Add event listener to the entire document
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <Canvas
      style={{
        position: 'absolute',
        left: '0',
        bottom: '8vh',
        width: '100vw',
        height: '90vh',
        zIndex: 1,
        pointerEvents: 'none', // Allow events to pass through to elements below
      }}
      camera={{ position: [0, 0, 3], fov: 50 }}
    >
      <DepthPlane imageUrl={imageUrl} depthUrl={depthUrl} mousePosition={mousePosition} />
    </Canvas>
  );
}