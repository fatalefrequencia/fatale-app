import React, { useRef, useMemo, useEffect, useState, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SECTORS } from '../../constants';

// ─── UTILS ────────────────────────────────────────────────────────────────────

const hashStr = (s) => {
    if (!s) return 0;
    let h = 0;
    const str = s.toString();
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

const getSphericalPos = (id, radius = 2.5) => {
    const h = hashStr(id);
    const rand1 = (Math.abs(Math.sin(h * 127.1)) * 10000) % 1;
    const rand2 = (Math.abs(Math.sin(h * 311.7)) * 10000) % 1;
    const lon = rand1 * Math.PI * 2;
    const lat = Math.asin(rand2 * 2 - 1);
    const r = radius;
    return {
        pos: [
            r * Math.cos(lat) * Math.cos(lon),
            r * Math.sin(lat),
            r * Math.cos(lat) * Math.sin(lon),
        ],
        lat,
        lon,
    };
};

const createGlowTexture = (color) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
};

// Builds a bezier arc that cleanly clears the globe surface (radius 2.48)
const buildArc = (from, to) => {
    const f = new THREE.Vector3(...from);
    const t = new THREE.Vector3(...to);
    const mid = new THREE.Vector3().addVectors(f, t).multiplyScalar(0.5);
    // Normalize then push to arc height well above globe surface
    mid.normalize().multiplyScalar(4.8);
    return new THREE.QuadraticBezierCurve3(f, mid, t);
};

// ─── TRAVELING PULSE ──────────────────────────────────────────────────────────
// A single animated dot that travels along a pre-built bezier curve.
// Multiple instances are staggered in phase to create a heartbeat feel.

const TravelingPulse = ({ curve, color, speed = 0.28, phaseOffset = 0, size = 0.022 }) => {
    const meshRef = useRef();
    const tRef = useRef(phaseOffset % 1);

    useFrame((_, delta) => {
        if (!meshRef.current) return;

        tRef.current += delta * speed;
        if (tRef.current > 1.15) tRef.current = -0.15; // loop with brief fade gap

        const clamped = Math.max(0, Math.min(1, tRef.current));

        if (tRef.current < 0 || tRef.current > 1) {
            meshRef.current.visible = false;
            return;
        }

        meshRef.current.visible = true;
        const pos = curve.getPoint(clamped);
        meshRef.current.position.copy(pos);

        // Smooth fade in/out at path endpoints
        const fade = Math.sin(clamped * Math.PI);
        meshRef.current.material.opacity = fade * 0.9;
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[size, 8, 8]} />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={0}
                toneMapped={false}
                depthWrite={false}
            />
        </mesh>
    );
};

// ─── CONSTELLATION LINE ───────────────────────────────────────────────────────
// Appears only when a node is selected. Fades in smoothly from opacity 0.

