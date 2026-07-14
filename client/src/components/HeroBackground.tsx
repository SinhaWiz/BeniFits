import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function createGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function HeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.z = 16;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // --- Groups ---------------------------------------------------------
    // The node field is split into independent clusters, each with its own
    // wandering home center. Only the cluster nearest the pointer gathers
    // toward it; every other cluster keeps drifting on its own.
    const groupCount = 7;
    const nodesPerGroup = 26;
    const nodeCount = groupCount * nodesPerGroup;

    const groupHomes: THREE.Vector3[] = [];
    const groupCenters: THREE.Vector3[] = [];
    const groupColors: THREE.Color[] = [];
    const groupOrbitPhase: number[] = [];
    for (let g = 0; g < groupCount; g += 1) {
      groupHomes.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 34,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 14,
        ),
      );
      groupCenters.push(groupHomes[g].clone());
      const hue = (200 + (g / groupCount) * 70) / 360;
      groupColors.push(new THREE.Color().setHSL(hue, 0.7, 0.58));
      groupOrbitPhase.push(Math.random() * Math.PI * 2);
    }

    const positions = new Float32Array(nodeCount * 3);
    const velocities = new Float32Array(nodeCount * 3);
    const idleOffsets = new Float32Array(nodeCount * 3);
    const pointerOffsets = new Float32Array(nodeCount * 3);
    const breathePhase = new Float32Array(nodeCount);
    const nodeGroup = new Int16Array(nodeCount);
    const colors = new Float32Array(nodeCount * 3);

    for (let g = 0; g < groupCount; g += 1) {
      for (let n = 0; n < nodesPerGroup; n += 1) {
        const i = g * nodesPerGroup + n;
        const ix = i * 3;
        const idleOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 3.4,
          (Math.random() - 0.5) * 3.4,
          (Math.random() - 0.5) * 3.4,
        );
        positions[ix] = groupHomes[g].x + idleOffset.x;
        positions[ix + 1] = groupHomes[g].y + idleOffset.y;
        positions[ix + 2] = groupHomes[g].z + idleOffset.z;
        idleOffsets[ix] = idleOffset.x;
        idleOffsets[ix + 1] = idleOffset.y;
        idleOffsets[ix + 2] = idleOffset.z;
        pointerOffsets[ix] = (Math.random() - 0.5) * 2.2;
        pointerOffsets[ix + 1] = (Math.random() - 0.5) * 2.2;
        pointerOffsets[ix + 2] = (Math.random() - 0.5) * 2.2;
        breathePhase[i] = Math.random() * Math.PI * 2;
        nodeGroup[i] = g;

        const color = groupColors[g];
        colors[ix] = color.r;
        colors[ix + 1] = color.g;
        colors[ix + 2] = color.b;
      }
    }

    const glowTexture = createGlowTexture();
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    nodeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const nodeMaterial = new THREE.PointsMaterial({
      size: 0.55,
      map: glowTexture,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
    scene.add(nodes);

    // --- Connecting lines within nearby nodes ----------------------------
    const maxSegments = nodeCount * 8;
    const linePositions = new Float32Array(maxSegments * 6);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    const connectionDistance = 2.6;
    const connectionDistanceSq = connectionDistance * connectionDistance;

    // --- Pointer tracking -------------------------------------------------
    const pointerNdc = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    const convergencePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const pointerWorld = new THREE.Vector3(0, 0, 0);
    const previousPointerWorld = new THREE.Vector3(0, 0, 0);
    const intersection = new THREE.Vector3();
    let pointerActive = false;
    let shakeEnergy = 0;

    function handlePointerMove(event: PointerEvent) {
      pointerNdc.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerNdc.y = -(event.clientY / window.innerHeight) * 2 + 1;
      pointerActive = true;
    }
    function handlePointerLeave() {
      pointerActive = false;
    }
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);
    document.addEventListener('mouseleave', handlePointerLeave);

    let frameId = 0;
    let elapsed = 0;
    let activeGroup = -1;

    function animate() {
      frameId = requestAnimationFrame(animate);
      elapsed += 0.01;

      if (!prefersReducedMotion) {
        // Slowly wander each group's home center for a "living" idle scene.
        for (let g = 0; g < groupCount; g += 1) {
          const t = elapsed * 0.15 + groupOrbitPhase[g];
          groupCenters[g].set(
            groupHomes[g].x + Math.sin(t) * 2.2,
            groupHomes[g].y + Math.cos(t * 0.8) * 1.6,
            groupHomes[g].z,
          );
        }

        if (pointerActive) {
          raycaster.setFromCamera(pointerNdc, camera);
          if (raycaster.ray.intersectPlane(convergencePlane, intersection)) {
            previousPointerWorld.copy(pointerWorld);
            pointerWorld.copy(intersection);
            const speed = pointerWorld.distanceTo(previousPointerWorld);
            shakeEnergy = shakeEnergy * 0.86 + speed * 1.4;
          }

          // Pick the nearest group, with a little hysteresis so the
          // "handoff" between neighboring groups doesn't flicker.
          let nearestGroup = 0;
          let nearestDist = Infinity;
          for (let g = 0; g < groupCount; g += 1) {
            const dist = groupCenters[g].distanceTo(pointerWorld);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestGroup = g;
            }
          }
          if (activeGroup === -1) {
            activeGroup = nearestGroup;
          } else if (nearestGroup !== activeGroup) {
            const currentDist = groupCenters[activeGroup].distanceTo(pointerWorld);
            if (currentDist - nearestDist > 1.5) {
              activeGroup = nearestGroup;
            }
          }
        } else {
          activeGroup = -1;
          shakeEnergy *= 0.9;
        }
        shakeEnergy = Math.min(shakeEnergy, 6);

        const springStrength = 0.02;
        const damping = 0.88;

        for (let i = 0; i < nodeCount; i += 1) {
          const ix = i * 3;
          const g = nodeGroup[i];
          const breathe =
            Math.sin(elapsed * 0.9 + breathePhase[i]) * 0.35 * (1 - (g === activeGroup ? 1 : 0));

          let targetX: number;
          let targetY: number;
          let targetZ: number;

          if (pointerActive && g === activeGroup) {
            targetX = pointerWorld.x + pointerOffsets[ix];
            targetY = pointerWorld.y + pointerOffsets[ix + 1];
            targetZ = pointerWorld.z + pointerOffsets[ix + 2];
          } else {
            targetX = groupCenters[g].x + idleOffsets[ix] + breathe;
            targetY = groupCenters[g].y + idleOffsets[ix + 1] + breathe;
            targetZ = groupCenters[g].z + idleOffsets[ix + 2];
          }

          let accelX = (targetX - positions[ix]) * springStrength;
          let accelY = (targetY - positions[ix + 1]) * springStrength;
          let accelZ = (targetZ - positions[ix + 2]) * springStrength;

          // A shake of the pointer scatters the currently-gathered group.
          if (pointerActive && g === activeGroup && shakeEnergy > 0.4) {
            const dx = positions[ix] - pointerWorld.x;
            const dy = positions[ix + 1] - pointerWorld.y;
            const dz = positions[ix + 2] - pointerWorld.z;
            const dist = Math.max(Math.hypot(dx, dy, dz), 0.001);
            const diffuseStrength = shakeEnergy * 0.01;
            accelX += (dx / dist) * diffuseStrength;
            accelY += (dy / dist) * diffuseStrength;
            accelZ += (dz / dist) * diffuseStrength;
          }

          velocities[ix] = (velocities[ix] + accelX) * damping;
          velocities[ix + 1] = (velocities[ix + 1] + accelY) * damping;
          velocities[ix + 2] = (velocities[ix + 2] + accelZ) * damping;

          positions[ix] += velocities[ix];
          positions[ix + 1] += velocities[ix + 1];
          positions[ix + 2] += velocities[ix + 2];
        }
        nodeGeometry.attributes.position.needsUpdate = true;

        // Rebuild the constellation lines from the current node positions.
        let segmentCount = 0;
        for (let i = 0; i < nodeCount && segmentCount < maxSegments; i += 1) {
          const ix = i * 3;
          for (let j = i + 1; j < nodeCount && segmentCount < maxSegments; j += 1) {
            const jx = j * 3;
            const dx = positions[ix] - positions[jx];
            const dy = positions[ix + 1] - positions[jx + 1];
            const dz = positions[ix + 2] - positions[jx + 2];
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq < connectionDistanceSq) {
              const base = segmentCount * 6;
              linePositions[base] = positions[ix];
              linePositions[base + 1] = positions[ix + 1];
              linePositions[base + 2] = positions[ix + 2];
              linePositions[base + 3] = positions[jx];
              linePositions[base + 4] = positions[jx + 1];
              linePositions[base + 5] = positions[jx + 2];
              segmentCount += 1;
            }
          }
        }
        lineGeometry.attributes.position.needsUpdate = true;
        lineGeometry.setDrawRange(0, segmentCount * 2);
      }

      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('mouseleave', handlePointerLeave);
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      glowTexture.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 -z-10" aria-hidden="true" />;
}
