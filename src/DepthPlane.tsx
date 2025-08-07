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
          uDisplacementStrength: { value: 3 },
          uParallax: { value: new THREE.Vector2(0, 0) },
          uResolution: { value: new THREE.Vector2(1024, 1024) }, // Grid resolution
          uEdgeThreshold: { value: 0.1 }, // Threshold for edge detection
        },
        vertexShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uDepthMap;
        uniform float uDisplacementStrength;
        uniform vec2 uResolution;
        uniform float uEdgeThreshold;

        // Edge detection function
        float detectEdge(vec2 uv) {
          vec2 texelSize = 1.0 / uResolution;
          
          // Sample surrounding depths
          float center = texture2D(uDepthMap, uv).r;
          float left = texture2D(uDepthMap, uv - vec2(texelSize.x, 0.0)).r;
          float right = texture2D(uDepthMap, uv + vec2(texelSize.x, 0.0)).r;
          float up = texture2D(uDepthMap, uv - vec2(0.0, texelSize.y)).r;
          float down = texture2D(uDepthMap, uv + vec2(0.0, texelSize.y)).r;
          
          // Calculate gradients
          float gradX = abs(right - left);
          float gradY = abs(down - up);
          float gradient = sqrt(gradX * gradX + gradY * gradY);
          
          return smoothstep(uEdgeThreshold * 0.5, uEdgeThreshold, gradient);
        }

        // Bias vertex toward more suitable depth
        vec2 biasTowardBestDepth(vec2 uv) {
          vec2 texelSize = 1.0 / uResolution;
          vec2 offset = vec2(0.0);
          
          // Sample depths in a 3x3 neighborhood
          float depths[9];
          vec2 offsets[9];
          offsets[0] = vec2(-texelSize.x, -texelSize.y); depths[0] = texture2D(uDepthMap, uv + offsets[0]).r;
          offsets[1] = vec2(0.0, -texelSize.y); depths[1] = texture2D(uDepthMap, uv + offsets[1]).r;
          offsets[2] = vec2(texelSize.x, -texelSize.y); depths[2] = texture2D(uDepthMap, uv + offsets[2]).r;
          offsets[3] = vec2(-texelSize.x, 0.0); depths[3] = texture2D(uDepthMap, uv + offsets[3]).r;
          offsets[4] = vec2(0.0, 0.0); depths[4] = texture2D(uDepthMap, uv + offsets[4]).r;
          offsets[5] = vec2(texelSize.x, 0.0); depths[5] = texture2D(uDepthMap, uv + offsets[5]).r;
          offsets[6] = vec2(-texelSize.x, texelSize.y); depths[6] = texture2D(uDepthMap, uv + offsets[6]).r;
          offsets[7] = vec2(0.0, texelSize.y); depths[7] = texture2D(uDepthMap, uv + offsets[7]).r;
          offsets[8] = vec2(texelSize.x, texelSize.y); depths[8] = texture2D(uDepthMap, uv + offsets[8]).r;
          
          // Find the depth closest to center that would create faces pointing toward camera
          float centerDepth = depths[4];
          float bestScore = -1000.0;
          vec2 bestOffset = vec2(0.0);
          
          for(int i = 0; i < 9; i++) {
            // Calculate how much this depth would make triangles face the camera
            float depthDiff = depths[i] - centerDepth;
            
            // Bias toward depths that create forward-facing geometry
            // and are reasonably close to the original depth
            float faceScore = depthDiff * 2.0; // Prefer closer depths (higher values)
            float proximityScore = 1.0 - abs(depthDiff) * 4.0; // Prefer similar depths
            float totalScore = faceScore + proximityScore;
            
            if(totalScore > bestScore) {
              bestScore = totalScore;
              bestOffset = offsets[i] * 0.3; // Limit the offset strength
            }
          }
          
          return bestOffset;
        }

        void main() {
          vUv = uv;
          
          // Detect if we're near an edge
          float edgeStrength = detectEdge(uv);
          
          // Bias UV coordinates toward better depth values near edges
          vec2 biasedUv = uv;
          if(edgeStrength > 0.1) {
            vec2 bias = biasTowardBestDepth(uv);
            biasedUv += bias * edgeStrength;
            biasedUv = clamp(biasedUv, 0.0, 1.0);
          }
          
          // Sample depth with potentially biased coordinates
          float depth = texture2D(uDepthMap, biasedUv).r;
          
          // Create displaced position
          vec3 newPosition = position;
          
          // Apply horizontal offset based on bias (this helps align vertices with edges)
          newPosition.xy += (biasedUv - uv) * 2.0; // Scale factor to match world coordinates
          
          // Apply depth displacement
          newPosition.z -= (1.0 - depth) * uDisplacementStrength;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
        fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uColorMap;

        void main() {
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
      const panStrength = 5.5; // Adjust this to control how much the camera moves
      const panInnerStrength = 5; // Inner movement strength for subtlety
      camera.position.x = panX * panStrength;
      camera.position.y = panY * panStrength;
      
      // Keep camera looking at the center of the mesh
      const meshCenter = new THREE.Vector3(position[0] + panX * panInnerStrength, position[1] + panY * panInnerStrength, position[2]);
      camera.lookAt(meshCenter);
    }
  });

  return (
    <mesh ref={meshRef} scale={scale} position={position}>
      <planeGeometry args={[1, 1, 1024, 1024]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
};

export default DepthPlane;