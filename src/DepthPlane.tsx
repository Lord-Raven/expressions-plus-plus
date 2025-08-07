import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';

interface DepthPlaneProps {
  imageUrl: string;
  depthUrl: string;
  panX: number;
  panY: number;
}

const DepthPlane = ({ imageUrl, depthUrl, panX, panY }: DepthPlaneProps) => {
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
    ctx.filter = 'blur(0.5px)';
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
    ctx.filter = 'blur(0.5px)';
    ctx.drawImage(depthMap.image, 0, 0);
    
    const blurredTexture = new THREE.CanvasTexture(canvas);
    blurredTexture.minFilter = THREE.NearestFilter;
    blurredTexture.magFilter = THREE.NearestFilter;
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
          uParallax: { value: new THREE.Vector2(0, 0) },
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
          uniform vec2 uParallax;

          const int MAX_STEPS = 32;
          const float DEPTH_SCALE = 0.08;
          const float MIN_STEP_SIZE = 0.005;
          const float MAX_STEP_SIZE = 0.02;

          void main() {
            vec2 startUV = vUv;
            vec2 rayDirection = normalize(uParallax);
            float rayLength = length(uParallax);
            
            // Start from the surface and march inward
            vec2 currentUV = startUV;
            vec4 finalColor = vec4(0.0);
            float totalWeight = 0.0;
            
            // March through the depth layers
            for (int i = 0; i < MAX_STEPS; i++) {
              if (currentUV.x < 0.0 || currentUV.x > 1.0 || currentUV.y < 0.0 || currentUV.y > 1.0) {
                break;
              }
              
              // Sample the depth at current position
              float depth = texture2D(uDepthMap, currentUV).r;
              
              // Convert depth to parallax displacement
              // Inverted: 0 (black) = near, 1 (white) = far
              float parallaxAmount = (1.0 - depth) * DEPTH_SCALE;
              
              // Calculate step size based on depth (smaller steps for near objects)
              float stepSize = mix(MIN_STEP_SIZE, MAX_STEP_SIZE, depth);
              
              // Sample color at current position
              vec4 color = texture2D(uColorMap, currentUV);
              
              // Weight based on depth and step (near objects contribute more)
              float weight = (1.0 - depth) * stepSize;
              
              finalColor += color * weight;
              totalWeight += weight;
              
              // Move to next position along ray
              currentUV += rayDirection * stepSize * rayLength;
            }
            
            // Normalize by total weight and add fallback
            if (totalWeight > 0.0) {
              finalColor /= totalWeight;
            } else {
              // Fallback to simple parallax if ray marching fails
              vec2 fallbackUV = startUV + uParallax * 0.02;
              fallbackUV = clamp(fallbackUV, 0.0, 1.0);
              finalColor = texture2D(uColorMap, fallbackUV);
            }
            
            gl_FragColor = finalColor;
          }
      `,
      }),
    [colorMap, depthMap]
  );

  useFrame(() => {
    if (shaderMaterial && meshRef.current) {
      // Increase the parallax sensitivity for better depth perception
      shaderMaterial.uniforms.uParallax.value.set(panX * 1.0, panY * 1.0);
      
      // Apply panning offset to mesh position (reduced for more subtle movement)
      meshRef.current.position.set(
        position[0] + panX * 3,
        position[1] + -panY * 3,
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