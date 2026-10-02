import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Anatomical figure for the body map. The mesh is baked offline from a sculpted signed-distance
 * field (tools/bodymap/build-body.mjs → public/models/body.bin) and every vertex carries a region
 * id, so picking is exact and the shader can light up a whole region at once.
 *
 * The look is a "clinical scan": porcelain skin with wrap lighting, a fresnel rim, faint
 * topographic contour lines, a slow scanning sweep and a feet-up materialise on load. Picking a
 * region floods it with the accent colour and sends a ripple across the body from the click.
 * Hotspot pins are real DOM buttons that track their 3D anchors (and hide when facing away).
 */
export const REGIONS = ['head', 'face', 'chest', 'abdomen', 'pelvis', 'back', 'arms', 'legs'];
const SCALE = 2.45;
const OFFSET_Y = -2.25;

const PALETTES = {
    light: { base: '#e7e3d8', shade: '#9fb3ac', rim: '#2fbf8f', accent: '#12a37c', hover: '#5fd9a0', floor: '#0f766e', bg: '#f3f0e8' },
    dark: { base: '#3a4643', shade: '#0d1513', rim: '#9ef0c2', accent: '#9ef0c2', hover: '#5fd9a0', floor: '#9ef0c2', bg: '#0a0f0e' },
};

/* ───────────────────────── Model loading ───────────────────────── */

const cache = new Map();

function parseBody(buffer) {
    const dv = new DataView(buffer);
    if (dv.getUint32(0, true) !== 0x5944425a) throw new Error('Not a ZBDY body file');
    const vc = dv.getUint32(4, true);
    const ic = dv.getUint32(8, true);
    const indexBytes = dv.getUint32(12, true);
    const f = (i) => dv.getFloat32(16 + i * 4, true);
    const min = [f(0), f(1), f(2)];
    const max = [f(3), f(4), f(5)];
    const anchors = REGIONS.map((_, r) => new THREE.Vector3(f(6 + r * 3), f(7 + r * 3), f(8 + r * 3)));
    const header = 16 + 24 + REGIONS.length * 12;
    const posBytes = Math.ceil((vc * 6) / 4) * 4;

    const q = new Uint16Array(buffer, header, vc * 3);
    const packed = new Int8Array(buffer, header + posBytes, vc * 4);
    const positions = new Float32Array(vc * 3);
    const normals = new Float32Array(vc * 3);
    const regions = new Float32Array(vc);
    for (let i = 0; i < vc; i++) {
        for (let a = 0; a < 3; a++) {
            positions[i * 3 + a] = min[a] + (q[i * 3 + a] / 65535) * (max[a] - min[a]);
            normals[i * 3 + a] = packed[i * 4 + a] / 127;
        }
        regions[i] = packed[i * 4 + 3];
    }
    const IndexArray = indexBytes === 2 ? Uint16Array : Uint32Array;
    const index = new IndexArray(buffer, header + posBytes + vc * 4, ic);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('aRegion', new THREE.BufferAttribute(regions, 1));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return { geometry, anchors, height: max[1] - min[1] };
}

