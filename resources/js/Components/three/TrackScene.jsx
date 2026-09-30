import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PALETTE, StudioEnvironment, useGloss } from './shared';

/** How far along the route the rider is for each order status (0 = pharmacy, 1 = your door). */
export const PROGRESS = { pending: 0.02, confirmed: 0.12, packed: 0.28, shipped: 0.72, delivered: 1, cancelled: 0.02 };

const ROUTE = [
    [-4.2, 0, -2.2], [-2.6, 0, -2.2], [-2.6, 0, 0], [0, 0, 0], [0, 0, 2.2], [2.6, 0, 2.2], [2.6, 0, 0.4], [4.2, 0, 0.4],
].map(([x, y, z]) => new THREE.Vector3(x, y, z));

// Deterministic "city": blocks placed on a grid, skipping the road cells.
function useBlocks() {
    return useMemo(() => {
        const blocks = [];
        let seed = 7;
        const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let x = -5; x <= 5; x += 1.3) {
            for (let z = -3.8; z <= 3.8; z += 1.3) {
                const nearRoad = ROUTE.some((p, i) => {
                    const q = ROUTE[i + 1];
                    if (!q) return false;
                    const line = new THREE.Line3(p, q);
                    return line.closestPointToPoint(new THREE.Vector3(x, 0, z), true, new THREE.Vector3()).distanceTo(new THREE.Vector3(x, 0, z)) < 0.85;
                });
                if (nearRoad || rand() < 0.25) continue;
                blocks.push({ x, z, h: 0.3 + rand() * 1.4, w: 0.7 + rand() * 0.3 });
            }
        }
        return blocks;
    }, []);
}

function City({ progress, status, dark, reducedMotion }) {
    const group = useRef();
    const rider = useRef();
    const shown = useRef(0);
    const { pointer } = useThree();
    const curve = useMemo(() => new THREE.CatmullRomCurve3(ROUTE, false, 'catmullrom', 0.05), []);
    const blocks = useBlocks();

    const buildingMat = useGloss(dark ? '#1b2724' : '#e7e2d6', { roughness: 0.6, clearcoat: 0.2 });
    const groundMat = useMemo(() => new THREE.MeshStandardMaterial({ color: dark ? '#0d1513' : '#f0ece3', roughness: 1 }), [dark]);
    const roadMat = useMemo(() => new THREE.MeshStandardMaterial({ color: dark ? '#2a3834' : '#cfc8b8', roughness: 0.9 }), [dark]);
    const doneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: status === 'cancelled' ? PALETTE.coral : PALETTE.mint, emissive: PALETTE.mint, emissiveIntensity: status === 'cancelled' ? 0 : 0.35 }), [status]);
    const pharmacyMat = useGloss(PALETTE.teal);
    const homeMat = useGloss(PALETTE.coral);
    const scooterMat = useGloss(PALETTE.mint);
    const wheelMat = useGloss(PALETTE.ink, { roughness: 0.5 });

    const road = useMemo(() => new THREE.TubeGeometry(curve, 200, 0.16, 8, false), [curve]);
    const doneGeo = useMemo(() => {
        const pts = curve.getSpacedPoints(200).slice(0, Math.max(2, Math.round(200 * progress)));
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(4, pts.length), 0.1, 8, false);
    }, [curve, progress]);

    useFrame((state, delta) => {
        // Ease the rider to its position; "shipped" orders gently bob back and forth on the last leg.
        const target = status === 'shipped' && !reducedMotion ? progress + Math.sin(state.clock.elapsedTime * 0.6) * 0.06 : progress;
        shown.current = THREE.MathUtils.damp(shown.current, target, 1.6, delta);
        const t = THREE.MathUtils.clamp(shown.current, 0.001, 0.999);
        const p = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        rider.current.position.set(p.x, 0.18 + (reducedMotion ? 0 : Math.abs(Math.sin(state.clock.elapsedTime * 6)) * 0.02), p.z);
        rider.current.rotation.y = Math.atan2(tangent.x, tangent.z);

        group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, -0.5 + pointer.x * 0.15, 2, delta);
        group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, 0.08 - pointer.y * 0.05, 2, delta);
    });

    return (
        <group ref={group} rotation={[0.08, -0.5, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} material={groundMat} receiveShadow>
                <circleGeometry args={[7, 64]} />
            </mesh>
            {blocks.map((b, i) => (
                <mesh key={i} position={[b.x, b.h / 2, b.z]} material={buildingMat} castShadow>
                    <boxGeometry args={[b.w, b.h, b.w]} />
                </mesh>
            ))}
            <mesh geometry={road} material={roadMat} scale={[1, 0.15, 1]} />
            <mesh geometry={doneGeo} material={doneMat} position={[0, 0.03, 0]} scale={[1, 0.3, 1]} />

            {/* Pharmacy with a green cross */}
            <group position={[-4.6, 0, -2.2]}>
                <mesh position={[0, 0.55, 0]} material={pharmacyMat} castShadow>
                    <boxGeometry args={[0.9, 1.1, 0.9]} />
                </mesh>
                <mesh position={[0, 1.35, 0]} material={scooterMat}>
                    <boxGeometry args={[0.5, 0.14, 0.14]} />
                </mesh>
                <mesh position={[0, 1.35, 0]} material={scooterMat}>
                    <boxGeometry args={[0.14, 0.5, 0.14]} />
                </mesh>
            </group>

            {/* Home with a pitched roof */}
            <group position={[4.6, 0, 0.4]}>
                <mesh position={[0, 0.35, 0]} material={homeMat} castShadow>
                    <boxGeometry args={[0.8, 0.7, 0.8]} />
                </mesh>
                <mesh position={[0, 0.92, 0]} rotation={[0, Math.PI / 4, 0]} material={wheelMat}>
                    <coneGeometry args={[0.66, 0.5, 4]} />
                </mesh>
            </group>

            {/* Rider: scooter body, delivery box, wheels */}
            <group ref={rider}>
                <mesh position={[0, 0.12, 0]} material={scooterMat} castShadow>
                    <boxGeometry args={[0.22, 0.14, 0.5]} />
                </mesh>
                <mesh position={[0, 0.3, -0.12]} material={buildingMat}>
                    <boxGeometry args={[0.26, 0.22, 0.24]} />
                </mesh>
                {[0.18, -0.18].map((z) => (
                    <mesh key={z} position={[0, 0.02, z]} rotation={[0, 0, Math.PI / 2]} material={wheelMat}>
                        <cylinderGeometry args={[0.08, 0.08, 0.06, 20]} />
                    </mesh>
                ))}
            </group>
        </group>
    );
}

function LookAtCentre() {
    const { camera } = useThree();
    useMemo(() => camera.lookAt(0, 0, 0), [camera]);
    return null;
}

export default function TrackScene({ status = 'pending', dark = false, reducedMotion = false }) {
    return (
        <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 7.5, 8.5], fov: 38 }} gl={{ antialias: true, alpha: true }} aria-hidden="true">
            <LookAtCentre />
            <StudioEnvironment intensity={0.04} />
            <ambientLight intensity={dark ? 0.35 : 0.6} />
            <directionalLight position={[5, 9, 4]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]} />
            <City progress={PROGRESS[status] ?? 0} status={status} dark={dark} reducedMotion={reducedMotion} />
        </Canvas>
    );
}
