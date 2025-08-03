import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';

interface DepthPlaneProps {
  imageUrl: string;
  depthUrl: string;
}

const DepthPlane = ({ imageUrl, depthUrl }: DepthPlaneProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const colorMap = useLoader(TextureLoader, imageUrl);
  const depthMap = useLoader(TextureLoader, depthUrl);

  // Calculate scale and position for object-fit: cover behavior
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
    if (imageAspect > canvasAspect) {
      // Image is wider than canvas, scale to fill height
      scaleY = visibleHeight;
      scaleX = scaleY * imageAspect;
    } else {
      // Image is taller than canvas, scale to fill width
      scaleX = visibleWidth;
      scaleY = scaleX / imageAspect;
    }

    // Position for "center bottom" - center horizontally, align to bottom
    const posX = 0; // Center horizontally
    const posY = -visibleHeight / 2 + scaleY / 2; // Align to bottom

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
          uDepthMap: { value: depthMap },
          uTime: { value: 0 },
        },
        vertexShader: `
      varying vec2 vUv;
      uniform sampler2D uDepthMap;

      void main() {
        vUv = uv;
        float depth = texture2D(uDepthMap, uv).r;
        vec3 displacedPosition = position + normal * depth * 0.3;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
      }
    `,
        fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uColorMap;

      void main() {
        gl_FragColor = texture2D(uColorMap, vUv);
      }
    `,
      }),
    [colorMap, depthMap]
  );

  useFrame(({ clock }) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} scale={scale} position={position}>
      <planeGeometry args={[1, 1, 128, 128]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
};

export default function DepthScene({ imageUrl, depthUrl }: DepthPlaneProps) {
  return (
    <Canvas
      style={{
        position: 'absolute',
        left: '0',
        bottom: '8vh',
        width: '100vw',
        height: '90vh',
        zIndex: 1,
      }}
      camera={{ position: [0, 0, 3], fov: 50 }}
    >
      <DepthPlane imageUrl={imageUrl} depthUrl={depthUrl} />
    </Canvas>
  );
}