const ConstellationLine = memo(({ from, to, color }) => {
    const lineRef = useRef();
    const opRef   = useRef(0);

    const geo = useMemo(() => {
        const curve = buildArc(from, to);
        const pts   = curve.getPoints(60);
        return new THREE.BufferGeometry().setFromPoints(pts);
    }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

    useEffect(() => () => geo.dispose(), [geo]);

    // Reset on remount so re-selecting animates in fresh
    useEffect(() => { opRef.current = 0; }, []);

    useFrame((_, delta) => {
        if (!lineRef.current) return;
        opRef.current = Math.min(opRef.current + delta * 2.5, 0.55);
        lineRef.current.material.opacity = opRef.current;
    });

    return (
        <line ref={lineRef} geometry={geo}>
            <lineBasicMaterial
                color={color}
                transparent
                opacity={0}
                linewidth={1}
                toneMapped={false}
                depthWrite={false}
            />
        </line>
    );
});

// ─── NETWORK VISUALIZATION ────────────────────────────────────────────────────
// Resting state  → ambient traveling pulses along invisible paths (heartbeat)
// Selected state → constellation lines bloom out from the chosen node,
//                  plus extra/faster pulses on those specific connections

const NetworkVisualization = ({ artists, tracks, playlists, selectedId, activeView }) => {

    // Build all connections once (memoised on data change)
    const connections = useMemo(() => {
        const result = [];
        artists.forEach(artist => {
            const artistId     = artist.id     || artist.Id;
            const artistNodeId = `artist-${artistId}`;
            const artistPos    = getSphericalPos(artistNodeId, 2.48).pos;

        // TRACKS — trust the enriched artistId stamped by tracksWithColor in DiscoveryHUD
        tracks.forEach(track => {
            const enrichedArtistId = track.artistId || track.ArtistId;
            if (!enrichedArtistId || String(enrichedArtistId) !== String(artistId)) return;

            const trackPos = getSphericalPos(`track-${track.id || track.Id}`, 2.48).pos;
            const seed     = hashStr(artistId + (track.id || track.Id));
            result.push({
                from: artistPos, to: trackPos,
                color: '#00d4ff',
                ownerId:  artistNodeId,
                targetId: `track-${track.id || track.Id}`,
                speed:    0.22 + (seed % 100) / 300,
                phase:    (seed % 1000) / 1000,
            });
        });

        // PLAYLISTS — artistId is pre-resolved upstream by playlistsWithArtist in DiscoveryHUD
        playlists.forEach(playlist => {
            const enrichedArtistId = playlist.artistId || playlist.ArtistId;
            if (!enrichedArtistId || String(enrichedArtistId) !== String(artistId)) return;

            const plPos = getSphericalPos(`playlist-${playlist.id || playlist.Id}`, 2.48).pos;
            const seed  = hashStr(artistId + (playlist.id || playlist.Id));
            result.push({
                from: artistPos, to: plPos,
                color: '#ff3d7f',
                ownerId:  artistNodeId,
                targetId: `playlist-${playlist.id || playlist.Id}`,
                speed:    0.18 + (seed % 100) / 350,
                phase:    (seed % 1000) / 1000,
            });
        });
        });
        return result;
    }, [artists, tracks, playlists, activeView]);

    // Pre-build curves (expensive — only recompute when connections change)
    const withCurves = useMemo(() =>
        connections.map(c => ({ ...c, curve: buildArc(c.from, c.to) })),
    [connections]);

    // Connections that belong to the selected node
    const selected = useMemo(() => {
        if (!selectedId) return [];
        return withCurves.filter(c =>
            c.ownerId === selectedId || c.targetId === selectedId
        );
    }, [withCurves, selectedId]);

    // All connections for ambient pulses (capped to keep GPU happy)
    const ambient = useMemo(() => withCurves.slice(0, 40), [withCurves]);

    return (
        <group>
            {/* ── AMBIENT PULSES (resting heartbeat) ── */}
            {ambient.map((c, i) => {
                const isRelated = selectedId &&
                    (c.ownerId === selectedId || c.targetId === selectedId);
                // Hide ambient pulses on unrelated connections when something is selected
                // so the selected constellation reads cleanly
                if (selectedId && !isRelated) return null;

                return (
                    <TravelingPulse
                        key={`pulse-${c.ownerId}-${c.targetId}`}
                        curve={c.curve}
                        color={c.color}
                        speed={isRelated ? c.speed * 1.6 : c.speed}
                        phaseOffset={c.phase}
                        size={isRelated ? 0.030 : 0.020}
                    />
                );
            })}

            {/* ── CONSTELLATION LINES (selected reveal) ── */}
            {selected.map(c => (
                <ConstellationLine
                    key={`constellation-${c.ownerId}-${c.targetId}`}
                    from={c.from}
                    to={c.to}
                    color={c.color}
                />
            ))}
        </group>
    );
};

// ─── LIGHT POINT NODE ─────────────────────────────────────────────────────────

const LightPointNode = ({ id, name, subtitle, color, size = 0.02, isSelected, onClick, cameraDist }) => {
    const meshRef    = useRef();
    const [hovered, setHovered] = useState(false);
    const { pos }    = useMemo(() => getSphericalPos(id, 2.48), [id]);
    const opacityFactor = THREE.MathUtils.clamp((14 - cameraDist) / 4, 0.5, 1);
    const scaleFactor   = THREE.MathUtils.clamp(cameraDist / 6, 0.8, 2);
    const glowTexture   = useMemo(() => createGlowTexture(color), [color]);

    useEffect(() => {
        document.body.style.cursor = hovered ? 'pointer' : 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        if (isSelected) {
            const pulse = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.2;
            meshRef.current.scale.setScalar(scaleFactor * pulse);
        } else {
            meshRef.current.scale.setScalar(scaleFactor);
        }
    });

    return (
        <group position={pos}>
            {/* Core sphere */}
            <mesh
                ref={meshRef}
                scale={[scaleFactor, scaleFactor, scaleFactor]}
                onPointerDown={(e) => { e.stopPropagation(); onClick(); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[size, 16, 16]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isSelected ? 3.5 : 2}
                    toneMapped={false}
                    transparent
                    opacity={opacityFactor}
                    roughness={0.1}
                    metalness={0.8}
                />
            </mesh>

            {/* Soft glow halo */}
            {glowTexture && (
                <mesh
                    scale={[
                        size * (isSelected ? 18 : 12) * scaleFactor,
                        size * (isSelected ? 18 : 12) * scaleFactor,
                        1,
                    ]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                >
                    <planeGeometry />
                    <meshBasicMaterial
                        map={glowTexture}
                        transparent
                        blending={THREE.AdditiveBlending}
                        opacity={opacityFactor * (isSelected ? 1 : 0.65)}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                        toneMapped={false}
                    />
                </mesh>
            )}

            {/* Minimal label — shown on hover or selection */}
            {(isSelected || hovered) && (
                <>
                    <pointLight distance={1.2} intensity={isSelected ? 6 : 4} color={color} />
                    <Html position={[0, size + 0.1, 0]} center zIndexRange={[0, 10]}>
                        <div
                            className="pointer-events-none select-none"
                            style={{
                                background: 'rgba(0,0,0,0.92)',
                                border: `1px solid ${color}45`,
                                padding: '4px 10px',
                                backdropFilter: 'blur(14px)',
                                boxShadow: `0 0 18px ${color}20`,
                                minWidth: '80px',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{
                                color,
                                fontSize: '8px',
                                fontFamily: 'monospace',
                                fontWeight: 900,
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                textShadow: `0 0 8px ${color}70`,
                            }}>
                                {name}
                            </div>
                            {subtitle && (
                                <div style={{
                                    color: 'rgba(255,255,255,0.3)',
                                    fontSize: '6px',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase',
                                    marginTop: '2px',
                                }}>
                                    {subtitle}
                                </div>
                            )}
                        </div>
                    </Html>
                </>
            )}
        </group>
    );
};

// ─── FATALE CORE NODE ─────────────────────────────────────────────────────────

const FataleCoreNode = ({ isSelected, onClick, cameraDist, hideLabel }) => {
    const meshRef = useRef();
    const ringRef = useRef();
    const [hovered, setHovered] = useState(false);
    const COLOR       = '#ff0033';
    const POS         = [0, 2.48, 0];
    const scaleFactor = THREE.MathUtils.clamp(cameraDist / 6, 0.8, 2);
    const glowTex     = useMemo(() => createGlowTexture(COLOR), []);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (meshRef.current) {
            const pulse = 1 + Math.sin(t * 3) * 0.15;
            meshRef.current.scale.setScalar(scaleFactor * pulse);
        }
        if (ringRef.current) ringRef.current.rotation.z += 0.008;
    });

    useEffect(() => {
        document.body.style.cursor = hovered ? 'pointer' : 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);

    return (
        <group position={POS}>
            <mesh
                ref={meshRef}
                onPointerDown={(e) => { e.stopPropagation(); onClick(); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[0.12, 32, 32]} />
                <meshStandardMaterial
                    color={COLOR} emissive={COLOR} emissiveIntensity={3}
                    toneMapped={false} roughness={0.05} metalness={0.9}
                />
            </mesh>

            <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.22, 0.007, 8, 64]} />
                <meshBasicMaterial color={COLOR} toneMapped={false} transparent opacity={0.55} />
            </mesh>

            {glowTex && (
                <mesh
                    scale={[0.12 * 14 * scaleFactor, 0.12 * 14 * scaleFactor, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                >
                    <planeGeometry />
                    <meshBasicMaterial
                        map={glowTex} transparent blending={THREE.AdditiveBlending}
                        opacity={0.85} side={THREE.DoubleSide} depthWrite={false} toneMapped={false}
                    />
                </mesh>
            )}

            {!hideLabel && (
                <Html position={[0, 0.32, 0]} center zIndexRange={[0, 5]}>
                    <div
                        className="pointer-events-none select-none"
                        style={{
                            background: 'rgba(0,0,0,0.88)',
                            borderLeft: `2px solid ${COLOR}`,
                            padding: '3px 8px',
                            backdropFilter: 'blur(16px)',
                        }}
                    >
                        <div style={{
                            color: COLOR, fontSize: '7px', fontFamily: 'monospace',
                            fontWeight: 900, letterSpacing: '0.3em',
                            textTransform: 'uppercase', textShadow: `0 0 10px ${COLOR}`,
                        }}>
                            FATALE_CORE
                        </div>
                        <div style={{
                            color: 'rgba(255,255,255,0.22)', fontSize: '5px',
                            fontFamily: 'monospace', letterSpacing: '0.2em',
                            textTransform: 'uppercase', marginTop: '1px',
                        }}>
                            SYS_NODE
                        </div>
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
    const { camera }      = useThree();
    const [cameraDist, setCameraDist] = useState(10);
    const [seed]          = useState(() => Math.random().toString());
    const atmosphereRef   = useRef();
    const innerLightRef   = useRef();

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        setCameraDist(camera.position.length());
        if (atmosphereRef.current)
            atmosphereRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.005);
        if (innerLightRef.current)
            innerLightRef.current.intensity = 1.0 + Math.sin(t * 2) * 0.4;
    });

    const activeSectorColor = useMemo(() =>
        SECTORS.find(s => s.id === activeSector)?.color,
    [activeSector]);

    // ── filtered data helpers ──────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const bySearch = (arr, key) => !searchQuery ? arr :
            arr.filter(x => (x[key] || x[key[0].toUpperCase() + key.slice(1)] || '')
                .toLowerCase().includes(searchQuery.toLowerCase()));

        const bySector = (arr) => activeSector !== null
            ? arr.filter(x => (x.sectorId || x.SectorId) === activeSector) : arr;

        const shuffle = (arr) => arr
            .map(item => ({ item, k: hashStr((item.id || item.Id || '') + seed) }))
            .sort((a, b) => a.k - b.k)
            .map(x => x.item);

        const communities_ = shuffle(
            bySearch(bySector(
                communities.filter(c =>
                    !c.isSystem && !c.IsSystem &&
                    c.id !== 4 && c.Id !== 4 &&
                    c.name?.toUpperCase() !== 'FATALE_CORE' &&
                    c.Name?.toUpperCase() !== 'FATALE_CORE'
                )
            ), 'name')
        ).slice(0, 25);

        const artists_ = shuffle(bySearch(bySector(artists), 'name')).slice(0, 25);

        const playlists_ = shuffle(bySearch(playlists, 'name')).slice(0, 25);

        const tracks_ = shuffle(
            !searchQuery ? tracks : tracks.filter(t =>
                (t.title  || t.Title  || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.artist || t.Artist || '').toLowerCase().includes(searchQuery.toLowerCase())
            )
        ).slice(0, 25);

        return { communities_, artists_, playlists_, tracks_ };
    }, [communities, artists, playlists, tracks, activeSector, searchQuery, seed]);

    const { communities_, artists_, playlists_, tracks_ } = filtered;

    const totalNodes = (
        (activeView === 'COMMUNITIES' || !activeView ? communities_.length : 0) +
        (activeView === 'ARTISTS'     || !activeView ? artists_.length     : 0) +
        (activeView === 'PLAYLISTS'   || !activeView ? playlists_.length   : 0) +
        (activeView === 'TRACKS'      || !activeView ? tracks_.length      : 0)
    );
    const density = Math.max(0.4, 1 / (1 + 0.015 * totalNodes));

    const accentColor = activeSectorColor || '#ff006e';

    return (
        <group>
            <pointLight ref={innerLightRef} color={accentColor} intensity={1} distance={5} />

            {/* Globe layers */}
            <Sphere args={[2.45, 64, 64]}>
                <meshStandardMaterial color="#080808" roughness={0.15} metalness={0.9} />
            </Sphere>
            <Sphere args={[2.46, 32, 32]}>
                <meshStandardMaterial
                    color={accentColor} transparent opacity={0.04}
                    emissive={accentColor} emissiveIntensity={0.4}
                />
            </Sphere>
            <Sphere args={[2.52, 48, 48]}>
                <meshStandardMaterial
                    color={accentColor} wireframe
                    transparent opacity={0.04}
                    emissive={accentColor} emissiveIntensity={0.25}
                />
            </Sphere>
            <Sphere ref={atmosphereRef} args={[2.58, 64, 64]}>
                <meshBasicMaterial color={accentColor} transparent opacity={0.08} side={THREE.BackSide} />
            </Sphere>

            {/* ── NODES ── */}
            {(activeView === 'COMMUNITIES' || !activeView) && communities_.map(c => (
                <LightPointNode
                    key={`comm-${c.id || c.Id}`}
                    id={`comm-${c.id || c.Id}`}
                    name={c.name || c.Name}
                    color="#ffaa00"
                    size={0.1 * density}
                    isSelected={selectedId === `community-${c.id || c.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onCommunityClick?.(c)}
                />
            ))}

            {(activeView === 'ARTISTS' || !activeView) && artists_.map(a => (
                <LightPointNode
                    key={`artist-${a.id || a.Id}`}
                    id={`artist-${a.id || a.Id}`}
                    name={a.name || a.Name}
                    color="#00ffaa"
                    size={0.08 * density}
                    isSelected={selectedId === `artist-${a.id || a.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onArtistClick?.(a)}
                />
            ))}

            {(activeView === 'TRACKS' || !activeView) && tracks_.map(t => (
                <LightPointNode
                    key={`track-${t.id || t.Id}`}
                    id={`track-${t.id || t.Id}`}
                    name={t.title || t.Title}
                    subtitle={t.artist || t.Artist}
                    color="#00aaff"
                    size={0.06 * density}
                    isSelected={selectedId === `track-${t.id || t.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onTrackClick?.(t)}
                />
            ))}

            {(activeView === 'PLAYLISTS' || !activeView) && playlists_.map(p => (
                <LightPointNode
                    key={`playlist-${p.id || p.Id}`}
                    id={`playlist-${p.id || p.Id}`}
                    name={p.name || p.Name}
                    color="#ff006e"
                    size={0.08 * density}
                    isSelected={selectedId === `playlist-${p.id || p.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onPlaylistClick?.(p)}
                />
            ))}

            {/* FATALE_CORE — permanent system node */}
            <FataleCoreNode
                isSelected={selectedId === 'system-fatale_core'}
                cameraDist={cameraDist}
                hideLabel={!!selectedId}
                onClick={() => onCommunityClick?.({
                    id: 'fatale_core', name: 'FATALE_CORE', isSystem: true,
                    description: 'The official Fatale system node. Share feedback, bug reports and reviews.',
                })}
            />

            {/* ── NETWORK: traveling pulses + constellation lines ── */}
            <NetworkVisualization
                artists={artists_}
                tracks={tracks_}
                playlists={playlists_}
                selectedId={selectedId}
                activeView={activeView}
            />
        </group>
    );
});

// ─── INTERACTIVE GLOBE (root export) ─────────────────────────────────────────

const InteractiveGlobe = memo(({
    activeSector, onSectorClick,
    searchQuery,
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
                <PerspectiveCamera
                    makeDefault
                    position={[0, 0, isMobile ? 12.5 : 15.5]}
                    fov={isMobile ? 30 : 40}
                />
                <fog attach="fog" args={['#000000', 8, 30]} />
                <OrbitControls
                    enablePan={false}
                    enableZoom={true}
                    minDistance={2.8}
                    maxDistance={25}
                    autoRotate={isGlobeSpinning && !selectedId}
                    autoRotateSpeed={isGlobeSpinning ? 0.5 : 0}
                    dampingFactor={0.1}
                    enableDamping={true}
                    rotateSpeed={0.5}
                />

                <ambientLight intensity={0.35} />
                <pointLight
                    position={[10, 10, 10]} intensity={3.5}
                    color={SECTORS.find(s => s.id === activeSector)?.color || '#ff006e'}
                />
                <pointLight position={[-10, -10, -10]} intensity={2.5} color="#00ffff" />
                <spotLight position={[0, 20, 0]} intensity={2} angle={0.5} penumbra={1} color="#ffffff" />

                <Float
                    speed={isGlobeSpinning && !selectedId ? (activeSector !== null ? 0.2 : 1.0) : 0}
                    rotationIntensity={isGlobeSpinning && !selectedId ? (activeSector !== null ? 0.02 : 0.3) : 0}
                    floatIntensity={isGlobeSpinning && !selectedId ? 0.2 : 0}
                >
                    <group rotation={initialRotation}>
                        <GlobeCore
                            activeSector={activeSector}
                            searchQuery={searchQuery}
                            communities={communities}
                            artists={artists}
                            playlists={playlists}
                            tracks={tracks}
                            selectedId={selectedId}
                            activeView={activeView}
                            onArtistClick={onArtistClick}
                            onCommunityClick={onCommunityClick}
                            onTrackClick={onTrackClick}
                            onPlaylistClick={onPlaylistClick}
                            isGlobeSpinning={isGlobeSpinning}
                        />
                    </group>
                </Float>


            </Canvas>
        </div>
    );
});

export default InteractiveGlobe;