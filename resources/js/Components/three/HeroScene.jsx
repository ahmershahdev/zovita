import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const PALETTE = {
    ink: '#0b1b33',
    mint: '#9ef0c2',
    paper: '#f7f5ef',
    coral: '#f0603f',
    teal: '#0f766e',
};

// Dark mode: ink pills would vanish on the night background, so light and dark tones swap.
const DARK_PALETTE = { ...PALETTE, ink: '#e4ebe3', paper: '#1d2f2a' };
const PaletteContext = createContext(PALETTE);

// Deterministic layout so the composition is art-directed rather than random each load.
const PILLS = [
    { kind: 'capsule', pos: [-2.6, 1.3, -0.5], rot: [0.4, 0.2, 0.9], scale: 1.15, colors: ['ink', 'mint'] },
    { kind: 'capsule', pos: [2.4, 1.6, -1.2], rot: [1.2, 0.4, -0.5], scale: 0.9, colors: ['coral', 'paper'] },
    { kind: 'tablet', pos: [1.2, -1.4, 0.4], rot: [1.1, 0.3, 0.2], scale: 1.1, colors: ['paper'] },
    { kind: 'capsule', pos: [-1.1, -1.8, -0.8], rot: [0.2, 1.1, 1.8], scale: 0.75, colors: ['teal', 'paper'] },
    { kind: 'sphere', pos: [3.3, -0.6, -2], rot: [0, 0, 0], scale: 0.55, colors: ['mint'] },
    { kind: 'tablet', pos: [-3.4, -0.4, -2.2], rot: [0.5, 0.9, 0.3], scale: 0.8, colors: ['mint'] },
    { kind: 'capsule', pos: [0.3, 2.3, -2.6], rot: [0.9, 0.2, 1.4], scale: 0.7, colors: ['ink', 'paper'] },
    { kind: 'sphere', pos: [-0.2, -0.2, -3.6], rot: [0, 0, 0], scale: 0.35, colors: ['coral'] },
    { kind: 'tablet', pos: [3.9, 2.2, -3.4], rot: [1.4, 0.1, 0.6], scale: 0.6, colors: ['paper'] },
    { kind: 'capsule', pos: [-3.9, 2.4, -3.2], rot: [0.1, 0.6, 2.2], scale: 0.6, colors: ['mint', 'ink'] },
    { kind: 'sphere', pos: [1.9, 0.4, -1.2], rot: [0, 0, 0], scale: 0.22, colors: ['ink'] },
];

