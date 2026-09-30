import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Capsule, PALETTE, StudioEnvironment, useGloss } from './shared';

const PAIRS = 22;
const RADIUS = 1.35;
const RISE = 0.34;

/** Double helix of capsules — a DNA strand made of medicine. Spins slowly and leans towards the pointer. */
function Helix({ reducedMotion }) {
    const group = useRef();
    const { pointer } = useThree();
    const rung = useGloss(PALETTE.snow, { roughness: 0.5, clearcoat: 0.3, transparent: true, opacity: 0.35 });
    const rungGeo = useMemo(() => new THREE.CylinderGeometry(0.035, 0.035, RADIUS * 2, 8), []);

    const pairs = useMemo(
        () =>
            Array.from({ length: PAIRS }, (_, i) => {
                const angle = i * 0.52;
                const y = (i - PAIRS / 2) * RISE;
                return { i, angle, y, colors: i % 3 === 0 ? [PALETTE.coral, PALETTE.snow] : i % 2 ? [PALETTE.mint, PALETTE.snow] : [PALETTE.tealLight, PALETTE.ink] };
            }),
        [],
    );

    useFrame((state, delta) => {
        const g = group.current;
        if (!reducedMotion) g.rotation.y += delta * 0.25;
        g.rotation.z = THREE.MathUtils.damp(g.rotation.z, 0.35 + pointer.x * 0.15, 3, delta);
        g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -pointer.y * 0.2, 3, delta);
        g.position.y = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.4) * 0.15;
    });

    return (
        <group position={[1.9, 0, 0]} scale={0.78}>
            <group ref={group} rotation={[0, 0, 0.35]}>
                {pairs.map(({ i, angle, y, colors }) => (
                    <group key={i} position={[0, y, 0]} rotation={[0, angle, 0]}>
                        <mesh geometry={rungGeo} material={rung} rotation={[0, 0, Math.PI / 2]} />
                        <group position={[RADIUS, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={0.38}>
                            <Capsule a={colors[0]} b={colors[1]} />
                        </group>
                        <group position={[-RADIUS, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={0.38}>
                            <Capsule a={colors[1]} b={colors[0]} />
                        </group>
                    </group>
                ))}
            </group>
        </group>
    );
}

export default function HelixScene({ reducedMotion = false }) {
    return (
        <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 10], fov: 40 }} gl={{ antialias: true, alpha: true }} aria-hidden="true">
            <StudioEnvironment />
            <ambientLight intensity={0.3} />
            <directionalLight position={[4, 6, 5]} intensity={1.5} />
            <directionalLight position={[-6, -2, 2]} intensity={0.6} color={PALETTE.mint} />
            <Helix reducedMotion={reducedMotion} />
        </Canvas>
    );
}
