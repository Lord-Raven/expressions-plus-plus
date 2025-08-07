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
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const { camera, size } = useThree();
  const colorMap = useLoader(TextureLoader, imageUrl);
  const depthMap = useLoader(TextureLoader, depthUrl);
  
  const NUM_LAYERS = 16;

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

  // Create materials for each depth layer
  const layerMaterials = useMemo(() => {
    const materials: THREE.ShaderMaterial[] = [];
    
    for (let i = 0; i < NUM_LAYERS; i++) {
      const depthThreshold = i / (NUM_LAYERS - 1); // 0 to 1
      const layerDepth = i * 0.1; // Spacing between layers
      
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uColorMap: { value: blurredColorMap },
          uDepthMap: { value: blurredDepthMap },
          uDepthThreshold: { value: depthThreshold },
          uDisplacementStrength: { value: 1.5 }, // Reduced for subtlety
          uLayerDepth: { value: layerDepth },
        },
        transparent: true,
        vertexShader: `
        precision highp float;
        varying vec2 vUv;
        varying float vDepth;
        uniform sampler2D uDepthMap;
        uniform float uDisplacementStrength;
        uniform float uLayerDepth;

        void main() {
          vUv = uv;
          
          // Sample depth at current vertex
          float currentDepth = texture2D(uDepthMap, uv).r;
          vDepth = currentDepth;
          
          vec3 newPosition = position;
          
          // Add subtle depth variation for smoother transitions
          float depthVariation = sin(uv.x * 10.0) * sin(uv.y * 10.0) * 0.1;
          newPosition.z -= (1.0 - currentDepth) * uDisplacementStrength + depthVariation;
          
          // Position this layer further back
          newPosition.z -= uLayerDepth;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
        `,
        fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        varying float vDepth;
        uniform sampler2D uColorMap;
        uniform float uDepthThreshold;

        void main() {
          // Only render pixels above the depth threshold
          if (vDepth < uDepthThreshold) {
            discard;
          }
          
          vec4 color = texture2D(uColorMap, vUv);
          
          // Add slight transparency for blending between layers
          float alpha = smoothstep(uDepthThreshold, uDepthThreshold + 0.1, vDepth);
          color.a *= alpha;
          
          gl_FragColor = color;
        }
        `,
      });
      
      materials.push(material);
    }
    
    return materials;
  }, [blurredColorMap, blurredDepthMap, NUM_LAYERS]);

  useFrame(() => {
    if (layerMaterials && meshRefs.current.length > 0) {
      // Move camera based on panX/panY
      const panStrength = 10; // Adjust this to control how much the camera moves
      const panInnerStrength = -2; // Inner movement strength for subtlety
      camera.position.x = panX * panStrength;
      camera.position.y = panY * panStrength;
      
      // Keep camera looking at the center of the mesh
      const meshCenter = new THREE.Vector3(position[0] + panX * panInnerStrength, position[1] + panY * panInnerStrength, position[2]);
      camera.lookAt(meshCenter);
      
      // Update positions for all layers
      meshRefs.current.forEach((mesh, index) => {
        if (mesh) {
          mesh.position.set(
            position[0],
            position[1], 
            position[2] - index * 0.1 // Layer spacing
          );
        }
      });
    }
  });

  return (
    <>
      {layerMaterials.map((material, index) => (
        <mesh 
          key={index}
          ref={(mesh) => {
            if (mesh) {
              meshRefs.current[index] = mesh;
            }
          }}
          scale={scale} 
          position={[position[0], position[1], position[2] - index * 0.1]}
        >
          <planeGeometry args={[1, 1, 1536, 640]} />
          <primitive object={material} attach="material" />
        </mesh>
      ))}
    </>
  );
};

export default DepthPlane;