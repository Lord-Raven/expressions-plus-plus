import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';

interface DepthPlaneProps {
  imageUrl: string;
  depthUrl: string;
  mousePosition: { x: number; y: number };
}

export const PARALLAX_STRENGTH: number = 0.05; // This is used to calculate some positions elsewhere

const DepthPlane = ({ imageUrl, depthUrl, mousePosition }: DepthPlaneProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const colorMap = useLoader(TextureLoader, imageUrl);
  const depthMap = useLoader(TextureLoader, depthUrl);

  const blurredColorMap = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !colorMap.image) return colorMap;

    canvas.width = colorMap.image.width;
    canvas.height = colorMap.image.height;

    // Apply blur filter
    ctx.filter = 'blur(1px)';
    ctx.drawImage(colorMap.image, 0, 0);
    
    const blurredTexture = new THREE.CanvasTexture(canvas);
    blurredTexture.minFilter = THREE.LinearFilter;
    blurredTexture.magFilter = THREE.LinearFilter;
    blurredTexture.wrapS = THREE.ClampToEdgeWrapping;
    blurredTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    return blurredTexture;
  }, [colorMap]);

  const blurredDepthMap = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !depthMap.image) return depthMap;
    
    canvas.width = depthMap.image.width;
    canvas.height = depthMap.image.height;
    
    // Apply blur filter
    ctx.filter = 'blur(1px)';
    ctx.drawImage(depthMap.image, 0, 0);
    
    const blurredTexture = new THREE.CanvasTexture(canvas);
    blurredTexture.minFilter = THREE.LinearFilter;
    blurredTexture.magFilter = THREE.LinearFilter;
    blurredTexture.wrapS = THREE.ClampToEdgeWrapping;
    blurredTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    return blurredTexture;
  }, [depthMap]);

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
    const cropFactor = 1.2; // Scale up to crop

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
          uColorMap: { value: blurredColorMap },
          uDepthMap: { value: blurredDepthMap },
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

        vec2 reliefMapping(vec2 texCoords, vec2 viewDir) {
          // Number of depth layers for ray marching
          const float minLayers = 8.0;
          const float maxLayers = 32.0;
          float numLayers = mix(maxLayers, minLayers, abs(dot(vec2(0.0, 1.0), viewDir)));
          
          // Calculate layer depth
          float layerDepth = 1.0 / numLayers;
          float currentLayerDepth = 0.0;
          
          // Amount to shift the texture coordinates per layer
          vec2 P = viewDir * uParallaxStrength;
          vec2 deltaTexCoords = P / numLayers;
          
          // Initial values
          vec2 currentTexCoords = texCoords;
          float currentDepthMapValue = texture2D(uDepthMap, currentTexCoords).r;
          
          // Ray marching
          while(currentLayerDepth < currentDepthMapValue) {
            currentTexCoords -= deltaTexCoords;
            currentDepthMapValue = texture2D(uDepthMap, currentTexCoords).r;
            currentLayerDepth += layerDepth;
          }
          
          // Binary search for better precision
          vec2 prevTexCoords = currentTexCoords + deltaTexCoords;
          float afterDepth = currentDepthMapValue - currentLayerDepth;
          float beforeDepth = texture2D(uDepthMap, prevTexCoords).r - currentLayerDepth + layerDepth;
          
          float weight = afterDepth / (afterDepth - beforeDepth);
          vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);
          
          return finalTexCoords;
        }

        void main() {
          vec2 viewDir = normalize(uMouse);
          
          // Use relief mapping to find correct UV coordinates
          vec2 offsetUV = reliefMapping(vUv, viewDir);
          
          // Clamp to prevent sampling outside texture
          offsetUV = clamp(offsetUV, 0.0, 1.0);
          
          // Sample color
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