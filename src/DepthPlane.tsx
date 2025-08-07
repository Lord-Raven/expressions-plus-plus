import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';

interface DepthPlaneProps {
  imageUrl: string;
  depthUrl: string;
  panX: number;
  panY: number;
  parallaxX: number;
  parallaxY: number;
}

const DepthPlane = ({ imageUrl, depthUrl, panX, panY, parallaxX, parallaxY }: DepthPlaneProps) => {
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
    //ctx.filter = 'blur(0.5px)';
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
          uDisplacementStrength: { value: 3 }, // Control displacement intensity
          uParallax: { value: new THREE.Vector2(0, 0) }, // Keep for potential additional effects
        },
        vertexShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uDepthMap;
        uniform float uDisplacementStrength;

        void main() {
          vUv = uv;
          
          // Sample depth at current vertex
          float currentDepth = texture2D(uDepthMap, uv).r;
          
          // Calculate direction from center (0.5, 0.5) to current vertex
          vec2 centerToVertex = uv - vec2(0.5, 0.5);
          float distanceFromCenter = length(centerToVertex);
          vec2 directionFromCenter = normalize(centerToVertex);

          vec3 newPosition = position;
          newPosition.z -= (1.0 - currentDepth) * uDisplacementStrength;

          // Only process vertices that are not at the center
          if (distanceFromCenter > 0.001) {
            vec2 texelSize = 1.0 / vec2(1536.0, 640.0); // Match your geometry resolution
            
            // Sample neighboring depths for edge detection and smoothing
            float searchRadius = 2.0;
            vec2 searchDirection = directionFromCenter * texelSize * searchRadius;
            vec2 searchUV = clamp(uv + searchDirection, vec2(0.0), vec2(1.0));
            float searchDepth = texture2D(uDepthMap, searchUV).r;
            
            // Also sample perpendicular directions for smoothing
            vec2 perpendicular = vec2(-directionFromCenter.y, directionFromCenter.x);
            float leftDepth = texture2D(uDepthMap, clamp(uv + perpendicular * texelSize, vec2(0.0), vec2(1.0))).r;
            float rightDepth = texture2D(uDepthMap, clamp(uv - perpendicular * texelSize, vec2(0.0), vec2(1.0))).r;
            
            // Check for depth discontinuity
            float depthDiff = currentDepth - searchDepth;
            float edgeThreshold = 0.02;
            
            vec2 totalOffset = vec2(0.0);
            
            if (depthDiff < -edgeThreshold) {
              // Primary hiding: move vertex away from center to hide edge
              float hideAmount = abs(depthDiff) * 5.0;
              totalOffset += directionFromCenter * hideAmount * texelSize;
            } else {
              // Redistribution: smooth out gaps created by hidden vertices
              // Check if nearby vertices in the radial direction might be hidden
              vec2 innerUV = clamp(uv - searchDirection * 0.5, vec2(0.0), vec2(1.0));
              float innerDepth = texture2D(uDepthMap, innerUV).r;
              float innerSearchDepth = texture2D(uDepthMap, clamp(innerUV + searchDirection, vec2(0.0), vec2(1.0))).r;
              float innerDepthDiff = innerDepth - innerSearchDepth;
              
              if (innerDepthDiff < -edgeThreshold) {
                // Inner vertex is likely being hidden, so redistribute this vertex slightly inward
                float redistributeAmount = abs(innerDepthDiff) * 2.0;
                totalOffset -= directionFromCenter * redistributeAmount * texelSize * 0.5;
              }
              
              // Lateral smoothing based on neighboring depths
              float lateralVariation = abs(leftDepth - rightDepth);
              if (lateralVariation > edgeThreshold) {
                // Smooth out lateral discontinuities
                float smoothAmount = lateralVariation * 1.0;
                vec2 lateralDirection = (leftDepth > rightDepth) ? perpendicular : -perpendicular;
                totalOffset += lateralDirection * smoothAmount * texelSize * 0.3;
              }
            }
            
            // Apply gradual falloff based on distance from center
            float falloffFactor = smoothstep(0.8, 0.2, distanceFromCenter);
            totalOffset *= falloffFactor;
            
            newPosition.xy += totalOffset;
          }
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
        fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uColorMap;

        void main() {
          // Simple texture sampling - no parallax needed since displacement is in vertices
          vec4 color = texture2D(uColorMap, vUv);
          gl_FragColor = color;
        }
      `,
      }),
    [blurredColorMap, blurredDepthMap]
  );

  useFrame(() => {
    if (shaderMaterial && meshRef.current) {
      // You can animate displacement strength or other properties here
      
      // Keep mesh at its original position
      meshRef.current.position.set(
        position[0],
        position[1],
        position[2]
      );

      // Move camera based on panX/panY
      const panStrength = 10; // Adjust this to control how much the camera moves
      const panInnerStrength = -2; // Inner movement strength for subtlety
      camera.position.x = panX * panStrength;
      camera.position.y = panY * panStrength;
      
      // Keep camera looking at the center of the mesh
      const meshCenter = new THREE.Vector3(position[0] + panX * panInnerStrength, position[1] + panY * panInnerStrength, position[2]);
      camera.lookAt(meshCenter);
    }
  });

  return (
    <mesh ref={meshRef} scale={scale} position={position}>
      <planeGeometry args={[1, 1, 1536, 640]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
};

export default DepthPlane;