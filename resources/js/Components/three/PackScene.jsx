import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { StudioEnvironment } from './shared';

const LIQUIDS = ['syrup', 'drops', 'solution', 'spray', 'lotion', 'wash', 'shampoo', 'serum'];

/** Carton: the product shot wraps the front and back faces, the sides take a tinted edge. */
function Carton({ texture }) {
    const materials = useMemo(() => {
        const face = new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
        const edge = new THREE.MeshPhysicalMaterial({ color: '#f4f2ec', roughness: 0.5, clearcoat: 0.3 });
        // BoxGeometry face order: +x, -x, +y, -y, +z (front), -z (back)
        return [edge, edge, edge, edge, face, face];
    }, [texture]);
    const geometry = useMemo(() => new THREE.BoxGeometry(2.2, 2.2, 0.8, 1, 1, 1), []);
    return <mesh geometry={geometry} material={materials} castShadow />;
}

/** Bottle: lathed amber glass with the product shot as a wraparound label and a cap. */
function Bottle({ texture }) {
    const glass = useMemo(() => {
        const pts = [
            [0, -1.3], [0.78, -1.3], [0.86, -1.2], [0.86, 0.55], [0.78, 0.8], [0.42, 1.05], [0.34, 1.2], [0.34, 1.3], [0, 1.3],
        ].map(([x, y]) => new THREE.Vector2(x, y));
        return new THREE.LatheGeometry(pts, 64);
    }, []);
    const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#7a3b12', roughness: 0.08, transmission: 0.5, thickness: 0.6, clearcoat: 1 }), []);
    const label = useMemo(() => new THREE.CylinderGeometry(0.875, 0.875, 1.25, 64, 1, true, -Math.PI / 2, Math.PI), []);
    const labelMat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.4, side: THREE.DoubleSide }), [texture]);
    const cap = useMemo(() => new THREE.CylinderGeometry(0.4, 0.4, 0.4, 48), []);
    const capMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f7f5ef', roughness: 0.3, clearcoat: 1 }), []);

    return (
        <group scale={1.05}>
            <mesh geometry={glass} material={glassMat} />
            <mesh geometry={label} material={labelMat} position={[0, -0.25, 0]} />
            <mesh geometry={cap} material={capMat} position={[0, 1.45, 0]} />
        </group>
    );
}

function Pack({ image, form, drag, reducedMotion }) {
    const group = useRef();
    const texture = useLoader(THREE.TextureLoader, image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    useFrame((state, delta) => {
        const g = group.current;
        const d = drag.current;
        if (!d.active) {
            d.vy *= 0.94; // inertia after release
            d.vx *= 0.9;
            if (!reducedMotion && Math.abs(d.vy) < 0.002) d.vy = 0.004;
        }
        g.rotation.y += d.vy;
        d.tiltX = THREE.MathUtils.clamp(d.tiltX + d.vx, -0.5, 0.5);
        g.rotation.x = THREE.MathUtils.damp(g.rotation.x, d.tiltX, 6, delta);
        g.position.y = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
    });

    return <group ref={group}>{LIQUIDS.includes(form) ? <Bottle texture={texture} /> : <Carton texture={texture} />}</group>;
}

/** Drag-to-spin 3D pack for the product page gallery. */
export default function PackScene({ image, form, reducedMotion = false }) {
    const drag = useRef({ active: false, x: 0, y: 0, vx: 0, vy: 0, tiltX: 0 });

    const handlers = {
        onPointerDown: (e) => {
            drag.current = { ...drag.current, active: true, x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture?.(e.pointerId);
        },
        onPointerMove: (e) => {
            const d = drag.current;
            if (!d.active) return;
            d.vy = (e.clientX - d.x) * 0.01;
            d.vx = (e.clientY - d.y) * 0.004;
            d.x = e.clientX;
            d.y = e.clientY;
        },
        onPointerUp: () => (drag.current.active = false),
        onPointerCancel: () => (drag.current.active = false),
    };

    return (
        <div className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing" data-cursor="Drag" {...handlers}>
            <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 6], fov: 35 }} gl={{ antialias: true, alpha: true }}>
                <StudioEnvironment intensity={0.05} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[3, 5, 4]} intensity={1.4} />
                <directionalLight position={[-4, -1, 3]} intensity={0.5} color="#9ef0c2" />
                <Suspense fallback={null}>
                    <Pack image={image} form={form} drag={drag} reducedMotion={reducedMotion} />
                </Suspense>
            </Canvas>
        </div>
    );
}
