import React, { useRef, useMemo, useEffect, useState, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SECTORS } from '../../constants';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GLOBE_R  = 2.45;   // solid opaque core
const NODE_R   = 2.51;   // nodes sit just above wireframe (2.50), flush with surface

// ─── UTILS ────────────────────────────────────────────────────────────────────

const hashStr = (s) => {
    if (!s) return 0;
    let h = 0;
    const str = s.toString();
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

const getSphericalPos = (id, radius = NODE_R) => {
    const h     = hashStr(id);
    const rand1 = (Math.abs(Math.sin(h * 127.1)) * 10000) % 1;
    const rand2 = (Math.abs(Math.sin(h * 311.7)) * 10000) % 1;
    const lon   = rand1 * Math.PI * 2;
    const lat   = Math.asin(rand2 * 2 - 1);
    return {
        pos: [
            radius * Math.cos(lat) * Math.cos(lon),
            radius * Math.sin(lat),
            radius * Math.cos(lat) * Math.sin(lon),
        ],
        lat, lon,
    };
};

// Tight city-light glow — bright hard core, fast falloff
const createGlowTexture = (color) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g   = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0,    color);
    g.addColorStop(0.15, color);
    g.addColorStop(0.40, color + '77');
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
};

const buildArc = (from, to) => {
    const f   = new THREE.Vector3(...from);
    const t   = new THREE.Vector3(...to);
    const mid = new THREE.Vector3().addVectors(f, t).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(4.8);
    return new THREE.QuadraticBezierCurve3(f, mid, t);
};

// ─── STAR FIELD ───────────────────────────────────────────────────────────────

const StarField = memo(() => {
    const COUNT_SMALL  = 2200;
    const COUNT_BRIGHT = 180;
    const RADIUS       = 38;

    const { smallGeo, brightGeo } = useMemo(() => {
        const mkGeo = (count, r) => {
            const pos = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                const u   = Math.random();
                const v   = Math.random();
                const lat = Math.acos(2 * v - 1) - Math.PI / 2;
                const lon = 2 * Math.PI * u;
                pos[i * 3]     = r * Math.cos(lat) * Math.cos(lon);
                pos[i * 3 + 1] = r * Math.sin(lat);
                pos[i * 3 + 2] = r * Math.cos(lat) * Math.sin(lon);
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            return g;
        };
        return { smallGeo: mkGeo(COUNT_SMALL, RADIUS), brightGeo: mkGeo(COUNT_BRIGHT, RADIUS * 0.98) };
    }, []);

    useEffect(() => () => { smallGeo.dispose(); brightGeo.dispose(); }, [smallGeo, brightGeo]);

    return (
        <group>
            <points geometry={smallGeo}>
                <pointsMaterial color="#a0c8ff" size={0.09} sizeAttenuation transparent opacity={0.75} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
            </points>
            <points geometry={brightGeo}>
                <pointsMaterial color="#ffe8c0" size={0.18} sizeAttenuation transparent opacity={0.90} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
            </points>
        </group>
    );
});

// ─── SHIMMER LINE ─────────────────────────────────────────────────────────────

