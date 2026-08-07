/**
 * VibeCurb Showcase 3D WebGL Engine (Horizontal Carousel + Controlled Focus Navigation)
 * Three.js & GSAP
 */

document.addEventListener('DOMContentLoaded', () => {

  // Default Showcase Items
  const defaultShowcaseItems = [
    { src: '/assets/showcase/thumbnail-01.webp', desc: 'Axel Studio 01' },
    { src: '/assets/showcase/thumbnail-02.webp', desc: 'Axel Studio 02' },
    { src: '/assets/showcase/thumbnail-03.webp', desc: 'Axel Studio 03' },
    { src: '/assets/showcase/thumbnail-04.webp', desc: 'Axel Studio 04' },
    { src: '/assets/showcase/thumbnail-05.webp', desc: 'Axel Studio 05' },
    { src: '/assets/showcase/thumbnail-06.webp', desc: 'Axel Studio 06' },
    { src: '/assets/showcase/thumbnail-07.webp', desc: 'Axel Studio 07' },
    { src: '/assets/showcase/thumbnail-08.webp', desc: 'Axel Studio 08' },
    { src: '/assets/showcase/thumbnail-09.webp', desc: 'Axel Studio 09' }
  ];

  // Active Showcase Items (Load from localStorage if available)
  let showcaseItems = [];
  try {
    const saved = localStorage.getItem('axel_gallery_order');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        showcaseItems = parsed.map(item => ({
          ...item,
          src: item.src.startsWith('./assets/') ? item.src.replace('./assets/', '/assets/') : item.src
        }));
      } else {
        showcaseItems = [...defaultShowcaseItems];
      }
    } else {
      showcaseItems = [...defaultShowcaseItems];
    }
  } catch (e) {
    showcaseItems = [...defaultShowcaseItems];
  }

  let totalItems = showcaseItems.length;
  const PANEL_WIDTH = 4.0;
  const GAP = 0.6;
  const SPACING = PANEL_WIDTH + GAP;

  // DOM Elements
  const container = document.getElementById('webgl-container');
  const counterBadge = document.getElementById('counter-badge');
  const descText = document.getElementById('desc-text');

  // Admin Panel DOM Elements
  const openAdminBtn = document.getElementById('openAdminBtn');
  const closeAdminBtn = document.getElementById('closeAdminBtn');
  const cancelAdminBtn = document.getElementById('cancelAdminBtn');
  const saveAdminBtn = document.getElementById('saveAdminBtn');
  const resetOrderBtn = document.getElementById('resetOrderBtn');
  const adminModal = document.getElementById('adminModal');
  const adminList = document.getElementById('adminList');
  const animationModeSelect = document.getElementById('animationModeSelect');

  // Animation Mode State & Auto-Rotate Direction
  let animationMode = localStorage.getItem('axel_gallery_anim_mode') || 'horizontal';
  let autoRotateDir = 1;

  // App State
  let targetX = 0;
  let currentX = 0;
  let targetY = 0;
  let currentY = 0;
  let activeIndex = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartTargetX = 0;
  let isFocused = false;
  let focusedMesh = null;
  let hoveredMesh = null;
  let wasDragged = false;
  let lastStepX = 0;
  let lastStepTime = 0;

  // Three.js Setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(2, 5, 5);
  scene.add(dirLight);

  // Group for 3D Stream Panels
  const streamGroup = new THREE.Group();
  scene.add(streamGroup);

  // Texture Loader & Panels Creation
  const textureLoader = new THREE.TextureLoader();
  let panels = [];

  // Large AXEL STUDIO 3D Logo in Background
  const logoTexture = textureLoader.load('/assets/axel_studio_logo.png');
  logoTexture.minFilter = THREE.LinearFilter;
  logoTexture.magFilter = THREE.LinearFilter;

  const logoGeo = new THREE.PlaneGeometry(6.15, 2.4);
  const logoMat = new THREE.MeshBasicMaterial({
    map: logoTexture,
    transparent: true,
    depthWrite: false
  });
  const logoMesh = new THREE.Mesh(logoGeo, logoMat);
  logoMesh.position.set(0, 2.40, -0.6);
  logoMesh.renderOrder = -1;
  scene.add(logoMesh);

  function buildPanels() {
    // Clean up existing meshes in streamGroup
    while (streamGroup.children.length > 0) {
      const obj = streamGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
      streamGroup.remove(obj);
    }
    panels = [];
    totalItems = showcaseItems.length;

    // Reset group transforms
    streamGroup.position.set(0, 0, 0);
    streamGroup.rotation.set(0, 0, 0);

    showcaseItems.forEach((item, index) => {
      const geometry = new THREE.PlaneGeometry(4.0, 2.3, 32, 32);
      
      // Slight curve to panels for cylindrical depth
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, -Math.pow(x / 2.2, 2) * 0.18);
      }
      geometry.computeVertexNormals();

      const texture = textureLoader.load(item.src);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true
      });

      const mesh = new THREE.Mesh(geometry, material);

      if (animationMode === 'spiral') {
        // Mode B: 3D Spiral Ribbon Carousel (Paso exacto por el centro a la altura de la vista y=0)
        const R = 6.2;
        const ANGLE_STEP = (Math.PI * 2) / totalItems;
        const theta = index * ANGLE_STEP;
        mesh.position.x = Math.sin(theta) * R;
        mesh.position.y = Math.sin(theta) * 2.2;
        mesh.position.z = Math.cos(theta) * R - R;
        mesh.rotation.y = theta;
        mesh.userData = { index, item, baseAngle: theta };
      } else {
        // Mode A: Horizontal 3D Stream (Default untouched)
        mesh.position.x = index * SPACING;
        mesh.position.y = 0;
        mesh.position.z = 0;
        mesh.userData = { index, item, initX: mesh.position.x, initY: 0, initZ: 0, initRotX: 0, initRotY: 0 };
      }
      
      streamGroup.add(mesh);
      panels.push(mesh);
    });

    targetX = 0;
    currentX = 0;
    targetY = 0;
    currentY = 0;
    activeIndex = 0;
    isFocused = false;
    focusedMesh = null;
    hoveredMesh = null;

    const formattedIndex = String(1).padStart(2, '0');
    counterBadge.querySelector('p').textContent = `${formattedIndex}/${String(totalItems).padStart(2, '0')}`;
    descText.textContent = showcaseItems[0] ? showcaseItems[0].desc : '';
  }

  buildPanels();

  // Raycaster & Mouse Tracking
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(0, 0);

  let lastMouseX = 0;

  window.addEventListener('mousemove', (e) => {
    // Normalized mouse coordinates for Raycaster
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    // Dragging physics
    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const moveDeltaX = e.clientX - lastMouseX;
      lastMouseX = e.clientX;

      if (Math.abs(deltaX) > 6) {
        wasDragged = true;
      }

      if (isFocused) {
        // Slow & controlled step drag navigation in focused mode
        const stepDelta = e.clientX - lastStepX;
        const now = Date.now();
        if (now - lastStepTime > 550) {
          if (stepDelta < -180) {
            lastStepX = e.clientX;
            lastStepTime = now;
            focusNextPanel();
          } else if (stepDelta > 180) {
            lastStepX = e.clientX;
            lastStepTime = now;
            focusPrevPanel();
          }
        }
      } else {
        if (animationMode === 'spiral') {
          // Fast, responsive 3D drag physics & dynamic rotation direction
          targetX += moveDeltaX * 0.015;
          if (moveDeltaX > 2) autoRotateDir = 1;
          else if (moveDeltaX < -2) autoRotateDir = -1;
        } else {
          // Stream mode drag physics along X axis
          const physDeltaX = deltaX * 0.012;
          targetX = dragStartTargetX - physDeltaX;
        }
      }
    } else {
      lastMouseX = e.clientX;
    }
  });

  // Mouse Drag Events
  window.addEventListener('mousedown', (e) => {
    if (e.target.closest('nav')) return; // Ignore header clicks
    isDragging = true;
    wasDragged = false;
    dragStartX = e.clientX;
    lastMouseX = e.clientX;
    lastStepX = e.clientX;
    dragStartTargetX = targetX;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Scroll Wheel Handler
  window.addEventListener('wheel', (e) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 12) return;

    if (isFocused) {
      const now = Date.now();
      if (now - lastStepTime > 550) {
        lastStepTime = now;
        if (delta > 0) focusNextPanel();
        else focusPrevPanel();
      }
    } else {
      if (animationMode === 'spiral') {
        targetX += delta * 0.012;
        if (delta > 2) autoRotateDir = 1;
        else if (delta < -2) autoRotateDir = -1;
      } else {
        targetX += delta * 0.005;
      }
    }
  }, { passive: true });

  // Click Handler for Panel Focus / Unfocus
  window.addEventListener('click', (e) => {
    if (e.target.closest('nav') || e.target.closest('#adminModal') || e.target.closest('#loginModal')) return;

    // If mouse was dragged/swiped, ignore click so it STAYS in large mode!
    if (wasDragged) {
      wasDragged = false;
      return;
    }

    if (isFocused) {
      unfocusPanel();
      return;
    }

    if (hoveredMesh) {
      focusPanel(hoveredMesh);
    }
  });

  // Keyboard Escape & Arrow Keys Navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFocused) {
      unfocusPanel();
      return;
    }
    const now = Date.now();
    if (e.key === 'ArrowRight') {
      if (isFocused) {
        if (now - lastStepTime > 450) {
          lastStepTime = now;
          focusNextPanel();
        }
      } else {
        if (animationMode === 'spiral') {
          targetX += 2.5;
          autoRotateDir = 1;
        } else {
          targetX += SPACING;
        }
      }
    }
    if (e.key === 'ArrowLeft') {
      if (isFocused) {
        if (now - lastStepTime > 450) {
          lastStepTime = now;
          focusPrevPanel();
        }
      } else {
        if (animationMode === 'spiral') {
          targetX -= 2.5;
          autoRotateDir = -1;
        } else {
          targetX -= SPACING;
        }
      }
    }
  });

  // Navigation helpers for Focused Mode
  function focusNextPanel() {
    if (!focusedMesh) return;
    const currentIdx = focusedMesh.userData.index;
    const nextIdx = (currentIdx + 1) % totalItems;
    focusPanel(panels[nextIdx]);
  }

  function focusPrevPanel() {
    if (!focusedMesh) return;
    const currentIdx = focusedMesh.userData.index;
    const prevIdx = (currentIdx - 1 + totalItems) % totalItems;
    focusPanel(panels[prevIdx]);
  }

  // Focus Panel Animation
  function focusPanel(mesh) {
    const prevMesh = focusedMesh;

    isFocused = true;
    focusedMesh = mesh;
    activeIndex = mesh.userData.index;

    // Update Counter & Title Badges immediately
    const formattedIndex = String(activeIndex + 1).padStart(2, '0');
    counterBadge.querySelector('p').textContent = `${formattedIndex}/${String(totalItems).padStart(2, '0')}`;
    descText.textContent = showcaseItems[activeIndex] ? showcaseItems[activeIndex].desc : '';

    if (prevMesh && prevMesh !== mesh) {
      gsap.to(prevMesh.scale, {
        x: 1.0,
        y: 1.0,
        z: 1.0,
        duration: 0.8,
        ease: 'power2.out'
      });
    }

    if (animationMode === 'spiral') {
      // Find exact scroll position to align clicked panel front & center at eye height (y=0, z=0)
      const targetScrollAngle = -mesh.userData.baseAngle;
      targetX = targetScrollAngle / 0.08;
      currentX = targetX;

      gsap.to(mesh.position, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.1,
        ease: 'power3.out'
      });
      gsap.to(streamGroup.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.0,
        ease: 'power3.out'
      });
    } else {
      targetX = mesh.position.x;
      currentX = mesh.position.x;

      gsap.to(streamGroup.position, {
        x: -targetX,
        duration: 1.1,
        ease: 'power3.out'
      });
    }

    gsap.to(camera.position, {
      z: 4.2,
      duration: 1.1,
      ease: 'power3.out'
    });

    // Add 180 degree spin turn effect for all panels when opening to center
    mesh.rotation.y += Math.PI * (autoRotateDir || 1);

    // Straighten rotation to face 100% frontal to camera (0 deg)
    gsap.to(mesh.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.1,
      ease: 'power3.out'
    });

    gsap.to(mesh.scale, {
      x: 1.35,
      y: 1.35,
      z: 1.35,
      duration: 1.1,
      ease: 'power3.out'
    });
  }

  function unfocusPanel() {
    if (focusedMesh) {
      const mesh = focusedMesh;

      gsap.to(mesh.scale, {
        x: 1.0,
        y: 1.0,
        z: 1.0,
        duration: 0.9,
        ease: 'power3.out'
      });
    }

    gsap.to(camera.position, {
      z: 7.5,
      duration: 0.9,
      ease: 'power3.out'
    });

    isFocused = false;
    focusedMesh = null;
  }

  // Animation & Render Loop
  function animate() {
    requestAnimationFrame(animate);

    // Hide background logo when focused so only the centered image is seen
    logoMesh.visible = !isFocused;

    if (animationMode === 'spiral') {
      if (!isFocused) {
        // Continuous smooth auto-rotation following user's drag direction
        if (!isDragging) {
          targetX += 0.012 * autoRotateDir;
        }

        currentX += (targetX - currentX) * 0.08;
        streamGroup.position.set(0, 0, 0);
        streamGroup.rotation.x = mouse.y * 0.04;
        streamGroup.rotation.y = mouse.x * 0.04;

        const scrollAngle = currentX * 0.08;

        panels.forEach((panel) => {
          const theta = panel.userData.baseAngle + scrollAngle;
          const R = 6.2;
          panel.position.x = Math.sin(theta) * R;
          panel.position.y = Math.sin(theta) * 2.2;  // AT THETA=0 -> Y=0 (DEAD CENTER EYE HEIGHT!)
          panel.position.z = Math.cos(theta) * R - R; // AT THETA=0 -> Z=0 (FRONTMOS T!)
          panel.rotation.y = theta;                   // AT THETA=0 -> ROTATION=0 (100% FLAT FRONT!)
          panel.rotation.x = 0.05 * Math.cos(theta);

          const distZ = Math.abs(panel.position.z);
          panel.material.opacity = Math.max(0.2, 1.0 - distZ * 0.08);
          panel.material.transparent = true;
          panel.renderOrder = 0;
        });
      } else {
        // In Focused Mode: Hide all background panels so ONLY the focused image is seen!
        panels.forEach((panel) => {
          if (panel === focusedMesh) {
            panel.renderOrder = 100;
            panel.material.opacity = 1.0;
            panel.material.transparent = false;
          } else {
            panel.renderOrder = 0;
            panel.material.opacity = 0.0;
            panel.material.transparent = true;
          }
        });
      }
    } else {
      // Horizontal mode (original 100% untouched)
      if (!isFocused) {
        currentX += (targetX - currentX) * 0.08;
        streamGroup.position.x = -currentX;
        streamGroup.position.y = 0;
        streamGroup.rotation.x = 0;
        streamGroup.rotation.y = 0;
      }

      const totalStreamWidth = totalItems * SPACING;
      const currentStreamX = -streamGroup.position.x;

      panels.forEach((panel) => {
        let worldX = panel.position.x - currentStreamX;
        
        while (worldX > totalStreamWidth / 2) {
          panel.position.x -= totalStreamWidth;
          worldX = panel.position.x - currentStreamX;
        }
        while (worldX < -totalStreamWidth / 2) {
          panel.position.x += totalStreamWidth;
          worldX = panel.position.x - currentStreamX;
        }

        const distFromCenter = Math.abs(worldX);

        if (isFocused) {
          if (panel === focusedMesh) {
            panel.renderOrder = 100;
            panel.material.opacity = 1.0;
            panel.material.transparent = false;
          } else {
            panel.renderOrder = 0;
            panel.material.opacity = 0.0;
            panel.material.transparent = true;
          }
        } else {
          panel.renderOrder = 0;
          const scaleFactor = Math.max(0.75, 1.08 - distFromCenter * 0.07);
          const opacityFactor = Math.max(0.25, 1.0 - distFromCenter * 0.22);
          
          panel.rotation.y = -worldX * 0.08;
          panel.scale.setScalar(scaleFactor);
          panel.material.opacity = opacityFactor;
          panel.material.transparent = true;
        }
      });
    }

    if (!isFocused) {
      // Calculate nearest active index
      let closestIdx = 0;
      let minDistance = Infinity;

      panels.forEach((panel) => {
        let dist = 0;
        if (animationMode === 'spiral') {
          dist = Math.abs(panel.position.z);
        } else {
          const currentStreamX = -streamGroup.position.x;
          dist = Math.abs(panel.position.x - currentStreamX);
        }

        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = panel.userData.index;
        }
      });

      if (closestIdx !== activeIndex) {
        activeIndex = closestIdx;
        const formattedIndex = String(activeIndex + 1).padStart(2, '0');
        counterBadge.querySelector('p').textContent = `${formattedIndex}/${String(totalItems).padStart(2, '0')}`;
        descText.textContent = showcaseItems[activeIndex] ? showcaseItems[activeIndex].desc : '';
      }
    }

    // Raycasting for Hover Detection
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(panels);

    if (intersects.length > 0) {
      hoveredMesh = intersects[0].object;
    } else {
      hoveredMesh = null;
    }

    renderer.render(scene, camera);
  }

  // Admin Panel Functionality & Reordering Logic
  let workingItems = [];
  let dragSrcEl = null;

  function renderAdminList() {
    adminList.innerHTML = '';
    workingItems.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'admin-item cursor-grab active:cursor-grabbing';
      el.draggable = true;
      el.dataset.index = index;

      el.innerHTML = `
        <div class="text-white/40 hover:text-white/80 cursor-grab px-1 text-base">⋮⋮</div>
        <div class="w-7 h-7 rounded-md bg-[#00f2fe]/20 text-[#00f2fe] font-mono text-xs font-bold flex items-center justify-center border border-[#00f2fe]/30 shrink-0">
          #${String(index + 1).padStart(2, '0')}
        </div>
        <img src="${item.src}" class="w-14 h-9 object-cover rounded-md border border-white/10 shrink-0">
        <input type="text" value="${item.desc}" class="item-desc-input flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe] transition-colors" data-index="${index}">
        <div class="flex items-center gap-1 shrink-0">
          <button class="move-up-btn p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors cursor-pointer text-xs ${index === 0 ? 'opacity-30 pointer-events-none' : ''}" data-index="${index}">▲</button>
          <button class="move-down-btn p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors cursor-pointer text-xs ${index === workingItems.length - 1 ? 'opacity-30 pointer-events-none' : ''}" data-index="${index}">▼</button>
          <button class="delete-item-btn p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-md transition-colors cursor-pointer text-xs ml-1" data-index="${index}" title="Eliminar foto">✕</button>
        </div>
      `;

      // Drag & Drop Event Listeners
      el.addEventListener('dragstart', handleDragStart);
      el.addEventListener('dragover', handleDragOver);
      el.addEventListener('dragenter', handleDragEnter);
      el.addEventListener('dragleave', handleDragLeave);
      el.addEventListener('drop', handleDrop);
      el.addEventListener('dragend', handleDragEnd);

      adminList.appendChild(el);
    });

    // Title Input Handlers
    adminList.querySelectorAll('.item-desc-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index);
        workingItems[idx].desc = e.target.value;
      });
    });

    // Move Up / Move Down Button Handlers
    adminList.querySelectorAll('.move-up-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        if (idx > 0) {
          const temp = workingItems[idx];
          workingItems[idx] = workingItems[idx - 1];
          workingItems[idx - 1] = temp;
          renderAdminList();
        }
      });
    });

    adminList.querySelectorAll('.move-down-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        if (idx < workingItems.length - 1) {
          const temp = workingItems[idx];
          workingItems[idx] = workingItems[idx + 1];
          workingItems[idx + 1] = temp;
          renderAdminList();
        }
      });
    });

    // Delete Item Button Handlers
    adminList.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        if (workingItems.length <= 1) {
          alert('Debe haber al menos 1 fotografía en la galería.');
          return;
        }
        workingItems.splice(idx, 1);
        renderAdminList();
      });
    });
  }

  function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
  }

  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter() {
    if (this !== dragSrcEl) this.classList.add('drag-over');
  }

  function handleDragLeave() {
    this.classList.remove('drag-over');
  }

  function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragSrcEl !== this) {
      const fromIdx = parseInt(dragSrcEl.dataset.index);
      const toIdx = parseInt(this.dataset.index);

      const movedItem = workingItems.splice(fromIdx, 1)[0];
      workingItems.splice(toIdx, 0, movedItem);

      renderAdminList();
    }
    return false;
  }

  function handleDragEnd() {
    document.querySelectorAll('.admin-item').forEach(item => {
      item.classList.remove('dragging', 'drag-over');
    });
  }

  // Modal Open & Close Event Handlers
  const loginModal = document.getElementById('loginModal');
  const loginUser = document.getElementById('loginUser');
  const loginPass = document.getElementById('loginPass');
  const loginErrorMsg = document.getElementById('loginErrorMsg');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const closeLoginBtn = document.getElementById('closeLoginBtn');
  const logoutAdminBtn = document.getElementById('logoutAdminBtn');

  function openAdminPanelDirect() {
    workingItems = JSON.parse(JSON.stringify(showcaseItems));
    if (animationModeSelect) {
      animationModeSelect.value = animationMode;
    }
    renderAdminList();
    adminModal.classList.add('open');
  }

  function openLoginModal() {
    loginUser.value = '';
    loginPass.value = '';
    loginErrorMsg.classList.add('hidden');
    loginModal.classList.add('open');
  }

  function closeLoginModal() {
    loginModal.classList.remove('open');
  }

  function checkAdminRoute() {
    const isPathAdmin = window.location.pathname === '/admin' || window.location.hash === '#admin';
    if (isPathAdmin) {
      const isAuth = sessionStorage.getItem('axel_admin_auth') === 'true';
      if (isAuth) {
        openAdminPanelDirect();
      } else {
        openLoginModal();
      }
    }
  }

  if (openAdminBtn) {
    openAdminBtn.addEventListener('click', () => {
      const isAuth = sessionStorage.getItem('axel_admin_auth') === 'true';
      if (isAuth) {
        openAdminPanelDirect();
      } else {
        openLoginModal();
      }
    });
  }

  closeLoginBtn.addEventListener('click', closeLoginModal);

  function performLogin() {
    const user = loginUser.value.trim();
    const pass = loginPass.value.trim();

    if (user === 'admin' && pass === 'admin12') {
      sessionStorage.setItem('axel_admin_auth', 'true');
      loginErrorMsg.classList.add('hidden');
      closeLoginModal();
      openAdminPanelDirect();
    } else {
      loginErrorMsg.classList.remove('hidden');
    }
  }

  adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    performLogin();
  });

  logoutAdminBtn.addEventListener('click', () => {
    sessionStorage.removeItem('axel_admin_auth');
    closeAdminModal();
  });

  function closeAdminModal() {
    adminModal.classList.remove('open');
  }

  closeAdminBtn.addEventListener('click', closeAdminModal);
  cancelAdminBtn.addEventListener('click', closeAdminModal);

  saveAdminBtn.addEventListener('click', () => {
    showcaseItems = JSON.parse(JSON.stringify(workingItems));
    if (animationModeSelect) {
      animationMode = animationModeSelect.value;
      try {
        localStorage.setItem('axel_gallery_anim_mode', animationMode);
      } catch (e) {}
    }

    try {
      localStorage.setItem('axel_gallery_order', JSON.stringify(showcaseItems));
    } catch (e) {}

    buildPanels();
    closeAdminModal();
  });

  // Dropzone & File Upload Handlers
  const uploadDropzone = document.getElementById('uploadDropzone');
  const fileUploadInput = document.getElementById('fileUploadInput');

  if (uploadDropzone && fileUploadInput) {
    uploadDropzone.addEventListener('click', () => {
      fileUploadInput.click();
    });

    fileUploadInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFilesUpload(Array.from(e.target.files));
        fileUploadInput.value = '';
      }
    });

    uploadDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadDropzone.classList.add('border-[#00f2fe]', 'bg-[#00f2fe]/10');
    });

    uploadDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadDropzone.classList.remove('border-[#00f2fe]', 'bg-[#00f2fe]/10');
    });

    uploadDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadDropzone.classList.remove('border-[#00f2fe]', 'bg-[#00f2fe]/10');

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const imageFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          handleFilesUpload(imageFiles);
        }
      }
    });
  }

  async function handleFilesUpload(files) {
    for (const file of files) {
      try {
        const base64Data = await readFileAsBase64(file);
        
        // Try uploading to server endpoint /api/upload
        let src = base64Data;
        let desc = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, data: base64Data })
          });
          const json = await res.json();
          if (json.success) {
            src = json.src;
            desc = json.desc;
          }
        } catch (serverErr) {
          console.warn('Server upload failed, using Data URL fallback:', serverErr);
        }

        workingItems.push({ src, desc });
      } catch (err) {
        console.error('Error reading file:', file.name, err);
      }
    }

    renderAdminList();
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  resetOrderBtn.addEventListener('click', () => {
    showcaseItems = JSON.parse(JSON.stringify(defaultShowcaseItems));
    workingItems = JSON.parse(JSON.stringify(defaultShowcaseItems));
    try {
      localStorage.removeItem('axel_gallery_order');
    } catch (e) {}

    renderAdminList();
    buildPanels();
  });

  // Handle Window Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Check if user accessed via /admin URL
  checkAdminRoute();

  // Start Animation
  animate();
});
