
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';


export const Background3D: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Scene Setup
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.001);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Renderer Setup
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);

        // --- Warp Speed Stars ---
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 6000;
        const posArray = new Float32Array(starCount * 3);
        const velocityArray = new Float32Array(starCount); // Store individual speeds

        for (let i = 0; i < starCount; i++) {
            posArray[i * 3] = (Math.random() - 0.5) * 600; // x
            posArray[i * 3 + 1] = (Math.random() - 0.5) * 600; // y
            posArray[i * 3 + 2] = (Math.random() - 0.5) * 600; // z
            velocityArray[i] = 0; // Initial velocity
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: 0.7,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const starMesh = new THREE.Points(starGeometry, starMaterial);
        scene.add(starMesh);

        // --- Grid Floor (Cyberpunk style) ---
        const gridHelper = new THREE.GridHelper(200, 50, 0x06b6d4, 0x111111);
        gridHelper.position.y = -50;
        scene.add(gridHelper);

        camera.position.z = 1;

        // Mouse Interaction
        let mouseX = 0;
        let mouseY = 0;
        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;

        const handleMouseMove = (event: MouseEvent) => {
            mouseX = (event.clientX - windowHalfX) * 0.05;
            mouseY = (event.clientY - windowHalfY) * 0.05;
        };

        document.addEventListener('mousemove', handleMouseMove);

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);

            // Rotate entire star system slightly for dynamic feel
            starMesh.rotation.z += 0.0005;

            // Move stars towards camera (Warp Effect)
            const positions = starGeometry.attributes.position.array as Float32Array;

            for (let i = 0; i < starCount; i++) {
                // Update Z position
                // Base speed + mouse influence
                let speed = 2;

                // Move star towards camera
                positions[i * 3 + 2] += speed;

                // Reset star if it passes camera
                if (positions[i * 3 + 2] > 200) {
                    positions[i * 3 + 2] = -400; // Send back to far distance
                    startRandomPos(i); // Randomize X/Y
                }
            }

            starGeometry.attributes.position.needsUpdate = true;

            // Camera follow mouse slightly
            camera.position.x += (mouseX - camera.position.x) * 0.05;
            camera.position.y += (-mouseY - camera.position.y) * 0.05;

            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        };

        const startRandomPos = (i: number) => {
            const positions = starGeometry.attributes.position.array as Float32Array;
            positions[i * 3] = (Math.random() - 0.5) * 600;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
        }

        animate();

        // Resize Handler
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
            starGeometry.dispose();
            starMaterial.dispose();
            renderer.dispose();
        };

    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[-10] bg-black"
        />
    );
};

