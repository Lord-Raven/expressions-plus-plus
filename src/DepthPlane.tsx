import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';

interface DepthPlaneProps {
  imageUrl: string;
  depthUrl: string;
}

export const DepthPlane = ({ imageUrl, depthUrl }: DepthPlaneProps) => {
  const meshRef = useRef();
  const colorMap = useLoader(TextureLoader, imageUrl);
  const depthMap = useLoader(TextureLoader, depthUrl);

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColorMap: { value: colorMap },
      uDepthMap: { value: depthMap },
      uTime: { value: 0 },
    },
    vertexShader: ` // Simplified displacement
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
  });

  useFrame(({ clock }) => {
    shaderMaterial.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh ref={meshRef} scale={[1, 1, 1]} position={[0, -8, 0]}>
      <planeGeometry args={[2, 2]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
};

export default function DepthScene({ imageUrl, depthUrl }: DepthPlaneProps) {
  return (
    <Canvas
      style={{
        position: 'absolute',
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