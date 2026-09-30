import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { StudioEnvironment } from './shared';

/**
 * Stylised mannequin assembled from capsules (fitting for a pharmacy). Every part belongs to a body
 * region; torso parts hit from behind resolve to "back". Hovered regions glow, the selected region
 * turns mint. Drag to rotate; `facing` ('front' | 'back') eases the model around.
 */
const PARTS = [
    // [region, kind, position, rotationZ, size]
    ['head', 'sphere', [0, 3.05, 0], 0, [0.42]],
    ['face', 'face', [0, 3.02, 0.3], 0, [0.3]],
    ['face', 'capsule', [0, 2.52, 0], 0, [0.14, 0.18]], // neck / throat
    ['chest', 'capsule', [0, 1.95, 0], 0, [0.56, 0.5]],
    ['abdomen', 'capsule', [0, 1.28, 0], 0, [0.5, 0.35]],
    ['pelvis', 'capsule', [0, 0.72, 0], Math.PI / 2, [0.36, 0.34]],
    ['arms', 'capsule', [-0.82, 1.98, 0], -0.22, [0.15, 0.62]],
    ['arms', 'capsule', [0.82, 1.98, 0], 0.22, [0.15, 0.62]],
    ['arms', 'capsule', [-1.02, 1.12, 0.05], -0.08, [0.13, 0.6]],
    ['arms', 'capsule', [1.02, 1.12, 0.05], 0.08, [0.13, 0.6]],
    ['arms', 'sphere', [-1.07, 0.58, 0.08], 0, [0.15]],
    ['arms', 'sphere', [1.07, 0.58, 0.08], 0, [0.15]],
    ['legs', 'capsule', [-0.3, -0.12, 0], 0.03, [0.21, 0.82]],
    ['legs', 'capsule', [0.3, -0.12, 0], -0.03, [0.21, 0.82]],
    ['legs', 'capsule', [-0.33, -1.35, 0], 0, [0.16, 0.78]],
    ['legs', 'capsule', [0.33, -1.35, 0], 0, [0.16, 0.78]],
    ['legs', 'foot', [-0.34, -2.0, 0.12], 0, [0.13, 0.22]],
    ['legs', 'foot', [0.34, -2.0, 0.12], 0, [0.13, 0.22]],
];
const TORSO = new Set(['chest', 'abdomen']);

const COLORS = { base: '#c9cfc9', hover: '#a8ecc6', active: '#5fd9a0', dim: '#dcd8ce' };
const DARK = { base: '#2a3531', hover: '#3f6b5a', active: '#9ef0c2', dim: '#232c29' };

function Part({ part, isSelected, isHovered, anySelected, onHover, onPick, palette }) {
    const [region, kind, position, rz, size] = part;
    const geometry = useMemo(() => {
        if (kind === 'sphere') return new THREE.SphereGeometry(size[0], 40, 28);
        if (kind === 'face') return new THREE.SphereGeometry(size[0], 32, 20, 0, Math.PI * 2, 0, Math.PI / 2.2);
        if (kind === 'foot') return new THREE.CapsuleGeometry(size[0], size[1], 8, 20);
        return new THREE.CapsuleGeometry(size[0], size[1], 12, 28);
    }, [kind, size]);
    const material = useMemo(() => new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.25, sheen: 0.5 }), []);

    const target = isSelected ? palette.active : isHovered ? palette.hover : anySelected ? palette.dim : palette.base;
    useFrame((_, delta) => {
        material.color.lerp(new THREE.Color(target), Math.min(1, delta * 8));
        const glow = isHovered || isSelected ? 0.12 : 0;
        material.emissive.set(palette.active);
        material.emissiveIntensity = THREE.MathUtils.damp(material.emissiveIntensity, glow, 6, delta);
    });

    const resolve = (e) => {
        if (!TORSO.has(region)) return region;
        const local = e.object.worldToLocal(e.point.clone());
        return local.z < -0.05 ? 'back' : region;
    };

    return (
        <mesh
            geometry={geometry}
            material={material}
            position={position}
            rotation={kind === 'face' ? [Math.PI / 2, 0, 0] : kind === 'foot' ? [Math.PI / 2, 0, 0] : [0, 0, rz]}
            onPointerMove={(e) => {
                e.stopPropagation();
                onHover(resolve(e));
            }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => {
                e.stopPropagation();
                if (e.delta > 6) return; // was a drag, not a click
                onPick(resolve(e));
            }}
        />
    );
}

function Mannequin({ selected, hovered, onHover, onPick, facing, drag, reducedMotion, palette }) {
    const group = useRef();

    useFrame((state, delta) => {
        const g = group.current;
        const d = drag.current;
        const base = facing === 'back' ? Math.PI : 0;
        if (!d.active) d.offset = THREE.MathUtils.damp(d.offset, 0, 1.5, delta);
        const idle = reducedMotion || selected ? 0 : Math.sin(state.clock.elapsedTime * 0.5) * 0.25;
        g.rotation.y = THREE.MathUtils.damp(g.rotation.y, base + d.offset + idle, 4, delta);
        g.position.y = reducedMotion ? -0.4 : -0.4 + Math.sin(state.clock.elapsedTime * 0.9) * 0.04;
    });

    const matches = (key, region) => key === region || (key === 'back' && TORSO.has(region));

    return (
        <group ref={group} position={[0, -0.4, 0]}>
            {PARTS.map((p, i) => (
                <Part
                    key={i}
                    part={p}
                    isSelected={matches(selected, p[0])}
                    isHovered={matches(hovered, p[0])}
                    anySelected={!!selected}
                    onHover={onHover}
                    onPick={onPick}
                    palette={palette}
                />
            ))}
        </group>
    );
}

export default function BodyScene({ selected, onSelect, onHover, hovered, facing = 'front', dark = false, reducedMotion = false }) {
    const drag = useRef({ active: false, x: 0, offset: 0 });
    const [grabbing, setGrabbing] = useState(false);

    return (
        <div
            className={grabbing ? 'absolute inset-0 cursor-grabbing' : 'absolute inset-0 cursor-grab'}
            onPointerDown={(e) => {
                drag.current.active = true;
                drag.current.x = e.clientX;
                setGrabbing(true);
            }}
            onPointerMove={(e) => {
                const d = drag.current;
                if (!d.active) return;
                d.offset += (e.clientX - d.x) * 0.012;
                d.x = e.clientX;
            }}
            onPointerUp={() => {
                drag.current.active = false;
                setGrabbing(false);
            }}
            onPointerLeave={() => {
                drag.current.active = false;
                setGrabbing(false);
                onHover(null);
            }}
        >
            <Canvas dpr={[1, 2]} camera={{ position: [0, 0.4, 11.5], fov: 40 }} gl={{ antialias: true, alpha: true }}>
                <StudioEnvironment intensity={0.05} />
                <ambientLight intensity={dark ? 0.5 : 0.7} />
                <directionalLight position={[3, 6, 5]} intensity={1.3} />
                <directionalLight position={[-5, 2, -4]} intensity={0.6} color="#9ef0c2" />
                <Mannequin
                    selected={selected}
                    hovered={hovered}
                    onHover={onHover}
                    onPick={onSelect}
                    facing={facing}
                    drag={drag}
                    reducedMotion={reducedMotion}
                    palette={dark ? DARK : COLORS}
                />
            </Canvas>
        </div>
    );
}
