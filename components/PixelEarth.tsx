import React, { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

interface PixelEarthProps {
    size?: number;
}

export const PixelEarth: React.FC<PixelEarthProps> = React.memo(({ size = 500 }) => {
    const globeEl = useRef<any>(null);
    const [points, setPoints] = useState<any[]>([]);
    const [hoverD, setHoverD] = useState<object | null>(null);
    const [countries, setCountries] = useState<any[]>([]);

    useEffect(() => {
        // Load Country Data
        fetch('//unpkg.com/world-atlas/countries-110m.json')
            .then(res => res.json())
            .then((data: any) => {
                // @ts-ignore
                import('topojson-client').then(topojson => {
                    setCountries(topojson.feature(data, data.objects.countries).features);
                });
            }).catch(err => console.error("Failed to load map data", err));

        // Generate random "data" points to form a cyber-cloud look
        // ... (existing point generation code)
        const N = 1000;
        const gData = [...Array(N).keys()].map(() => ({
            lat: (Math.random() - 0.5) * 180,
            lng: (Math.random() - 0.5) * 360,
            weight: Math.random(),
            color: Math.random() > 0.5 ? '#06b6d4' : '#39ff14' // Cyan or Green
        }));
        setPoints(gData);

        // Auto-rotate
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 2.5;
            globeEl.current.controls().enableZoom = false;
        }
    }, [size]);

    return (
        <div
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-cyber-cyan/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

            {/* Tooltip */}
            {hoverD && (
                <div className="absolute z-50 pointer-events-none bg-black/80 border border-cyber-cyan/50 p-2 rounded backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.4)] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-10">
                    <div className="text-cyber-cyan font-pixel text-xs uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-ping"></div>
                        {/* @ts-ignore */}
                        {hoverD.properties.name}
                    </div>
                </div>
            )}

            <Globe
                ref={globeEl}
                width={size}
                height={size}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

                // Hex Binning (The "Pixel" Look)
                hexBinPointsData={points}
                hexBinPointWeight="weight"
                hexAltitude={d => d.sumWeight * 0.05} // Altitude based on density
                hexTopColor={d => '#06b6d4'} // Cyan tops
                hexSideColor={d => '#0e7490'} // Darker cyan sides
                hexBinResolution={3} // Resolution of grid
                hexMargin={0.2} // Gap between hexes

                // Polygons (Countries)
                polygonsData={countries}
                polygonAltitude={0.01}
                polygonCapColor={d => d === hoverD ? 'rgba(6, 182, 212, 0.3)' : 'rgba(0,0,0,0)'} // Highlight on hover, invisible otherwise
                polygonSideColor={() => 'rgba(0,0,0,0)'}
                polygonStrokeColor={() => 'rgba(6, 182, 212, 0.1)'} // Subtle borders
                onPolygonHover={setHoverD}
                polygonsTransitionDuration={300}

                // Atmosphere
                atmosphereColor="#06b6d4"
                atmosphereAltitude={0.15}
            />
        </div>
    );
}); // Memoized to prevent re-renders during parent animation frames

PixelEarth.displayName = 'PixelEarth';