const ShimmerLine = memo(({ from, to, color, phaseOffset = 0, isSelected = false, isRelated = false }) => {
    const lineRef = useRef();
    const opRef   = useRef(0);

    const geo = useMemo(() => {
        const curve = buildArc(from, to);
        return new THREE.BufferGeometry().setFromPoints(curve.getPoints(60));
    }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

    useEffect(() => () => geo.dispose(), [geo]);
    useEffect(() => { opRef.current = 0; }, []);

    useFrame(({ clock }) => {
        if (!lineRef.current) return;
        const t = clock.getElapsedTime();
        if (isSelected) {
            opRef.current = Math.min(opRef.current + 0.05, 1);
            lineRef.current.material.opacity = 0.75;
        } else if (isRelated) {
            opRef.current = Math.min(opRef.current + 0.04, 1);
            lineRef.current.material.opacity = 0.45;
        } else {
            opRef.current = Math.min(opRef.current + 0.025, 1);
            lineRef.current.material.opacity = opRef.current * (0.10 + Math.sin(t * 0.6 + phaseOffset) * 0.07);
        }
    });

    return (
        <line ref={lineRef} geometry={geo}>
            <lineBasicMaterial color={color} transparent opacity={0} linewidth={1} toneMapped={false} depthWrite={false} />
        </line>
    );
});

// ─── NETWORK VISUALIZATION ────────────────────────────────────────────────────

const NetworkVisualization = ({ artists, tracks, playlists, selectedId, activeView }) => {
    const connections = useMemo(() => {
        const result = [];
        artists.forEach(artist => {
            const artistId     = artist.id || artist.Id;
            const artistNodeId = `artist-${artistId}`;
            const artistPos    = getSphericalPos(artistNodeId).pos;
            tracks.forEach(track => {
                const eid = track.artistId || track.ArtistId;
                if (!eid || String(eid) !== String(artistId)) return;
                const seed = hashStr(artistId + (track.id || track.Id));
                result.push({ from: artistPos, to: getSphericalPos(`track-${track.id || track.Id}`).pos, color: '#00d4ff', ownerId: artistNodeId, targetId: `track-${track.id || track.Id}`, phase: (seed % 1000) / 1000 * Math.PI * 2 });
            });
            playlists.forEach(playlist => {
                const eid = playlist.artistId || playlist.ArtistId;
                if (!eid || String(eid) !== String(artistId)) return;
                const seed = hashStr(artistId + (playlist.id || playlist.Id));
                result.push({ from: artistPos, to: getSphericalPos(`playlist-${playlist.id || playlist.Id}`).pos, color: '#ff3d7f', ownerId: artistNodeId, targetId: `playlist-${playlist.id || playlist.Id}`, phase: (seed % 1000) / 1000 * Math.PI * 2 });
            });
        });
        return result;
    }, [artists, tracks, playlists, activeView]);

    const visible = useMemo(() => connections.slice(0, 60), [connections]);

    return (
        <group>
            {visible.map((c) => (
                <ShimmerLine
                    key={`arc-${c.ownerId}-${c.targetId}`}
                    from={c.from} to={c.to} color={c.color} phaseOffset={c.phase}
                    isSelected={selectedId && c.ownerId === selectedId && c.targetId === selectedId}
                    isRelated={selectedId && (c.ownerId === selectedId || c.targetId === selectedId)}
                />
            ))}
        </group>
    );
};

// ─── FLAT CITY-LIGHT NODE ─────────────────────────────────────────────────────
// Sits at NODE_R. depthTest=false → never clipped by globe geometry.

const LightPointNode = ({ id, name, subtitle, color, size = 0.02, isSelected, onClick, cameraDist }) => {
    const billRef  = useRef();
    const ringRef  = useRef();
    const [hovered, setHovered] = useState(false);
    const { pos }  = useMemo(() => getSphericalPos(id), [id]);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    const baseScale = THREE.MathUtils.clamp(cameraDist / 8, 0.55, 1.8);
    const glowTex   = useMemo(() => createGlowTexture(color), [color]);

    useFrame(({ camera, clock }) => {
        if (!billRef.current) return;
        billRef.current.quaternion.copy(camera.quaternion);
        const pulse = isSelected ? 1 + Math.sin(clock.getElapsedTime() * 5) * 0.15 : 1;
        billRef.current.scale.setScalar(baseScale * pulse);
        if (ringRef.current) ringRef.current.rotation.z += isSelected ? 0.018 : 0.004;
    });

    useEffect(() => {
        document.body.style.cursor = hovered ? 'pointer' : 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);

    const DOT  = size * 0.9;
    const RING = size * 1.9;
    const GLOW = size * (isSelected ? 9 : hovered ? 7 : 4.5);
    const RO   = 10;

    return (
        <group position={pos}>
            <mesh
                onPointerDown={(e) => { e.stopPropagation(); onClick(); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[size * 6, 8, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            <group ref={billRef}>
                {glowTex && (
                    <mesh renderOrder={RO}>
                        <planeGeometry args={[GLOW * 2, GLOW * 2]} />
                        <meshBasicMaterial map={glowTex} transparent blending={THREE.AdditiveBlending}
                            opacity={isSelected ? 0.7 : hovered ? 0.55 : 0.30}
                            side={THREE.DoubleSide} depthWrite={false} depthTest={false} toneMapped={false} />
                    </mesh>
                )}
                <mesh renderOrder={RO + 1}>
                    <circleGeometry args={[DOT, 32]} />
                    <meshBasicMaterial color={color} transparent blending={THREE.AdditiveBlending}
                        opacity={isSelected ? 1 : hovered ? 0.95 : 0.92}
                        depthWrite={false} depthTest={false} toneMapped={false} />
                </mesh>
                <mesh ref={ringRef} renderOrder={RO + 1}>
                    <ringGeometry args={[RING * 0.85, RING, 48]} />
                    <meshBasicMaterial color={color} transparent blending={THREE.AdditiveBlending}
                        opacity={isSelected ? 0.80 : hovered ? 0.55 : 0.20}
                        depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
                </mesh>
                {isSelected && (
                    <mesh renderOrder={RO + 1}>
                        <ringGeometry args={[RING * 1.6, RING * 1.72, 48]} />
                        <meshBasicMaterial color={color} transparent blending={THREE.AdditiveBlending}
                            opacity={0.35} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
                    </mesh>
                )}
            </group>

            {(isSelected || hovered) && (
                <>
                    <pointLight distance={0.9} intensity={isSelected ? 5 : 3} color={color} />
                    <Html position={[0, DOT + 0.12, 0]} center zIndexRange={[0, 10]} style={{ pointerEvents: 'none' }}>
                        <div
                            onClick={!isMobile ? (e) => { e.stopPropagation(); onClick(); } : undefined}
                            className={isMobile ? 'pointer-events-none select-none' : 'select-none'}
                            style={{
                                cursor: !isMobile ? 'pointer' : 'default',
                                pointerEvents: !isMobile ? 'auto' : 'none',
                                background: 'rgba(0,0,0,0.92)',
                                border: `1px solid ${color}44`,
                                borderLeft: `2px solid ${color}`,
                                padding: '3px 8px',
                                backdropFilter: 'blur(12px)',
                                boxShadow: `0 0 14px ${color}20`,
                                minWidth: '70px',
                                textAlign: 'left',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <div style={{ color, fontSize: '7px', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: `0 0 6px ${color}99` }}>{name}</div>
                            {subtitle && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '6px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '1px' }}>{subtitle}</div>}
                        </div>
                    </Html>
                </>
            )}
        </group>
    );
};

// ─── FATALE CORE NODE ─────────────────────────────────────────────────────────

const FataleCoreNode = ({ isSelected, onClick, cameraDist, hideLabel }) => {
    const billRef  = useRef();
    const ring1Ref = useRef();
    const ring2Ref = useRef();
    const [hovered, setHovered] = useState(false);
    const COLOR     = '#ff0033';
    const POS       = [0, NODE_R, 0];
    const baseScale = THREE.MathUtils.clamp(cameraDist / 8, 0.55, 1.8);
    const glowTex   = useMemo(() => createGlowTexture(COLOR), []);
    const isMobile  = typeof window !== 'undefined' && window.innerWidth < 1024;
    const RO        = 10;

    useFrame(({ camera, clock }) => {
        const t = clock.getElapsedTime();
        if (billRef.current) {
            billRef.current.quaternion.copy(camera.quaternion);
            billRef.current.scale.setScalar(baseScale * (1 + Math.sin(t * 3.5) * 0.12));
        }
        if (ring1Ref.current) ring1Ref.current.rotation.z += 0.010;
        if (ring2Ref.current) ring2Ref.current.rotation.z -= 0.006;
    });

    useEffect(() => {
        document.body.style.cursor = hovered ? 'pointer' : 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);

    const DOT = 0.075; const R1 = 0.135; const R2 = 0.185; const GLOW = 0.38;

    return (
        <group position={POS}>
            <mesh onPointerDown={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }} onPointerOut={() => setHovered(false)}>
                <sphereGeometry args={[0.28, 8, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <group ref={billRef}>
                {glowTex && (
                    <mesh renderOrder={RO}>
                        <planeGeometry args={[GLOW * 2, GLOW * 2]} />
                        <meshBasicMaterial map={glowTex} transparent blending={THREE.AdditiveBlending} opacity={0.78} side={THREE.DoubleSide} depthWrite={false} depthTest={false} toneMapped={false} />
                    </mesh>
                )}
                <mesh renderOrder={RO + 1}>
                    <circleGeometry args={[DOT, 48]} />
                    <meshBasicMaterial color={COLOR} transparent opacity={0.95} depthWrite={false} depthTest={false} toneMapped={false} blending={THREE.AdditiveBlending} />
                </mesh>
                <mesh ref={ring1Ref} renderOrder={RO + 1}>
                    <ringGeometry args={[R1 * 0.88, R1, 64]} />
                    <meshBasicMaterial color={COLOR} transparent opacity={0.62} depthWrite={false} depthTest={false} toneMapped={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
                </mesh>
                <mesh ref={ring2Ref} renderOrder={RO + 1}>
                    <ringGeometry args={[R2 * 0.92, R2, 64]} />
                    <meshBasicMaterial color={COLOR} transparent opacity={0.30} depthWrite={false} depthTest={false} toneMapped={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
                </mesh>
            </group>
            {!hideLabel && (
                <Html position={[0, 0.28, 0]} center zIndexRange={[0, 5]} style={{ pointerEvents: 'none' }}>
                    <div onClick={!isMobile ? (e) => { e.stopPropagation(); onClick(); } : undefined}
                        style={{ cursor: !isMobile ? 'pointer' : 'default', pointerEvents: !isMobile ? 'auto' : 'none', background: 'rgba(0,0,0,0.90)', borderLeft: `2px solid ${COLOR}`, padding: '3px 8px', backdropFilter: 'blur(14px)' }}>
                        <div style={{ color: COLOR, fontSize: '7px', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', textShadow: `0 0 8px ${COLOR}` }}>FATALE_CORE</div>
                        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '5px', fontFamily: 'monospace', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '1px' }}>SYS_NODE</div>
                    </div>
                </Html>
            )}
            {isSelected && <pointLight distance={1.5} intensity={8} color={COLOR} />}
        </group>
    );
};

// ─── GLOBE CORE ───────────────────────────────────────────────────────────────

const GlobeCore = memo(({
    activeSector, searchQuery,
    communities = [], artists = [], playlists = [], tracks = [],
    selectedId, activeView,
    onArtistClick, onCommunityClick, onTrackClick, onPlaylistClick,
    isGlobeSpinning,
}) => {
    const { camera }    = useThree();
    const [cameraDist, setCameraDist] = useState(10);
    const [seed]        = useState(() => Math.random().toString());

    useFrame(() => setCameraDist(camera.position.length()));

    const activeSectorColor = useMemo(() => SECTORS.find(s => s.id === activeSector)?.color, [activeSector]);

    const filtered = useMemo(() => {
        const bySearch = (arr, key) => !searchQuery ? arr :
            arr.filter(x => (x[key] || x[key[0].toUpperCase() + key.slice(1)] || '').toLowerCase().includes(searchQuery.toLowerCase()));
        const bySector = (arr) => activeSector !== null ? arr.filter(x => (x.sectorId || x.SectorId) === activeSector) : arr;
        const shuffle  = (arr) => arr.map(item => ({ item, k: hashStr((item.id || item.Id || '') + seed) })).sort((a, b) => a.k - b.k).map(x => x.item);

        return {
            communities_: shuffle(bySearch(bySector(communities.filter(c =>
                !c.isSystem && !c.IsSystem && c.id !== 4 && c.Id !== 4 &&
                c.name?.toUpperCase() !== 'FATALE_CORE' && c.Name?.toUpperCase() !== 'FATALE_CORE'
            )), 'name')).slice(0, 25),
            artists_:   shuffle(bySearch(bySector(artists), 'name')).slice(0, 25),
            playlists_: shuffle(bySearch(playlists, 'name')).slice(0, 25),
            tracks_:    shuffle(!searchQuery ? tracks : tracks.filter(t =>
                (t.title || t.Title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.artist || t.Artist || '').toLowerCase().includes(searchQuery.toLowerCase())
            )).slice(0, 25),
        };
    }, [communities, artists, playlists, tracks, activeSector, searchQuery, seed]);

    const { communities_, artists_, playlists_, tracks_ } = filtered;

    const totalNodes  = (
        (activeView === 'COMMUNITIES' || !activeView ? communities_.length : 0) +
        (activeView === 'ARTISTS'     || !activeView ? artists_.length     : 0) +
        (activeView === 'PLAYLISTS'   || !activeView ? playlists_.length   : 0) +
        (activeView === 'TRACKS'      || !activeView ? tracks_.length      : 0)
    );
    const density     = Math.max(0.4, 1 / (1 + 0.015 * totalNodes));
    const accentColor = activeSectorColor || '#ff006e';

    return (
        <group>
            {/* ── GLOBE ── */}

            {/* 1. Opaque solid core — renders first, occludes everything behind it */}
            <Sphere args={[GLOBE_R, 64, 64]} renderOrder={1}>
                <meshStandardMaterial color="#050505" roughness={0.08} metalness={0.92} />
            </Sphere>

            {/* 2. Hair-thin inner accent tint */}
            <Sphere args={[2.46, 32, 32]} renderOrder={2}>
                <meshStandardMaterial color={accentColor} transparent opacity={0.020} emissive={accentColor} emissiveIntensity={0.22} />
            </Sphere>

            {/* 3. Fine wireframe latitude/longitude grid */}
            <Sphere args={[2.50, 36, 18]} renderOrder={3}>
                <meshBasicMaterial color={accentColor} wireframe transparent opacity={0.18} toneMapped={false} />
            </Sphere>

            {/* 4. Atmosphere rim — BackSide, very thin, just like the reference images */}
            <Sphere args={[2.56, 48, 48]} renderOrder={4}>
                <meshBasicMaterial color={accentColor} transparent opacity={0.048} side={THREE.BackSide} toneMapped={false} />
            </Sphere>

            {/* 5. Outer corona — single subtle halo, NOT additive so it doesn't bleed through core */}
            {/* Use FrontSide with a very low opacity — gives the rim glow without see-through */}
            <Sphere args={[2.72, 32, 32]} renderOrder={0}>
                <meshBasicMaterial color={accentColor} transparent opacity={0.032} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
            </Sphere>

            {/* ── NODES ── */}
            {(activeView === 'COMMUNITIES' || !activeView) && communities_.map(c => (
                <LightPointNode key={`comm-${c.id || c.Id}`} id={`comm-${c.id || c.Id}`} name={c.name || c.Name} color="#ffaa00" size={0.055 * density} isSelected={selectedId === `community-${c.id || c.Id}`} cameraDist={cameraDist} onClick={() => onCommunityClick?.(c)} />
            ))}
            {(activeView === 'ARTISTS' || !activeView) && artists_.map(a => (
                <LightPointNode key={`artist-${a.id || a.Id}`} id={`artist-${a.id || a.Id}`} name={a.name || a.Name} color="#00ffaa" size={0.048 * density} isSelected={selectedId === `artist-${a.id || a.Id}`} cameraDist={cameraDist} onClick={() => onArtistClick?.(a)} />
            ))}
            {(activeView === 'TRACKS' || !activeView) && tracks_.map(t => (
                <LightPointNode key={`track-${t.id || t.Id}`} id={`track-${t.id || t.Id}`} name={t.title || t.Title} subtitle={t.artist || t.Artist} color="#00aaff" size={0.038 * density} isSelected={selectedId === `track-${t.id || t.Id}`} cameraDist={cameraDist} onClick={() => onTrackClick?.(t)} />
            ))}
            {(activeView === 'PLAYLISTS' || !activeView) && playlists_.map(p => (
                <LightPointNode key={`playlist-${p.id || p.Id}`} id={`playlist-${p.id || p.Id}`} name={p.name || p.Name} color="#ff006e" size={0.048 * density} isSelected={selectedId === `playlist-${p.id || p.Id}`} cameraDist={cameraDist} onClick={() => onPlaylistClick?.(p)} />
            ))}

            <FataleCoreNode
                isSelected={selectedId === 'system-fatale_core'}
                cameraDist={cameraDist}
                hideLabel={!!selectedId}
                onClick={() => onCommunityClick?.({ id: 'fatale_core', name: 'FATALE_CORE', isSystem: true, description: 'The official Fatale system node. Share feedback, bug reports and reviews.' })}
            />

            <NetworkVisualization artists={artists_} tracks={tracks_} playlists={playlists_} selectedId={selectedId} activeView={activeView} />
        </group>
    );
});

// ─── INTERACTIVE GLOBE ────────────────────────────────────────────────────────

const InteractiveGlobe = memo(({
    activeSector, onSectorClick, searchQuery,
    communities = [], artists = [], selectedId, activeView,
    tracks = [], playlists = [],
    isGlobeSpinning = false,
    onArtistClick, onCommunityClick, onTrackClick, onPlaylistClick, onSelectItem,
}) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const [initialRotation] = useState(() => [0.1, -0.2, 0]);

    return (
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas dpr={[1, 2]} gl={{ logarithmicDepthBuffer: true, antialias: true }}>
                <PerspectiveCamera makeDefault position={[0, 0, isMobile ? 12.5 : 15.5]} fov={isMobile ? 30 : 40} />
                {/* Fog starts far out so stars are fully visible */}
                <fog attach="fog" args={['#000005', 38, 75]} />
                <OrbitControls
                    enablePan={false} enableZoom={true}
                    minDistance={2.8} maxDistance={25}
                    autoRotate={isGlobeSpinning && !selectedId}
                    autoRotateSpeed={isGlobeSpinning ? 0.5 : 0}
                    dampingFactor={0.1} enableDamping rotateSpeed={0.5}
                />

                <StarField />

                <ambientLight intensity={0.18} />
                <pointLight position={[10, 10, 10]} intensity={2.5} color={SECTORS.find(s => s.id === activeSector)?.color || '#ff006e'} />
                <pointLight position={[-8, -8, -8]} intensity={1.6} color="#001833" />

                <Float
                    speed={isGlobeSpinning && !selectedId ? (activeSector !== null ? 0.2 : 1.0) : 0}
                    rotationIntensity={isGlobeSpinning && !selectedId ? (activeSector !== null ? 0.02 : 0.3) : 0}
                    floatIntensity={isGlobeSpinning && !selectedId ? 0.2 : 0}
                >
                    <group rotation={initialRotation}>
                        <GlobeCore
                            activeSector={activeSector} searchQuery={searchQuery}
                            communities={communities} artists={artists}
                            playlists={playlists} tracks={tracks}
                            selectedId={selectedId} activeView={activeView}
                            onArtistClick={onArtistClick} onCommunityClick={onCommunityClick}
                            onTrackClick={onTrackClick} onPlaylistClick={onPlaylistClick}
                            isGlobeSpinning={isGlobeSpinning}
                        />
                    </group>
                </Float>
            </Canvas>
        </div>
    );
});

export default InteractiveGlobe;