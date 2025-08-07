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
          uDepthMap: { value: depthMap },
          uDisplacementStrength: { value: 3 },
          uEdgeThreshold: { value: 0.1 },
          uEdgeDisplacementMultiplier: { value: 2.0 },
          uTexelSize: { value: new THREE.Vector2(1.0 / depthMap.image.width, 1.0 / depthMap.image.height) },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
        },
        vertexShader: `
        precision highp float;
        varying vec2 vUv;
        varying vec4 vScreenPos;
        uniform sampler2D uDepthMap;
        uniform float uDisplacementStrength;
        uniform float uEdgeThreshold;
        uniform float uEdgeDisplacementMultiplier;
        uniform vec2 uTexelSize;

        float sampleDepth(vec2 uv) {
          return texture2D(uDepthMap, uv).r;
        }

        float detectEdge(vec2 uv) {
          // Sobel edge detection
          float tl = sampleDepth(uv + vec2(-uTexelSize.x, -uTexelSize.y));
          float tm = sampleDepth(uv + vec2(0.0, -uTexelSize.y));
          float tr = sampleDepth(uv + vec2(uTexelSize.x, -uTexelSize.y));
          float ml = sampleDepth(uv + vec2(-uTexelSize.x, 0.0));
          float mr = sampleDepth(uv + vec2(uTexelSize.x, 0.0));
          float bl = sampleDepth(uv + vec2(-uTexelSize.x, uTexelSize.y));
          float bm = sampleDepth(uv + vec2(0.0, uTexelSize.y));
          float br = sampleDepth(uv + vec2(uTexelSize.x, uTexelSize.y));

          float sobelX = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
          float sobelY = (tl + 2.0 * tm + tr) - (bl + 2.0 * bm + br);
          
          return sqrt(sobelX * sobelX + sobelY * sobelY);
        }

        void main() {
          vUv = uv;
          
          float depth = sampleDepth(uv);
          float edgeStrength = detectEdge(uv);
          float edgeMultiplier = 1.0 + smoothstep(uEdgeThreshold * 0.5, uEdgeThreshold, edgeStrength) * uEdgeDisplacementMultiplier;
          
          vec3 newPosition = position;
          newPosition.z -= (1.0 - depth) * uDisplacementStrength * edgeMultiplier;

          vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
          vScreenPos = projectionMatrix * mvPosition;
          gl_Position = vScreenPos;
        }
      `,
        fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        varying vec4 vScreenPos;
        uniform sampler2D uColorMap;
        uniform vec2 uResolution;

        void main() {
          // Use screen space coordinates for texture sampling to reduce stretching
          vec2 screenUV = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;
          
          // Blend between original UV and screen-space UV based on depth
          vec2 finalUV = mix(vUv, screenUV, 0.3);
          
          vec4 color = texture2D(uColorMap, finalUV);
          gl_FragColor = color;
        }
      `,
      }),
    [blurredColorMap, depthMap, size]
  );

  useFrame(() => {
    if (shaderMaterial && meshRef.current) {
      // You can animate displacement strength or other properties here
      // shaderMaterial.uniforms.uDisplacementStrength.value = Math.sin(Date.now() * 0.001) * 0.5 + 0.5;
      
      // Keep mesh at its original position
      meshRef.current.position.set(
        position[0],
        position[1],
        position[2]
      );

      // Move camera based on panX/panY
      const panStrength = 6; // Adjust this to control how much the camera moves
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