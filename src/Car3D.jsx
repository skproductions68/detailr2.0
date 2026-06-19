// Car3D.jsx
// Real 3D car built with three.js, with a smoother, more detailed look:
// rounded body panels, a tapered cabin, sloped hood/trunk, alloy wheels,
// tinted glass and soft studio lighting. Generates a recognizable
// silhouette per body type. Clickable panels map to the DB panel ids:
//   Bonnet, Roof, Trunk, Spoiler, Front Fenders, All Doors, Rear Fenders,
//   Pillar, Headlights, Taillights, Side Mirrors
//
// Props:
//   bodyType       : "sedan"|"suv"|"coupe"|"hatchback"|"pickup"|"van"
//   selectedPanels : string[]
//   onToggle(id)   : fn
//   availableIds   : string[] | null

import { useRef, useEffect } from "react";
import * as THREE from "three";

const COL = {
  body:     0x1c1c1e,
  selected: 0xffffff,
  glass:    0x121a24,
  trim:     0x080808,
  rim:      0xb8bcc4,
  tire:     0x0a0a0a,
};

// ── Rounded box geometry (soft edges instead of hard cubes) ──
function roundedBox(w, h, d, r = 0.06) {
  const radius = Math.min(r, w / 2, h / 2);
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + radius);
  shape.lineTo(x + w, y + h - radius);
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  shape.lineTo(x + radius, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const bevel = Math.min(0.05, d * 0.2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.translate(0, 0, -(d - bevel * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

function bodyProfile(type) {
  // Sedan baseline: low, sleek 3-box. Roof height stays well below the
  // car's width so it never reads as a van/truck.
  const base = {
    length: 4.5, width: 1.82, wheelbase: 2.7,
    hoodH: 0.52, hoodLen: 1.2,
    cabinH: 0.62, roofLen: 1.35,
    trunkH: 0.52, trunkLen: 1.05,
    hasBed: false, spoiler: false,
  };
  switch (type) {
    case "suv":
      return { ...base, length: 4.7, width: 1.95, hoodH: 0.62, hoodLen: 1.0,
        cabinH: 0.95, roofLen: 1.95, trunkH: 1.25, trunkLen: 0.5 };
    case "coupe":
      return { ...base, length: 4.4, width: 1.86, hoodH: 0.48, hoodLen: 1.3,
        cabinH: 0.56, roofLen: 1.0, trunkH: 0.5, trunkLen: 1.05, spoiler: true };
    case "hatchback":
      return { ...base, length: 3.95, width: 1.74, hoodH: 0.5, hoodLen: 0.9,
        cabinH: 0.76, roofLen: 1.5, trunkH: 1.0, trunkLen: 0.3 };
    case "pickup":
      return { ...base, length: 5.3, width: 1.97, hoodH: 0.66, hoodLen: 1.1,
        cabinH: 0.82, roofLen: 1.15, trunkH: 0.8, trunkLen: 1.8, hasBed: true };
    case "van":
      return { ...base, length: 4.9, width: 1.9, hoodH: 0.7, hoodLen: 0.5,
        cabinH: 1.2, roofLen: 2.6, trunkH: 1.65, trunkLen: 0.2 };
    case "sedan":
    default:
      return base;
  }
}

function buildCar(type) {
  const p = bodyProfile(type);
  const group = new THREE.Group();
  const panelMeshes = {};
  const W = p.width;
  const halfW = W / 2;
  const floorY = 0.28;

  const register = (id, mesh) => {
    mesh.userData.panelId = id;
    (panelMeshes[id] = panelMeshes[id] || []).push(mesh);
    group.add(mesh);
  };
  const paint = (color) =>
    new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.32 });
  const plain = (color, m = 0.3, r = 0.6) =>
    new THREE.MeshStandardMaterial({ color, metalness: m, roughness: r });

  // ── Lower body / chassis (structure, rounded, not clickable) ──
  const chassisH = 0.55;
  const chassis = new THREE.Mesh(roundedBox(W, chassisH, p.length, 0.18), plain(COL.trim, 0.2, 0.7));
  chassis.position.set(0, chassisH / 2 + floorY - 0.05, 0);
  group.add(chassis);

  // ── Bonnet (slightly sloped down toward the front) ──
  const bonnet = new THREE.Mesh(roundedBox(W * 0.9, 0.12, p.hoodLen, 0.08), paint(COL.body));
  bonnet.position.set(0, p.hoodH + floorY, -p.length / 2 + p.hoodLen / 2 + 0.15);
  bonnet.rotation.x = -0.07;
  register("Bonnet", bonnet);

  // ── Front fenders ──
  [-1, 1].forEach((side) => {
    const fender = new THREE.Mesh(roundedBox(0.14, 0.5, p.hoodLen + 0.3, 0.07), paint(COL.body));
    fender.position.set(side * (halfW - 0.03), p.hoodH + floorY - 0.22, -p.length / 2 + (p.hoodLen + 0.3) / 2 + 0.1);
    register("Front Fenders", fender);
  });

  // ── Headlights (front face) ──
  [-1, 1].forEach((side) => {
    const hl = new THREE.Mesh(roundedBox(W * 0.3, 0.16, 0.12, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x335577, metalness: 0.3, roughness: 0.15, emissive: 0x111a22 }));
    hl.position.set(side * W * 0.27, p.hoodH + floorY - 0.05, -p.length / 2 + 0.06);
    register("Headlights", hl);
  });

  // Front bumper accent (decorative)
  const fbumper = new THREE.Mesh(roundedBox(W * 0.94, 0.3, 0.25, 0.1), plain(COL.trim, 0.2, 0.7));
  fbumper.position.set(0, floorY + 0.1, -p.length / 2 + 0.02);
  group.add(fbumper);

  // ── Cabin (tapered greenhouse: roof narrower + shorter than the base) ──
  const roofZ = -p.length / 2 + p.hoodLen + p.roofLen / 2 + 0.2;
  const roofY = p.hoodH + floorY + p.cabinH;
  const cabHalfLen = p.roofLen / 2;
  const pillarH = p.cabinH;

  const roof = new THREE.Mesh(roundedBox(W * 0.74, 0.1, p.roofLen * 0.92, 0.12), paint(COL.body));
  roof.position.set(0, roofY, roofZ);
  register("Roof", roof);

  // Pillars (angled slightly inward at the top for a tapered look)
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const pil = new THREE.Mesh(roundedBox(0.1, pillarH, 0.12, 0.03), plain(COL.trim, 0.3, 0.5));
    pil.position.set(sx * (W * 0.37), roofY - pillarH / 2, roofZ + sz * cabHalfLen * 0.9);
    pil.rotation.z = sx * 0.05;
    register("Pillar", pil);
  });

  // Glass — windshield (raked), rear glass (raked), side glass
  const glassMat = new THREE.MeshStandardMaterial({
    color: COL.glass, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.55,
  });
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.7, pillarH * 0.95), glassMat);
  windshield.position.set(0, roofY - pillarH * 0.45, roofZ - cabHalfLen - 0.02);
  windshield.rotation.x = 0.5;
  group.add(windshield);
  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.7, pillarH * 0.9), glassMat);
  rearGlass.position.set(0, roofY - pillarH * 0.45, roofZ + cabHalfLen + 0.02);
  rearGlass.rotation.x = -0.5;
  group.add(rearGlass);
  [-1, 1].forEach((side) => {
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(p.roofLen * 0.8, pillarH * 0.6), glassMat);
    sg.position.set(side * (W * 0.375), roofY - pillarH * 0.4, roofZ);
    sg.rotation.y = side * Math.PI / 2;
    group.add(sg);
  });

  // ── Doors ──
  [-1, 1].forEach((side) => {
    const doorH = p.cabinH * 0.55;
    const door = new THREE.Mesh(roundedBox(0.12, doorH, p.roofLen + 0.4, 0.06), paint(COL.body));
    door.position.set(side * (halfW - 0.02), p.hoodH + floorY + doorH * 0.5, roofZ);
    register("All Doors", door);
  });

  // ── Side mirrors ──
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(roundedBox(0.12, 0.06, 0.06, 0.02), plain(COL.body, 0.5, 0.4));
    arm.position.set(side * (halfW + 0.08), roofY - pillarH * 0.62, roofZ - cabHalfLen - 0.02);
    register("Side Mirrors", arm);
    const cap = new THREE.Mesh(roundedBox(0.16, 0.12, 0.1, 0.04), paint(COL.body));
    cap.position.set(side * (halfW + 0.16), roofY - pillarH * 0.62, roofZ - cabHalfLen - 0.02);
    register("Side Mirrors", cap);
  });

  // ── Rear: trunk / tailgate + bed for pickup ──
  const trunkZ = p.length / 2 - p.trunkLen / 2 - 0.1;
  if (p.hasBed) {
    const bedFloor = new THREE.Mesh(roundedBox(W * 0.82, 0.1, p.trunkLen, 0.06), plain(COL.trim, 0.2, 0.7));
    bedFloor.position.set(0, p.hoodH + floorY - 0.15, trunkZ);
    group.add(bedFloor);
    [-1, 1].forEach((side) => {
      const wall = new THREE.Mesh(roundedBox(0.1, 0.4, p.trunkLen, 0.04), paint(COL.body));
      wall.position.set(side * (halfW - 0.05), p.hoodH + floorY + 0.05, trunkZ);
      group.add(wall);
    });
    const tailgate = new THREE.Mesh(roundedBox(W * 0.84, 0.5, 0.12, 0.06), paint(COL.body));
    tailgate.position.set(0, p.hoodH + floorY - 0.05, p.length / 2 - 0.08);
    register("Trunk", tailgate);
  } else {
    const trunk = new THREE.Mesh(roundedBox(W * 0.88, 0.14, p.trunkLen, 0.08), paint(COL.body));
    trunk.position.set(0, p.trunkH + floorY, trunkZ);
    trunk.rotation.x = 0.05;
    register("Trunk", trunk);
  }

  // Rear fenders
  [-1, 1].forEach((side) => {
    const rf = new THREE.Mesh(roundedBox(0.14, 0.5, p.trunkLen + 0.4, 0.07), paint(COL.body));
    rf.position.set(side * (halfW - 0.03), p.hoodH + floorY - 0.22, trunkZ);
    register("Rear Fenders", rf);
  });

  // Taillights
  [-1, 1].forEach((side) => {
    const tl = new THREE.Mesh(roundedBox(W * 0.28, 0.14, 0.1, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x5a1414, metalness: 0.3, roughness: 0.2, emissive: 0x330808 }));
    tl.position.set(side * W * 0.28, p.trunkH + floorY - 0.05, p.length / 2 - 0.04);
    register("Taillights", tl);
  });

  // Rear bumper (decorative)
  const rbumper = new THREE.Mesh(roundedBox(W * 0.94, 0.3, 0.25, 0.1), plain(COL.trim, 0.2, 0.7));
  rbumper.position.set(0, floorY + 0.1, p.length / 2 - 0.02);
  group.add(rbumper);

  // Spoiler (coupe)
  if (p.spoiler) {
    const spoiler = new THREE.Mesh(roundedBox(W * 0.66, 0.06, 0.28, 0.03), plain(COL.trim, 0.4, 0.5));
    spoiler.position.set(0, p.trunkH + floorY + 0.4, p.length / 2 - 0.22);
    register("Spoiler", spoiler);
    [-1, 1].forEach((side) => {
      const stand = new THREE.Mesh(roundedBox(0.05, 0.18, 0.1, 0.02), plain(COL.trim, 0.4, 0.5));
      stand.position.set(side * W * 0.25, p.trunkH + floorY + 0.28, p.length / 2 - 0.22);
      group.add(stand);
    });
  }

  // ── Wheels with alloy rims ──
  const wheelR = 0.44, wheelT = 0.26;
  const wb = p.wheelbase / 2;
  const mkWheel = (sx, sz) => {
    const hub = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelT, 28), plain(COL.tire, 0.0, 0.95));
    tire.rotation.z = Math.PI / 2;
    hub.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.62, wheelR * 0.62, wheelT + 0.02, 24),
      new THREE.MeshStandardMaterial({ color: COL.rim, metalness: 0.9, roughness: 0.25 }));
    rim.rotation.z = Math.PI / 2;
    hub.add(rim);
    // spokes
    const spokeMat = new THREE.MeshStandardMaterial({ color: COL.rim, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(wheelT + 0.04, 0.08, wheelR * 1.1), spokeMat);
      spoke.rotation.x = (i / 5) * Math.PI * 2;
      hub.add(spoke);
    }
    hub.position.set(sx * (halfW + 0.02), wheelR + 0.02, sz);
    group.add(hub);
  };
  [[-1, -wb], [1, -wb], [-1, wb], [1, wb]].forEach(([sx, sz]) => mkWheel(sx, sz));

  group.position.y = -0.7;
  return { group, panelMeshes };
}


