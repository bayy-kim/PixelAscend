"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getTileCoordinates, BOARD_LAYOUT } from "@/lib/game/board";

interface PlayerData {
  userId: string;
  characterId: string;
  cosmeticVariant: string;
  position: number;
  user: {
    name: string;
    nickname: string | null;
  };
}

interface ThreeGameRendererProps {
  players: PlayerData[];
  currentTurnUserId?: string;
  activeDiceValue?: number | null;
}

export default function ThreeGameRenderer({
  players,
  currentTurnUserId,
  activeDiceValue,
}: ThreeGameRendererProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const playerMeshesRef = useRef<{ [userId: string]: THREE.Group }>({});
  
  // Track target coordinates for players for smooth movement interpolation
  const [playerTargets, setPlayerTargets] = useState<{ [userId: string]: { x: number; z: number } }>({});

  useEffect(() => {
    if (!mountRef.current) return;

    // --- 1. SETUP THREE.JS SCENE, CAMERA, & LIGHTS ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1B1A1F"); // Match dark theme primary color
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    // Position camera looking down at an angle from the bottom of the board
    camera.position.set(4.5, 8, 12);
    camera.lookAt(4.5, 0, 4.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.camera.left = -6;
    dirLight.shadow.camera.right = 6;
    dirLight.shadow.camera.top = 6;
    dirLight.shadow.camera.bottom = -6;
    scene.add(dirLight);

    // --- 2. CREATE 3D BOARD ---
    // 10x10 Grid (Tiles 1 to 100)
    for (let tileNum = 1; tileNum <= 100; tileNum++) {
      const coords = getTileCoordinates(tileNum);
      const x = coords.x;
      const z = coords.y; // Map getTileCoordinates y to 3D Z plane

      const effect = BOARD_LAYOUT[tileNum];
      
      // Determine color based on tile effect
      let tileColor = "#232129"; // Standard Surface color
      if (effect?.type === "hazard") tileColor = "#7C4DA8"; // Purple Shadow Vine
      else if (effect?.type === "boost") tileColor = "#5FA35A";  // Green Ladder
      else if (effect?.type === "event") tileColor = "#1D4ED8";  // Blue Event
      else if (effect?.type === "powerup") tileColor = "#E8A33D"; // Amber Chest
      else if ((x + z) % 2 === 0) tileColor = "#1f1d24";         // Alternate checker color

      // Tile Geometry: thin boxes
      const tileGeom = new THREE.BoxGeometry(0.9, 0.15, 0.9);
      const tileMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(tileColor),
        roughness: 0.8,
      });
      const tileMesh = new THREE.Mesh(tileGeom, tileMat);
      tileMesh.position.set(x, 0, z);
      tileMesh.receiveShadow = true;
      scene.add(tileMesh);

      // Add a small 3D marker for hazards and boosts
      if (effect?.type === "hazard") {
        const markerGeom = new THREE.ConeGeometry(0.15, 0.4, 4);
        const markerMat = new THREE.MeshStandardMaterial({ color: 0x7c4da8, emissive: 0x7c4da8, emissiveIntensity: 0.2 });
        const marker = new THREE.Mesh(markerGeom, markerMat);
        marker.position.set(x, 0.25, z);
        scene.add(marker);
      } else if (effect?.type === "boost") {
        const markerGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6);
        const markerMat = new THREE.MeshStandardMaterial({ color: 0x5fa35a });
        const marker = new THREE.Mesh(markerGeom, markerMat);
        marker.rotation.x = Math.PI / 4;
        marker.position.set(x, 0.25, z);
        scene.add(marker);
      }
    }

    // --- 3. ANIMATION LOOP ---
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Interpolate characters towards their target coordinates step-by-step
      players.forEach((player) => {
        const mesh = playerMeshesRef.current[player.userId];
        if (mesh) {
          const target = playerTargets[player.userId] || { x: 0, z: 0 };
          
          // Lerp position
          mesh.position.x += (target.x - mesh.position.x) * 0.1;
          mesh.position.z += (target.z - mesh.position.z) * 0.1;

          // Bobbing/floating effect for active player
          if (player.userId === currentTurnUserId) {
            mesh.position.y = 0.4 + Math.sin(elapsedTime * 5) * 0.1;
            mesh.rotation.y += 0.02; // spin active player gently
          } else {
            // Static position for others
            mesh.position.y = 0.4;
            mesh.rotation.y = 0;
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (rendererRef.current && mountRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [players, currentTurnUserId]);

  // Handle building and updating 3D chibi models when player states or positions change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const targets: { [userId: string]: { x: number; z: number } } = {};

    players.forEach((player) => {
      const coords = getTileCoordinates(player.position || 1);
      targets[player.userId] = { x: coords.x, z: coords.y };

      // Instantiate mesh group if not exists
      if (!playerMeshesRef.current[player.userId]) {
        const playerGroup = new THREE.Group();

        // 3D Chibi Proportions: cylinder body + sphere head
        // Define distinct colors/archetypes based on referenced image colors to avoid copyright issues
        let bodyColor = 0xe8a33d; // default amber
        let headColor = 0xffe4e1; // skin tone
        let accColor = 0x4b4a57;

        if (player.characterId === "dawn") {
          bodyColor = 0x708090; // knight silver armor
          accColor = 0x1e3a8a;  // blue cape
        } else if (player.characterId === "wren") {
          bodyColor = 0x5b21b6; // elf purple robe
          accColor = 0xffe4e1;
        } else if (player.characterId === "thistle") {
          bodyColor = 0x78350f; // dwarf bronze plates
          accColor = 0x7c2d12;
        } else if (player.characterId === "brack") {
          bodyColor = 0x166534; // orc green skin
          headColor = 0x166534;
        } else if (player.characterId === "ember") {
          bodyColor = 0x991b1b; // dragonkin red scale
          headColor = 0x991b1b;
        } else if (player.characterId === "marrow") {
          bodyColor = 0xf4f4f5; // skeleton white bones
          headColor = 0xf4f4f5;
        } else if (player.characterId === "sable") {
          bodyColor = 0x111827; // shadow rogue black cloak
          headColor = 0x1f2937;
        } else if (player.characterId === "halcyon") {
          bodyColor = 0x78350f; // centaur brown body
          accColor = 0xd97706;
        }

        // Apply palette swap variations
        if (player.cosmeticVariant === "crimson") {
          bodyColor = 0x991b1b;
        } else if (player.cosmeticVariant === "moss") {
          bodyColor = 0x166534;
        } else if (player.cosmeticVariant === "azure") {
          bodyColor = 0x1d4ed8;
        }

        // Body primitive: cylinder
        const bodyGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.45, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });
        const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
        bodyMesh.position.y = -0.1;
        bodyMesh.castShadow = true;
        playerGroup.add(bodyMesh);

        // Head primitive: sphere
        const headGeom = new THREE.SphereGeometry(0.22, 10, 10);
        const headMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.6 });
        const headMesh = new THREE.Mesh(headGeom, headMat);
        headMesh.position.y = 0.22;
        headMesh.castShadow = true;
        playerGroup.add(headMesh);

        // Custom helmet/horns accessory model representation based on character
        if (player.characterId === "dawn") {
          // Helmet block
          const helmGeom = new THREE.CylinderGeometry(0.23, 0.23, 0.1, 8);
          const helmMat = new THREE.MeshStandardMaterial({ color: 0x4b4a57 });
          const helm = new THREE.Mesh(helmGeom, helmMat);
          helm.position.y = 0.32;
          playerGroup.add(helm);
        } else if (player.characterId === "ember") {
          // Curved horns representation (2 small cones)
          const hornGeom = new THREE.ConeGeometry(0.04, 0.15, 4);
          const hornMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
          
          const hornL = new THREE.Mesh(hornGeom, hornMat);
          hornL.position.set(-0.1, 0.35, 0.05);
          hornL.rotation.z = Math.PI / 8;
          playerGroup.add(hornL);

          const hornR = new THREE.Mesh(hornGeom, hornMat);
          hornR.position.set(0.1, 0.35, 0.05);
          hornR.rotation.z = -Math.PI / 8;
          playerGroup.add(hornR);
        } else if (player.characterId === "halcyon") {
          // Four horse-legs block representation
          const legGeom = new THREE.BoxGeometry(0.35, 0.2, 0.4);
          const legMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
          const legs = new THREE.Mesh(legGeom, legMat);
          legs.position.set(0, -0.3, 0);
          playerGroup.add(legs);
        }

        // Set initial coordinates
        playerGroup.position.set(coords.x, 0.4, coords.y);
        scene.add(playerGroup);
        playerMeshesRef.current[player.userId] = playerGroup;
      }
    });

    setPlayerTargets(targets);

    // Clean up disconnected players
    Object.keys(playerMeshesRef.current).forEach((uId) => {
      const active = players.some((p) => p.userId === uId);
      if (!active) {
        scene.remove(playerMeshesRef.current[uId]);
        delete playerMeshesRef.current[uId];
      }
    });

  }, [players]);

  return (
    <div className="w-full h-full min-h-[380px] md:min-h-[450px] relative">
      <div ref={mountRef} className="w-full h-full rounded overflow-hidden shadow-inner border border-[#4B4A57]/30"></div>
      
      {/* 3D camera controls hint overlay */}
      <div className="absolute bottom-3 left-3 bg-[#1B1A1F]/80 px-3 py-1.5 rounded border border-[#4B4A57]/40 text-[9px] font-press-start text-[#F2E9D8]/50">
        3D PREVIEW ACTIVATED
      </div>
    </div>
  );
}
