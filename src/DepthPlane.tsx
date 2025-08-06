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
        precision mediump float;
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
          vec2 texelSize = 1.0 / vec2(textureSize(uDepthMap, 0));
          
          // Sample depth at current position
          float depth = texture2D(uDepthMap, vUv).r;
          
          // Calculate depth gradients for edge detection
          float depthRight = texture2D(uDepthMap, vUv + vec2(texelSize.x, 0.0)).r;
          float depthDown = texture2D(uDepthMap, vUv + vec2(0.0, texelSize.y)).r;
          float depthLeft = texture2D(uDepthMap, vUv - vec2(texelSize.x, 0.0)).r;
          float depthUp = texture2D(uDepthMap, vUv - vec2(0.0, texelSize.y)).r;
          
          // Calculate edge strength
          float edgeStrength = abs(depth - depthRight) + abs(depth - depthDown) + 
                              abs(depth - depthLeft) + abs(depth - depthUp);
          
          // Reduce parallax strength near edges
          float edgeFactor = 1.0 - smoothstep(0.1, 0.3, edgeStrength);
          float adjustedStrength = uParallaxStrength * edgeFactor;
          
          // Calculate parallax offset
          vec2 parallaxOffset = uMouse * depth * adjustedStrength;
          
          // Apply offset to UV coordinates
          vec2 offsetUV = clamp(vUv + parallaxOffset, 0.0, 1.0);
          
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