function useMaterial(color, options = {}) {
    const palette = useContext(PaletteContext);
    const key = JSON.stringify(options);
    return useMemo(
        () =>
            new THREE.MeshPhysicalMaterial({
                color: palette[color],
                roughness: 0.22,
                metalness: 0,
                clearcoat: 1,
                clearcoatRoughness: 0.12,
                sheen: 0.4,
                ...options,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [color, key, palette],
    );
}

/** Two-tone capsule built from two hemispheres + two open cylinders so the colour seam is crisp. */
function Capsule({ colors: [a, b] }) {
    const matA = useMaterial(a);
    const matB = useMaterial(b);
    const geo = useMemo(
        () => ({
            cap: new THREE.SphereGeometry(0.42, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
            body: new THREE.CylinderGeometry(0.42, 0.42, 0.6, 48, 1, true),
        }),
        [],
    );

    return (
        <group>
            <mesh geometry={geo.body} material={matA} position={[0, 0.3, 0]} />
            <mesh geometry={geo.cap} material={matA} position={[0, 0.6, 0]} />
            <mesh geometry={geo.body} material={matB} position={[0, -0.3, 0]} />
            <mesh geometry={geo.cap} material={matB} position={[0, -0.6, 0]} rotation={[Math.PI, 0, 0]} />
        </group>
    );
}

function Tablet({ colors: [a] }) {
    const mat = useMaterial(a, { roughness: 0.45, clearcoat: 0.4 });
    const geo = useMemo(() => {
        // Lathe a rounded-edge disc profile.
        const pts = [];
        const r = 0.62;
        const h = 0.13;
        const bevel = 0.1;
        pts.push(new THREE.Vector2(0, -h - 0.02));
        for (let i = 0; i <= 8; i++) {
            const t = (i / 8) * (Math.PI / 2);
            pts.push(new THREE.Vector2(r - bevel + Math.sin(t) * bevel, -h + bevel - Math.cos(t) * bevel));
        }
        for (let i = 0; i <= 8; i++) {
            const t = (i / 8) * (Math.PI / 2);
            pts.push(new THREE.Vector2(r - bevel + Math.cos(t) * bevel, h - bevel + Math.sin(t) * bevel));
        }
        pts.push(new THREE.Vector2(0, h + 0.02));
        return new THREE.LatheGeometry(pts, 64);
    }, []);
    const scoreGeo = useMemo(() => new THREE.BoxGeometry(1.0, 0.03, 0.05), []);
    const scoreMat = useMaterial('ink', { roughness: 0.8, clearcoat: 0, transparent: true, opacity: 0.12 });

    return (
        <group>
            <mesh geometry={geo} material={mat} />
            <mesh geometry={scoreGeo} material={scoreMat} position={[0, 0.152, 0]} rotation={[0, Math.PI / 4, 0]} />
        </group>
    );
}

function Sphere({ colors: [a] }) {
    const mat = useMaterial(a);
    const geo = useMemo(() => new THREE.SphereGeometry(0.5, 48, 48), []);
    return <mesh geometry={geo} material={mat} />;
}

const SHAPES = { capsule: Capsule, tablet: Tablet, sphere: Sphere };

function Pill({ config, index }) {
    const ref = useRef();
    const Shape = SHAPES[config.kind];
    const seed = index * 1.37;

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const el = ref.current;
        el.position.y = config.pos[1] + Math.sin(t * 0.6 + seed) * 0.18;
        el.rotation.x = config.rot[0] + Math.sin(t * 0.3 + seed) * 0.25;
        el.rotation.y = config.rot[1] + t * 0.12 * (index % 2 ? 1 : -1);
    });

    return (
        <group ref={ref} position={config.pos} rotation={config.rot} scale={config.scale}>
            <Shape colors={config.colors} />
        </group>
    );
}

function Rig({ scrollProgress }) {
    const group = useRef();
    const { pointer, viewport } = useThree();

    useFrame((_, delta) => {
        const g = group.current;
        const s = scrollProgress.current;
        // Ease towards pointer + scroll targets for a weighty, calm motion.
        g.rotation.y = THREE.MathUtils.damp(g.rotation.y, pointer.x * 0.35 + s * 0.8, 3, delta);
        g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -pointer.y * 0.2 + s * 0.3, 3, delta);
        g.position.y = THREE.MathUtils.damp(g.position.y, s * 2.4, 4, delta);
    });

    const scale = Math.min(1, viewport.width / 9);

    return (
        <group ref={group} scale={scale}>
            {PILLS.map((p, i) => (
                <Pill key={i} config={p} index={i} />
            ))}
        </group>
    );
}

function Environment() {
    const { gl, scene } = useThree();
    useEffect(() => {
        const pmrem = new THREE.PMREMGenerator(gl);
        const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = env;
        return () => {
            env.dispose();
            pmrem.dispose();
        };
    }, [gl, scene]);
    return null;
}

export default function HeroScene({ dark = false }) {
    const scrollProgress = useRef(0);

    useEffect(() => {
        const onScroll = () => {
            scrollProgress.current = Math.min(1, window.scrollY / window.innerHeight);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <Canvas
            dpr={[1, 1.75]}
            camera={{ position: [0, 0, 7.5], fov: 40 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            aria-hidden="true"
        >
            <Environment />
            <ambientLight intensity={0.35} />
            <directionalLight position={[4, 6, 5]} intensity={1.6} />
            <directionalLight position={[-6, -2, 2]} intensity={0.5} color={PALETTE.mint} />
            <PaletteContext.Provider value={dark ? DARK_PALETTE : PALETTE}>
                <Rig scrollProgress={scrollProgress} />
            </PaletteContext.Provider>
        </Canvas>
    );
}
