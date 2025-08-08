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
    ctx.filter = 'blur(2px)';
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

          const int MAX_STEPS = 16;
          const float DEPTH_SCALE = 0.1;
          const float BLUR_STRENGTH = 1.5;
          const float FOCUS_DEPTH = 0.8; // Objects at this depth will be in focus

          // Simple box blur function
          vec4 blur(sampler2D tex, vec2 uv, float blurRadius) {
            vec4 color = vec4(0.0);
            float total = 0.0;
            
            // 3x3 blur kernel
            for (int x = -1; x <= 1; x++) {
              for (int y = -1; y <= 1; y++) {
                vec2 offset = vec2(float(x), float(y)) * blurRadius;
                vec2 sampleUV = uv + offset;
                
                // Only sample if within bounds
                if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && 
                    sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
                  color += texture2D(tex, sampleUV);
                  total += 1.0;
                }
              }
            }
            
            return color / total;
          }

          void main() {
            vec2 currentUV = vUv;
            vec2 parallaxOffset = uParallax;
            
            // Iterative parallax mapping to find the correct depth layer
            for (int i = 0; i < MAX_STEPS; i++) {
              // Sample depth at current position
              float depth = texture2D(uDepthMap, currentUV).r;
              
              // Calculate parallax displacement based on depth
              float heightAtUV = depth * DEPTH_SCALE;
              
              // Calculate new UV position
              vec2 offset = parallaxOffset * heightAtUV;
              currentUV = vUv + offset;
              
              // Clamp to texture bounds
              currentUV = clamp(currentUV, 0.0, 1.0);
              
              // Check if we've found the right depth layer
              float newDepth = texture2D(uDepthMap, currentUV).r;
              if (abs(newDepth - depth) < 0.01) {
                break; // Converged
              }
            }
            
            // Sample depth for depth-of-field calculation
            float finalDepth = texture2D(uDepthMap, currentUV).r;
            
            // Calculate blur amount based on distance from focus depth
            float depthDifference = abs(finalDepth - FOCUS_DEPTH);
            float blurAmount = depthDifference * BLUR_STRENGTH;
            
            // Calculate blur radius in texture space
            float blurRadius = blurAmount * 0.002; // Fixed blur radius
            
            // Sample color with or without blur based on depth
            vec4 color;
            if (blurRadius > 0.001) {
              color = blur(uColorMap, currentUV, blurRadius);
            } else {
              color = texture2D(uColorMap, currentUV);
            }
            
            gl_FragColor = color;
          }
      `,
      }),
    [blurredColorMap, blurredDepthMap]
  );

  useFrame(() => {
    if (shaderMaterial && meshRef.current) {
      // Increase the parallax sensitivity for better depth perception
      shaderMaterial.uniforms.uParallax.value.set(panX, panY);
      
      // Apply panning offset to mesh position (reduced for more subtle movement)
      meshRef.current.position.set(
        position[0] + panX * 10,
        position[1] + -panY * 10,
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