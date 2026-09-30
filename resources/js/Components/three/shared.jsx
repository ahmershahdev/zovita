import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const PALETTE = {
    ink: '#0b1b33',
    snow: '#f7f5ef',
    mint: '#9ef0c2',
    coral: '#f0603f',
    teal: '#0f766e',
    tealLight: '#6ee7c8',
};

/** Soft studio reflections without shipping an HDR file. */
export function StudioEnvironment({ intensity = 0.04 }) {
    const { gl, scene } = useThree();
    useEffect(() => {
        const pmrem = new THREE.PMREMGenerator(gl);
        const env = pmrem.fromScene(new RoomEnvironment(), intensity).texture;
        scene.environment = env;
        return () => {
            scene.environment = null;
            env.dispose();
            pmrem.dispose();
        };
    }, [gl, scene, intensity]);
    return null;
}

/** Glossy lacquered-pill material. */
export function useGloss(color, options = {}) {
    const key = JSON.stringify(options);
    return useMemo(
        () =>
            new THREE.MeshPhysicalMaterial({
                color,
                roughness: 0.22,
                metalness: 0,
                clearcoat: 1,
                clearcoatRoughness: 0.12,
                sheen: 0.4,
                ...options,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [color, key],
    );
}

const capGeo = new THREE.SphereGeometry(0.42, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
const bodyGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.6, 40, 1, true);

/** Two-tone capsule built from hemispheres + open cylinders so the colour seam is crisp. */
export function Capsule({ a, b }) {
    const matA = useGloss(a);
    const matB = useGloss(b);
    return (
        <group>
            <mesh geometry={bodyGeo} material={matA} position={[0, 0.3, 0]} />
            <mesh geometry={capGeo} material={matA} position={[0, 0.6, 0]} />
            <mesh geometry={bodyGeo} material={matB} position={[0, -0.3, 0]} />
            <mesh geometry={capGeo} material={matB} position={[0, -0.6, 0]} rotation={[Math.PI, 0, 0]} />
        </group>
    );
}
