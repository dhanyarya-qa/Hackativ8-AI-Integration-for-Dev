/* ═══════════════════════════════════════════════════════════
   Three.js Particle Constellation Background
   ═══════════════════════════════════════════════════════════ */

(function () {
    const container = document.getElementById('three-canvas');
    if (!container) return;

    const isDark = () => document.body.classList.contains('dark-mode') ||
        getComputedStyle(document.body).backgroundColor === 'rgb(5, 5, 7)';

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: container, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);

    camera.position.z = 30;

    // Particles
    const PARTICLE_COUNT = 120;
    const CONNECTION_DISTANCE = 12;
    const MOUSE_RADIUS = 15;

    const particles = [];
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const emerald = new THREE.Color(0x00d992);
    const purple = new THREE.Color(0x818cf8);
    const white = new THREE.Color(0xffffff);
    const darkGray = new THREE.Color(0x555555);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = (Math.random() - 0.5) * 60;
        const y = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 20;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const colorChoice = Math.random();
        const c = colorChoice > 0.6 ? emerald : colorChoice > 0.3 ? purple : white;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        particles.push({
            x, y, z,
            vx: (Math.random() - 0.5) * 0.02,
            vy: (Math.random() - 0.5) * 0.02,
            vz: (Math.random() - 0.5) * 0.01,
            originalColor: c.clone()
        });
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });

    const points = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(points);

    // Lines for connections
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00d992,
        transparent: true,
        opacity: 0.12
    });
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Mouse interaction
    const mouse = new THREE.Vector2(9999, 9999);
    const raycaster = new THREE.Raycaster();
    const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const mouse3D = new THREE.Vector3();

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    container.addEventListener('mouseleave', () => {
        mouse.set(9999, 9999);
    });

    // Resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }, 150);
    });

    // Animation
    let animationId;
    let frame = 0;

    function animate() {
        animationId = requestAnimationFrame(animate);
        frame++;

        // Skip every 2nd frame on mobile for performance
        if (window.matchMedia('(pointer: coarse)').matches && frame % 2 !== 0) return;

        const posAttr = particleGeometry.attributes.position;
        const colorAttr = particleGeometry.attributes.color;

        // Raycast mouse to 3D plane
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(mousePlane, mouse3D);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p = particles[i];

            // Update position
            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;

            // Boundary bounce
            if (Math.abs(p.x) > 30) p.vx *= -1;
            if (Math.abs(p.y) > 20) p.vy *= -1;
            if (Math.abs(p.z) > 10) p.vz *= -1;

            // Mouse repulsion
            if (mouse3D) {
                const dx = p.x - mouse3D.x;
                const dy = p.y - mouse3D.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MOUSE_RADIUS && dist > 0.1) {
                    const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.08;
                    p.x += (dx / dist) * force;
                    p.y += (dy / dist) * force;
                }
            }

            posAttr.array[i * 3] = p.x;
            posAttr.array[i * 3 + 1] = p.y;
            posAttr.array[i * 3 + 2] = p.z;

            // Pulse color on mouse proximity
            if (mouse3D) {
                const dx = p.x - mouse3D.x;
                const dy = p.y - mouse3D.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 8) {
                    const intensity = 1 - (dist / 8);
                    colorAttr.array[i * 3] = THREE.MathUtils.lerp(p.originalColor.r, 1, intensity * 0.5);
                    colorAttr.array[i * 3 + 1] = THREE.MathUtils.lerp(p.originalColor.g, 1, intensity * 0.5);
                    colorAttr.array[i * 3 + 2] = THREE.MathUtils.lerp(p.originalColor.b, 1, intensity * 0.5);
                } else {
                    colorAttr.array[i * 3] = p.originalColor.r;
                    colorAttr.array[i * 3 + 1] = p.originalColor.g;
                    colorAttr.array[i * 3 + 2] = p.originalColor.b;
                }
            }
        }

        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;

        // Update connections
        const linePos = lines.geometry.attributes.position;
        let lineIdx = 0;
        let connections = 0;
        const maxConnections = 400;

        for (let i = 0; i < PARTICLE_COUNT && connections < maxConnections; i++) {
            for (let j = i + 1; j < PARTICLE_COUNT && connections < maxConnections; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dz = particles[i].z - particles[j].z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < CONNECTION_DISTANCE) {
                    linePos.array[lineIdx++] = particles[i].x;
                    linePos.array[lineIdx++] = particles[i].y;
                    linePos.array[lineIdx++] = particles[i].z;
                    linePos.array[lineIdx++] = particles[j].x;
                    linePos.array[lineIdx++] = particles[j].y;
                    linePos.array[lineIdx++] = particles[j].z;
                    connections++;
                }
            }
        }

        // Hide unused lines
        for (let i = lineIdx; i < linePos.array.length; i++) {
            linePos.array[i] = 0;
        }
        linePos.needsUpdate = true;

        // Gentle camera sway
        camera.position.x = Math.sin(frame * 0.001) * 0.5;
        camera.position.y = Math.cos(frame * 0.0015) * 0.3;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    // Visibility handling
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!animationId) animate();
            } else {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            }
        });
    }, { threshold: 0.1 });

    observer.observe(container);

    animate();
})();