export default function Car3D({ bodyType = "sedan", selectedPanels = [], onToggle, availableIds = null }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const onToggleRef = useRef(onToggle);
  const selectedRef = useRef(selectedPanels);

  useEffect(() => { onToggleRef.current = onToggle; }, [onToggle]);
  useEffect(() => { selectedRef.current = selectedPanels; }, [selectedPanels]);

  const availKey = availableIds ? availableIds.join(",") : "";

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isCoarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Responsive canvas: shorter + width-proportional on phones, fixed 380 on desktop
    const sizeFor = () => {
      const w = mount.clientWidth || 600;
      const h = isCoarse ? Math.max(260, Math.min(360, Math.round(w * 0.9))) : 380;
      return { w, h };
    };
    let { w: width, h: height } = sizeFor();
    mount.style.height = height + "px";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(6, 4, 7.5);
    camera.lookAt(0, 0, 0);

    // Some older phones can't create a WebGL context — fail soft to the chips below
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      mount.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;padding:24px;text-align:center;">3D preview not supported on this device — use the panel buttons below</div>';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarse ? 1.75 : 2));
    renderer.setSize(width, height);
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    // Soft studio lighting
    scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x202024, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 9, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fb8ff, 0.5);
    fill.position.set(-6, 4, -5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(0, 3, -8);
    scene.add(rim);

    const grid = new THREE.GridHelper(24, 24, 0x2a2a2a, 0x161616);
    grid.position.y = -1.4;
    scene.add(grid);

    const { group, panelMeshes } = buildCar(bodyType);
    const pivot = new THREE.Group();
    pivot.add(group);
    scene.add(pivot);
    pivot.rotation.y = -0.55;
    pivot.rotation.x = -0.12;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // ── Render-on-demand loop: runs only while something moves ──
    let raf = 0, running = false, visible = true;
    let dragging = false, moved = false, px = 0, py = 0, vy = 0;
    let autoRotate = !reduceMotion; // idle showcase spin until first touch

    const tick = () => {
      let active = false;
      if (autoRotate && !dragging) { pivot.rotation.y += 0.0035; active = true; }
      if (!dragging && Math.abs(vy) > 0.0004) { pivot.rotation.y += vy; vy *= 0.94; active = true; }
      if (dragging) active = true;
      renderer.render(scene, camera);
      if (active && visible && !document.hidden) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };
    const kick = () => {
      if (!running) { running = true; raf = requestAnimationFrame(tick); }
    };

    // Pause when scrolled offscreen or tab hidden (battery saver)
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) kick();
        }, { threshold: 0.05 })
      : null;
    io?.observe(mount);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVis);

    const applySelection = () => {
      const selected = selectedRef.current;
      Object.entries(panelMeshes).forEach(([id, meshes]) => {
        const isSel = selected.includes(id);
        meshes.forEach((m) => {
          m.material.color.setHex(isSel ? COL.selected : COL.body);
          if (m.material.emissive) m.material.emissive.setHex(isSel ? 0x333333 : 0x000000);
          m.material.metalness = isSel ? 0.3 : 0.55;
        });
      });
      kick();
    };
    stateRef.current = { applySelection };
    applySelection();

    const el = renderer.domElement;
    el.style.cursor = "grab";
    // pan-y: vertical swipes scroll the page; horizontal drags rotate the car
    el.style.touchAction = "pan-y";

    const onDown = (e) => {
      dragging = true; moved = false; autoRotate = false;
      px = e.clientX; py = e.clientY; vy = 0;
      el.style.cursor = "grabbing";
      kick();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      pivot.rotation.y += dx * 0.01;
      vy = dx * 0.005; // inertia
      if (!isCoarse) {
        pivot.rotation.x = Math.max(-0.7, Math.min(0.35, pivot.rotation.x + dy * 0.008));
      }
      px = e.clientX; py = e.clientY;
    };
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "grab";
      kick(); // let inertia decay
    };
    const onUp = (e) => {
      const wasDragging = dragging;
      endDrag();
      if (!wasDragging || moved) return;
      const rect = el.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(group.children, true);
      const hit = hits.find((h) => h.object.userData.panelId);
      if (hit) {
        const id = hit.object.userData.panelId;
        if (!availableIds || availableIds.includes(id)) onToggleRef.current?.(id);
      }
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", endDrag);

    const onResize = () => {
      const s = sizeFor();
      width = s.w; height = s.h;
      mount.style.height = height + "px";
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      kick();
    };
    window.addEventListener("resize", onResize);

    kick();

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [bodyType, availKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    stateRef.current.applySelection?.();
  }, [selectedPanels]);

  return (
    <div className="bg-black border border-white/5 relative" style={{ overflow: "hidden" }}>
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <span className="text-[10px] text-gray-600 font-mono border border-white/8 px-2 py-0.5 uppercase">
          3D · {bodyType} · drag to rotate
        </span>
      </div>
      <div ref={mountRef} style={{ width: "100%" }} />
      <p className="text-[10px] text-gray-700 text-center pb-2 uppercase tracking-widest">
        {selectedPanels.length} zone{selectedPanels.length !== 1 ? "s" : ""} selected · tap a surface
      </p>
    </div>
  );
}
