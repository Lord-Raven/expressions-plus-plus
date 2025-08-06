import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';

interface DepthPlaneProps {
  imageUrl: string;
  depthUrl: string;
  mousePosition: { x: number; y: number };
}

export const PARALLAX_STRENGTH: number = 0.03; // This is used to calculate some positions in other classes, too

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
  const { scale, position, canPanX, canPanY } = useMemo(() => {
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

    // Determine if we can pan in each axis (image is smaller than container)
    const canPanX = imageAspect > canvasAspect;
    const canPanY = imageAspect <= canvasAspect;

    // Position for "center bottom" - center horizontally, align to bottom
    const posX = 0; // Center horizontally
    const posY = 0; // Center vertically

    return {
      scale: [scaleX, scaleY, 1] as [number, number, number],
      position: [posX, posY, 0] as [number, number, number],
      canPanX,
      canPanY,
    };
  }, [colorMap, camera, size]);

  // Calculate panning offset based on mouse position and available space
  const panOffset = useMemo(() => {
    const panStrength = 0.3; // Adjust this value to control panning sensitivity
    
    return {
      x: canPanX ? mousePosition.x * panStrength : 0,
      y: canPanY ? mousePosition.y * panStrength : 0,
    };
  }, [mousePosition, canPanX, canPanY]);

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

        void main() {
          // Sample depth with better filtering
          float depth = texture2D(uDepthMap, vUv).r;
          
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
    if (shaderMaterial && meshRef.current) {
      shaderMaterial.uniforms.uMouse.value.set(mousePosition.x, mousePosition.y);
      
      // Apply panning offset to mesh position
      meshRef.current.position.set(
        position[0] + panOffset.x,
        position[1] + panOffset.y,
        position[2]
      );
    }
  });

  return (

    <mesh ref={meshRef} scale={scale} position={position}>
      <planeGeometry args={[1, 1, 128, 128]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
};
export default DepthPlane;