function useBody(url) {
    const [body, setBody] = useState(() => cache.get(url) ?? null);
    useEffect(() => {
        if (body || !url) return undefined;
        let alive = true;
        fetch(url)
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
            .then((buf) => {
                const parsed = parseBody(buf);
                cache.set(url, parsed);
                if (alive) setBody(parsed);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [url, body]);
    return body;
}

/* ───────────────────────── Shaders ───────────────────────── */

const bodyVertex = /* glsl */ `
    attribute float aRegion;
    uniform float uSelected;
    uniform float uHovered;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    varying vec3 vPosO;
    varying float vSel;
    varying float vHov;
    void main() {
        // One-hot per vertex, interpolated: region borders fade over a single triangle.
        vSel = abs(aRegion - uSelected) < 0.5 ? 1.0 : 0.0;
        vHov = abs(aRegion - uHovered) < 0.5 ? 1.0 : 0.0;
        vPosO = position;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vPosW = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

const bodyFragment = /* glsl */ `
    uniform vec3 uBase;
    uniform vec3 uShade;
    uniform vec3 uRim;
    uniform vec3 uAccent;
    uniform vec3 uHover;
    uniform float uTime;
    uniform float uAny;
    uniform float uReveal;
    uniform float uHeight;
    uniform vec3 uPulseOrigin;
    uniform float uPulse;
    uniform float uDark;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    varying vec3 vPosO;
    varying float vSel;
    varying float vHov;

    void main() {
        // Materialise from the feet up, with a bright cutting edge.
        float front = uReveal * (uHeight + 0.12);
        if (vPosO.y > front) discard;
        float edge = smoothstep(0.06, 0.0, front - vPosO.y) * step(uReveal, 0.999);

        vec3 N = normalize(vNormalW);
        if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vPosW);
        vec3 L = normalize(vec3(0.45, 0.85, 0.65));
        vec3 L2 = normalize(vec3(-0.7, 0.15, -0.5));

        // Wrap lighting reads as soft skin rather than plastic.
        float wrap = clamp((dot(N, L) + 0.45) / 1.45, 0.0, 1.0);
        float back = clamp(dot(N, L2), 0.0, 1.0);
        vec3 col = mix(uShade, uBase, wrap);
        col += uRim * back * 0.18;

        float sel = vSel;
        float hov = vHov * (1.0 - sel);

        // Everything else steps back while a region is selected.
        col = mix(col, mix(col, uShade, 0.45), uAny * (1.0 - sel) * 0.6);
        col = mix(col, uAccent * (0.55 + 0.55 * wrap), sel * 0.82);
        col = mix(col, mix(col, uHover, 0.5), hov);

        // Topographic contours (constant on-screen width).
        float h = vPosO.y * 48.0;
        float contour = 1.0 - min(abs(fract(h) - 0.5) / fwidth(h), 1.0);
        col += contour * uAccent * (0.03 + uDark * 0.02 + sel * 0.22 + hov * 0.12);

        // Slow scanning sweep.
        float scanY = mod(uTime * 0.22, 1.35) * uHeight - 0.1;
        float scan = exp(-pow((vPosO.y - scanY) * 30.0, 2.0));
        col += uAccent * scan * (0.18 + uDark * 0.2);

        // Ripple sent across the body from the picked point.
        float ring = exp(-pow((distance(vPosO, uPulseOrigin) - uPulse * 1.1) * 28.0, 2.0)) * (1.0 - uPulse);
        col += uAccent * ring * 1.3;

        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
        col += uRim * fres * (0.32 + 0.5 * sel + uDark * 0.35);

        vec3 H = normalize(L + V);
        col += pow(max(dot(N, H), 0.0), 60.0) * (0.22 + 0.2 * sel);

        col += uAccent * edge * 1.6;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
    }
`;

const floorVertex = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const floorFragment = /* glsl */ `
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = atan(p.y, p.x);
        float fade = smoothstep(1.0, 0.25, r);
        float rings = smoothstep(0.03, 0.0, abs(fract(r * 7.0 - uTime * 0.12) - 0.5) - 0.46);
        float outer = smoothstep(0.012, 0.0, abs(r - 0.82));
        float ticks = step(0.5, fract(a * 24.0 / 6.2831 + uTime * 0.02)) * smoothstep(0.03, 0.0, abs(r - 0.9));
        float glow = exp(-r * r * 9.0) * 0.6;
        float alpha = (rings * 0.35 * fade + outer * 0.7 + ticks * 0.6 + glow) * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
        #include <colorspace_fragment>
    }
`;

/* ───────────────────────── Scene parts ───────────────────────── */

function Figure({ body, palette, dark, selected, hovered, onHover, onPick, facing, drag, reducedMotion, group }) {
    const pulse = useRef({ t: 1 });
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: bodyVertex,
                fragmentShader: bodyFragment,
                uniforms: {
                    uBase: { value: new THREE.Color() },
                    uShade: { value: new THREE.Color() },
                    uRim: { value: new THREE.Color() },
                    uAccent: { value: new THREE.Color() },
                    uHover: { value: new THREE.Color() },
                    uTime: { value: 0 },
                    uAny: { value: 0 },
                    uReveal: { value: reducedMotion ? 1 : 0 },
                    uHeight: { value: body.height },
                    uSelected: { value: -1 },
                    uHovered: { value: -1 },
                    uPulseOrigin: { value: new THREE.Vector3() },
                    uPulse: { value: 1 },
                    uDark: { value: 0 },
                },
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [body],
    );

    useEffect(() => {
        const u = material.uniforms;
        u.uBase.value.set(palette.base);
        u.uShade.value.set(palette.shade);
        u.uRim.value.set(palette.rim);
        u.uAccent.value.set(palette.accent);
        u.uHover.value.set(palette.hover);
        u.uDark.value = dark ? 1 : 0;
    }, [material, palette, dark]);

    useEffect(() => () => material.dispose(), [material]);

    // A new selection sends a ripple out from its anchor (or from the clicked point).
    const lastPoint = useRef(null);
    useEffect(() => {
        const id = REGIONS.indexOf(selected);
        material.uniforms.uSelected.value = id;
        if (id < 0) return;
        material.uniforms.uPulseOrigin.value.copy(lastPoint.current ?? body.anchors[id]);
        lastPoint.current = null;
        pulse.current.t = reducedMotion ? 1 : 0;
    }, [selected, material, body, reducedMotion]);

    useEffect(() => {
        material.uniforms.uHovered.value = REGIONS.indexOf(hovered);
    }, [hovered, material]);

    useFrame((state, delta) => {
        const u = material.uniforms;
        u.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
        u.uReveal.value = Math.min(1, u.uReveal.value + delta * 0.55);
        u.uAny.value = THREE.MathUtils.damp(u.uAny.value, selected ? 1 : 0, 5, delta);
        pulse.current.t = Math.min(1, pulse.current.t + delta * 0.8);
        u.uPulse.value = pulse.current.t;

        const g = group.current;
        const d = drag.current;
        const base = facing === 'back' ? Math.PI : 0;
        if (!d.active) d.offset = THREE.MathUtils.damp(d.offset, 0, 1.2, delta);
        const idle = reducedMotion || selected || hovered ? 0 : Math.sin(state.clock.elapsedTime * 0.35) * 0.32;
        g.rotation.y = THREE.MathUtils.damp(g.rotation.y, base + d.offset + idle, 3.5, delta);
        g.position.y = OFFSET_Y + (reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.8) * 0.025);
    });

    const regionOf = (e) => REGIONS[body.geometry.attributes.aRegion.array[e.face.a]] ?? null;

    return (
        <mesh
            geometry={body.geometry}
            material={material}
            scale={SCALE}
            onPointerMove={(e) => {
                e.stopPropagation();
                onHover(regionOf(e));
            }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => {
                e.stopPropagation();
                if (e.delta > 6) return; // a drag, not a click
                lastPoint.current = e.object.worldToLocal(e.point.clone());
                onPick(regionOf(e));
            }}
        />
    );
}

function Floor({ palette, reducedMotion }) {
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: floorVertex,
                fragmentShader: floorFragment,
                transparent: true,
                depthWrite: false,
                uniforms: { uColor: { value: new THREE.Color() }, uTime: { value: 0 }, uOpacity: { value: 0 } },
            }),
        [],
    );
    useEffect(() => {
        material.uniforms.uColor.value.set(palette.floor);
    }, [material, palette]);
    useEffect(() => () => material.dispose(), [material]);
    useFrame((state, delta) => {
        material.uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
        material.uniforms.uOpacity.value = Math.min(1, material.uniforms.uOpacity.value + delta * 0.8);
    });
    return (
        <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, OFFSET_Y - 0.01, 0]}>
            <planeGeometry args={[4.2, 4.2]} />
        </mesh>
    );
}

/** Slow motes drifting upward around the figure. */
function Motes({ palette, reducedMotion }) {
    const ref = useRef();
    const { geometry, speeds } = useMemo(() => {
        const n = 220;
        const pos = new Float32Array(n * 3);
        const spd = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 1.1 + Math.random() * 2.2;
            pos.set([Math.cos(a) * r, OFFSET_Y + Math.random() * 5, Math.sin(a) * r * 0.6 - 0.4], i * 3);
            spd[i] = 0.05 + Math.random() * 0.12;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        return { geometry: g, speeds: spd };
    }, []);
    useEffect(() => () => geometry.dispose(), [geometry]);
    useFrame((_, delta) => {
        if (reducedMotion) return;
        const p = geometry.attributes.position;
        for (let i = 0; i < speeds.length; i++) {
            let y = p.getY(i) + speeds[i] * delta;
            if (y > OFFSET_Y + 5) y = OFFSET_Y;
            p.setY(i, y);
        }
        p.needsUpdate = true;
        ref.current.rotation.y += delta * 0.02;
    });
    return (
        <points ref={ref} geometry={geometry}>
            <pointsMaterial color={palette.accent} size={0.028} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
        </points>
    );
}

/** Eases the camera toward the selected region (closer, at its height) and adds pointer parallax. */
function CameraRig({ body, selected, reducedMotion }) {
    const { camera, pointer, size } = useThree();
    const target = useRef(new THREE.Vector3(0, 0.1, 0));
    const narrow = size.width < 640;
    useFrame((_, delta) => {
        const id = REGIONS.indexOf(selected);
        const focusY = id >= 0 ? body.anchors[id].y * SCALE + OFFSET_Y : 0.1;
        const dist = (id >= 0 ? 8 : 9.9) + (narrow ? 0.8 : 0);
        const px = reducedMotion ? 0 : pointer.x * 0.5;
        const py = reducedMotion ? 0 : pointer.y * 0.3;
        const lambda = 2.6;
        target.current.y = THREE.MathUtils.damp(target.current.y, focusY * 0.75, lambda, delta);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, px, lambda, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, target.current.y + 0.3 + py, lambda, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, dist, lambda, delta);
        camera.lookAt(target.current);
    });
    return null;
}

/** Projects each region anchor to screen space every frame and moves the DOM pins (no re-renders). */
function PinTracker({ body, group, pins }) {
    const { camera, size } = useThree();
    const v = useMemo(() => new THREE.Vector3(), []);
    const n = useMemo(() => new THREE.Vector3(), []);
    const toCam = useMemo(() => new THREE.Vector3(), []);
    useFrame(() => {
        const g = group.current;
        if (!g) return;
        g.updateMatrixWorld();
        body.anchors.forEach((a, i) => {
            const el = pins.current[i];
            if (!el) return;
            v.copy(a).multiplyScalar(SCALE).applyMatrix4(g.matrixWorld);
            // Facing test: horizontal direction from the body axis to the anchor vs. toward the camera.
            n.set(a.x, 0, a.z + 0.02).applyQuaternion(g.quaternion).normalize();
            toCam.set(camera.position.x - v.x, 0, camera.position.z - v.z).normalize();
            const visible = n.dot(toCam) > 0.05;
            v.project(camera);
            const x = (v.x * 0.5 + 0.5) * size.width;
            const y = (-v.y * 0.5 + 0.5) * size.height;
            el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            el.dataset.visible = visible ? 'true' : 'false';
        });
    });
    return null;
}

/* ───────────────────────── Root ───────────────────────── */

export default function BodyScene({ model, labels = {}, selected, onSelect, onHover, hovered, facing = 'front', dark = false, reducedMotion = false, onReady }) {
    const body = useBody(model);
    const drag = useRef({ active: false, x: 0, offset: 0 });
    const group = useRef();
    const pins = useRef([]);
    const [grabbing, setGrabbing] = useState(false);
    const palette = dark ? PALETTES.dark : PALETTES.light;

    useEffect(() => {
        if (body) onReady?.();
    }, [body, onReady]);

    const end = () => {
        drag.current.active = false;
        setGrabbing(false);
    };

    return (
        <div
            className={grabbing ? 'absolute inset-0 cursor-grabbing touch-pan-y' : 'absolute inset-0 cursor-grab touch-pan-y'}
            onPointerDown={(e) => {
                if (e.target.closest('button')) return;
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
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={() => {
                end();
                onHover(null);
            }}
        >
            <Canvas dpr={[1, 2]} camera={{ position: [0, 0.4, 11.2], fov: 38 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
                {body && (
                    <>
                        <group ref={group} position={[0, OFFSET_Y, 0]}>
                            <Figure
                                body={body}
                                palette={palette}
                                dark={dark}
                                selected={selected}
                                hovered={hovered}
                                onHover={onHover}
                                onPick={onSelect}
                                facing={facing}
                                drag={drag}
                                reducedMotion={reducedMotion}
                                group={group}
                            />
                        </group>
                        <Floor palette={palette} reducedMotion={reducedMotion} />
                        <Motes palette={palette} reducedMotion={reducedMotion} />
                        <CameraRig body={body} selected={selected} reducedMotion={reducedMotion} />
                        <PinTracker body={body} group={group} pins={pins} />
                    </>
                )}
            </Canvas>

            {body && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-label="Body regions">
                    {REGIONS.map((key, i) => (
                        <button
                            key={key}
                            ref={(el) => (pins.current[i] = el)}
                            type="button"
                            onClick={() => onSelect(key)}
                            onMouseEnter={() => onHover(key)}
                            onMouseLeave={() => onHover(null)}
                            onFocus={() => onHover(key)}
                            onBlur={() => onHover(null)}
                            aria-pressed={selected === key}
                            aria-label={labels[key] ?? key}
                            data-visible="false"
                            className="body-pin group pointer-events-auto absolute top-0 left-0 -mt-3 -ml-3 grid size-6 place-items-center"
                        >
                            <span className={selected === key ? 'body-pin-dot is-active' : 'body-pin-dot'} />
                            <span className={hovered === key || selected === key ? 'body-pin-label is-shown' : 'body-pin-label'}>{labels[key] ?? key}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
