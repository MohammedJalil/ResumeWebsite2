/**
 * Mohammed-Taqi Jalil - Architectural 3D Spatial Workstation & Studio
 * Blender Cycles Baked GLTF Pipeline.
 * 
 * Powered by Three.js (local r128) & GLTFLoader.
 * Features:
 * - 3 Offline Cycles-Baked GLTF Models with sRGBEncoding & MeshBasicMaterial (120 FPS, photorealistic GI).
 * - Live High-Density Monitor Canvas (Tokyo Night IDE, SNH AI Medallion pipeline, Austin telemetry).
 * - Tactile 3D Hitboxes for Monitor, Coffee Mug, Custom Keyboard, and Desk Flora.
 * - Smooth Camera Interpolation with Mouse Parallax and Mobile Aspect-Ratio Compensation.
 * - Seamless ESC and "Return to 3D Room" navigation.
 */

(function (window, document) {
  'use strict';

  class StudioScene3D {
    constructor() {
      this.container = null;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2(0, 0);
      this.targetMouse = new THREE.Vector2(0, 0);

      // Camera Keyframes (Studio coordinate space scaled by 900)
      this.cameraStates = {
        desk: {
          pos: new THREE.Vector3(0, 1800, 5400),
          target: new THREE.Vector3(0, 500, 0)
        },
        room: {
          pos: new THREE.Vector3(0, 1800, 5400),
          target: new THREE.Vector3(0, 500, 0)
        },
        monitor: {
          pos: new THREE.Vector3(0, 950, 1780),
          target: new THREE.Vector3(0, 950, 255)
        },
        coffee: {
          pos: new THREE.Vector3(1250, 680, 1550),
          target: new THREE.Vector3(1670, 300, 900)
        },
        wide: {
          pos: new THREE.Vector3(-15000, 10000, 15000),
          target: new THREE.Vector3(0, 200, 0)
        }
      };

      this.currentState = 'desk';
      this.currentCamPos = this.cameraStates.desk.pos.clone();
      this.targetCamPos = this.cameraStates.desk.pos.clone();
      this.currentCamLook = this.cameraStates.desk.target.clone();
      this.targetCamLook = this.cameraStates.desk.target.clone();

      // Screen & Dynamic Canvas
      this.screenMesh = null;
      this.screenCanvas = null;
      this.screenCtx = null;
      this.screenTexture = null;
      this.cursorBlink = true;
      this.lastBlinkTime = 0;

      // Interactive hitboxes
      this.interactiveObjects = [];
      this.hoveredObject = null;

      // Steam particles
      this.steamParticles = null;

      // Timers & State Flags
      this.zoomTimeout = null;
      this.coffeeTimeout = null;
      this.isLoaded = false;
    }

    init() {
      this.container = document.getElementById('canvas3dContainer');
      if (!this.container) return;

      // Global escape hatch
      window.returnTo3DRoom = () => this.setCameraState('desk', true);

      const width = window.innerWidth;
      const height = window.innerHeight;

      // 1. WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.setClearColor(0x090b10, 1.0);
      this.container.appendChild(this.renderer.domElement);

      // 2. Perspective Camera (35° FOV matches architectural medium-telephoto lens)
      this.camera = new THREE.PerspectiveCamera(35, width / height, 10, 900000);
      this.camera.position.copy(this.cameraStates.desk.pos);
      this.camera.lookAt(this.cameraStates.desk.target);

      // 3. Scene
      this.scene = new THREE.Scene();

      // 4. Create Mohammed's High-Density Monitor Canvas
      this.createScreenDisplay();

      // 5. Load Blender-Baked GLTF Models & Textures
      this.loadBakedRoomAssets();

      // 6. Build Interactive Hitboxes
      this.buildHitboxes();

      // 7. Coffee Steam
      this.buildCoffeeSteam();

      // 8. Event Listeners
      this.bindEvents();

      // 9. Start Render Loop
      this.animate(0);
    }

    /* --------------------------------------------------------------------------
       High-Density Tokyo Night Monitor Screen Canvas (1280 x 1024)
       -------------------------------------------------------------------------- */
    createScreenDisplay() {
      const w = 1280;
      const h = 1024;
      this.screenCanvas = document.createElement('canvas');
      this.screenCanvas.width = w;
      this.screenCanvas.height = h;
      this.screenCtx = this.screenCanvas.getContext('2d');

      this.renderScreenContent(true);

      this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
      this.screenTexture.encoding = THREE.sRGBEncoding;
      this.screenTexture.generateMipmaps = true;
      this.screenTexture.minFilter = THREE.LinearMipmapLinearFilter;

      const screenMat = new THREE.MeshBasicMaterial({
        map: this.screenTexture,
        side: THREE.DoubleSide
      });

      const screenGeo = new THREE.PlaneGeometry(w, h);
      this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
      // Workstation monitor position and slight backward tilt
      this.screenMesh.position.set(0, 950, 255);
      this.screenMesh.rotation.set(-3 * (Math.PI / 180), 0, 0);
      this.screenMesh.name = 'screenMesh';

      this.scene.add(this.screenMesh);

      // Subtle bezel shadow surround
      const bezelMat = new THREE.MeshBasicMaterial({ color: 0x121418, side: THREE.DoubleSide });
      const topBezel = new THREE.Mesh(new THREE.PlaneGeometry(w + 16, 12), bezelMat);
      topBezel.position.set(0, 950 + h / 2 + 6, 254);
      topBezel.rotation.copy(this.screenMesh.rotation);
      this.scene.add(topBezel);
    }

    renderScreenContent(showCursor) {
      const ctx = this.screenCtx;
      if (!ctx) return;

      const w = 1280;
      const h = 1024;

      // Background: Deep Tokyo Night Indigo
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);

      // Top Title Bar
      ctx.fillStyle = '#10141e';
      ctx.fillRect(0, 0, w, 44);

      // Window Dots
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(24, 22, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(44, 22, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#10b981';
      ctx.beginPath(); ctx.arc(64, 22, 6, 0, Math.PI * 2); ctx.fill();

      // Title
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px monospace';
      ctx.fillText('taqi@austin-station: ~/pipelines/adjudication (zsh)', 100, 26);

      // Tabs Header
      ctx.fillStyle = '#151b29';
      ctx.fillRect(0, 44, w, 38);

      // Active Tab
      ctx.fillStyle = '#1b2234';
      ctx.fillRect(60, 44, 185, 38);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 13px monospace';
      ctx.fillText('⚡ core_pipeline.py', 80, 68);

      // Inactive Tabs
      ctx.fillStyle = '#64748b';
      ctx.font = '500 13px monospace';
      ctx.fillText('📊 gold_analytics.sql', 270, 68);
      ctx.fillText('☕ austin_roasters.json', 460, 68);
      ctx.fillText('🔬 computational_bio.rs', 670, 68);

      // Split View Border
      ctx.strokeStyle = '#1e2638';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(820, 82);
      ctx.lineTo(820, 720);
      ctx.stroke();

      // Left Panel: Code Editor (Lines 1 - 22)
      // Line numbers gutter
      ctx.fillStyle = '#0d111a';
      ctx.fillRect(0, 82, 55, 638);
      ctx.fillStyle = '#334155';
      ctx.font = '13px monospace';
      for (let i = 1; i <= 21; i++) {
        ctx.fillText(i < 10 ? `  ${i}` : ` ${i}`, 14, 112 + (i - 1) * 28);
      }

      // Code Lines
      const codeStartX = 75;
      const codeLines = [
        { c: '#64748b', t: '# SNH AI — Medallion Ingestion & Jurisdiction Adjudication Engine' },
        { c: '#bb9af7', t: 'from ', sub: [{ c: '#f8fafc', t: 'fastapi ' }, { c: '#bb9af7', t: 'import ' }, { c: '#f8fafc', t: 'FastAPI, BackgroundTasks' }] },
        { c: '#bb9af7', t: 'from ', sub: [{ c: '#38bdf8', t: 'snh_ai.data ' }, { c: '#bb9af7', t: 'import ' }, { c: '#f8fafc', t: 'MedallionStage, GoldFeatureStore' }] },
        { c: '#64748b', t: '' },
        { c: '#7aa2f7', t: '@app.post("/v1/adjudicate", response_model=GoldRecord)' },
        { c: '#bb9af7', t: 'async def ', sub: [{ c: '#7aa2f7', t: 'transform_event' }, { c: '#e2e8f0', t: '(payload: RawEvent) -> GoldRecord:' }] },
        { c: '#e2e8f0', t: '    """Orchestrate Bronze-to-Gold schema normalization with 0% data loss."""' },
        { c: '#e2e8f0', t: '    stage = await MedallionStage.bronze_to_silver(payload)' },
        { c: '#e2e8f0', t: '    gold_record = await jurisdiction_engine.evaluate(stage)' },
        { c: '#bb9af7', t: '    await ', sub: [{ c: '#38bdf8', t: 'bigquery.stage_gold' }, { c: '#e2e8f0', t: '("snh_ai.gold_features", gold_record)' }] },
        { c: '#bb9af7', t: '    return ', sub: [{ c: '#e2e8f0', t: 'gold_record' }] },
        { c: '#64748b', t: '' },
        { c: '#64748b', t: '# Automated Quality Gate Validation' },
        { c: '#bb9af7', t: 'def ', sub: [{ c: '#7aa2f7', t: 'assert_zero_loss' }, { c: '#e2e8f0', t: '(bronze_cnt: int, gold_cnt: int):' }] },
        { c: '#e2e8f0', t: '    assert bronze_cnt == gold_cnt, f"Drift detected: {bronze_cnt - gold_cnt}"' },
        { c: '#7aa2f7', t: '    logger.info("Pipeline health: 100% parity across 100+ merged PRs")' },
        { c: '#64748b', t: '' },
        { c: '#64748b', t: '# Click Monitor or "Browse Full Dossier" to explore live architecture' },
        { c: '#10b981', t: 'status = "ACTIVE_DATA_ENGINEER_IN_AUSTIN_TX"' }
      ];

      codeLines.forEach((line, idx) => {
        const y = 112 + idx * 28;
        if (line.sub) {
          let currX = codeStartX;
          ctx.fillStyle = line.c;
          ctx.font = '14px monospace';
          ctx.fillText(line.t, currX, y);
          currX += ctx.measureText(line.t).width;

          line.sub.forEach(subItem => {
            ctx.fillStyle = subItem.c;
            ctx.fillText(subItem.t, currX, y);
            currX += ctx.measureText(subItem.t).width;
          });
        } else {
          ctx.fillStyle = line.c;
          ctx.font = '14px monospace';
          ctx.fillText(line.t, codeStartX, y);
        }
      });

      // Blinking Cursor on code editor
      if (showCursor) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(codeStartX + ctx.measureText('status = "ACTIVE_DATA_ENGINEER_IN_AUSTIN_TX"').width + 6, 112 + 18 * 28 - 14, 8, 16);
      }

      // Right Panel: Live Austin & Cluster Telemetry Dashboard
      const rX = 840;
      ctx.fillStyle = '#10141f';
      ctx.fillRect(821, 82, w - 821, 638);

      // Section: Telemetry Header
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('LIVE TELEMETRY & SYSTEM STATE', rX, 112);

      // Metric Cards
      const metrics = [
        { label: 'CLUSTER', val: 'gcp-us-central1 (Austin)', c: '#f8fafc' },
        { label: 'INGESTION', val: '1.4 TB / 24h · 0% loss', c: '#10b981' },
        { label: 'MEDALLION P99', val: '24ms latency', c: '#10b981' },
        { label: 'PR MERGES', val: '100+ Production PRs', c: '#38bdf8' },
        { label: 'AUSTIN STATUS', val: 'South Congress / Lamar', c: '#fbbf24' },
        { label: 'COFFEE FUEL', val: 'Houndstooth Cortado', c: '#e0532e' },
        { label: 'KEYBOARD', val: '75% Boba U4T Tactiles', c: '#a78bfa' },
        { label: 'DEGREE', val: 'UT Austin Computational Bio', c: '#94a3b8' }
      ];

      metrics.forEach((m, idx) => {
        const my = 145 + idx * 56;
        ctx.fillStyle = '#171d2b';
        ctx.fillRect(rX, my, w - rX - 30, 46);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText(m.label, rX + 14, my + 18);

        ctx.fillStyle = m.c;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(m.val, rX + 14, my + 37);
      });

      // Bottom Split: Interactive Terminal / Shell
      const tY = 720;
      ctx.fillStyle = '#080a0f';
      ctx.fillRect(0, tY, w, h - tY);

      ctx.fillStyle = '#151a24';
      ctx.fillRect(0, tY, w, 30);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText('TERMINAL: bq query --use_legacy_sql=false (Active Session)', 24, tY + 20);

      // Terminal content
      ctx.fillStyle = '#38bdf8';
      ctx.font = '13px monospace';
      ctx.fillText('taqi@austin-station:~$ bq query "SELECT jurisdiction, records_processed FROM `snh_ai.gold_features` LIMIT 3;"', 24, tY + 56);

      ctx.fillStyle = '#475569';
      ctx.fillText('+--------------------+-------------------+', 24, tY + 84);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('|    jurisdiction    | records_processed |', 24, tY + 104);
      ctx.fillStyle = '#475569';
      ctx.fillText('+--------------------+-------------------+', 24, tY + 124);
      ctx.fillStyle = '#10b981';
      ctx.fillText('| Travis County, TX  |       2,410,880   |', 24, tY + 144);
      ctx.fillText('| Harris County, TX  |       4,891,012   |', 24, tY + 164);
      ctx.fillText('| Dallas County, TX  |       3,120,449   |', 24, tY + 184);
      ctx.fillStyle = '#475569';
      ctx.fillText('+--------------------+-------------------+', 24, tY + 204);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText('taqi@austin-station:~$ [CLICK MONITOR OR SCROLL DOWN TO EXPAND FULL DOSSIER]', 24, tY + 240);
      if (showCursor) {
        ctx.fillRect(24 + ctx.measureText('taqi@austin-station:~$ [CLICK MONITOR OR SCROLL DOWN TO EXPAND FULL DOSSIER]').width + 8, tY + 226, 8, 16);
      }

      // CRT Scanline Overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1.5);
      }
    }

    /* --------------------------------------------------------------------------
       Blender-Baked GLTF Model Loader (Scale = 900, MeshBasicMaterial)
       -------------------------------------------------------------------------- */
    loadBakedRoomAssets() {
      const gltfLoader = new THREE.GLTFLoader();
      const textureLoader = new THREE.TextureLoader();

      const assets = [
        {
          id: 'computer',
          modelPath: 'models/computer_setup.glb',
          texturePath: 'models/baked_computer.jpg',
          scale: 900
        },
        {
          id: 'environment',
          modelPath: 'models/environment.glb',
          texturePath: 'models/baked_environment.jpg',
          scale: 900
        },
        {
          id: 'decor',
          modelPath: 'models/decor.glb',
          texturePath: 'models/baked_decor.jpg',
          scale: 900
        }
      ];

      let loadedCount = 0;
      const totalAssets = assets.length * 2; // model + texture for each

      const updateProgress = () => {
        loadedCount++;
        const percent = Math.round((loadedCount / totalAssets) * 100);
        const bar = document.getElementById('studioLoaderProgress');
        const txt = document.getElementById('studioLoaderText');
        if (bar) bar.style.width = `${percent}%`;
        if (txt) txt.innerHTML = `Loading baked illumination &amp; geometry... ${percent}%`;

        if (loadedCount >= totalAssets) {
          setTimeout(() => {
            const loader = document.getElementById('studioLoader');
            if (loader) loader.classList.add('is-loaded');
            this.isLoaded = true;
          }, 350);
        }
      };

      assets.forEach(asset => {
        textureLoader.load(
          asset.texturePath,
          texture => {
            texture.flipY = false;
            texture.encoding = THREE.sRGBEncoding;
            updateProgress();

            gltfLoader.load(
              asset.modelPath,
              gltf => {
                const material = new THREE.MeshBasicMaterial({ map: texture });
                gltf.scene.traverse(child => {
                  if (child.isMesh) {
                    child.scale.set(asset.scale, asset.scale, asset.scale);
                    child.material = material;
                  }
                });

                this.scene.add(gltf.scene);
                updateProgress();
              },
              undefined,
              err => {
                console.error(`Error loading model ${asset.modelPath}:`, err);
                updateProgress();
              }
            );
          },
          undefined,
          err => {
            console.error(`Error loading texture ${asset.texturePath}:`, err);
            updateProgress();
          }
        );
      });
    }

    /* --------------------------------------------------------------------------
       Interactive Hitboxes for Raycasting
       -------------------------------------------------------------------------- */
    buildHitboxes() {
      // Material: invisible hitbox that captures raycasts
      const createHitboxMaterial = () => new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      // 1. Computer / Monitor Hitbox
      const monitorBox = new THREE.Mesh(
        new THREE.BoxGeometry(1600, 1300, 600),
        createHitboxMaterial()
      );
      monitorBox.position.set(0, 950, 260);
      monitorBox.userData = {
        id: 'monitor',
        label: '🖥️ Workstation Monitor — Click to Enter Dossier'
      };
      this.scene.add(monitorBox);
      this.interactiveObjects.push(monitorBox);

      // 2. Houndstooth Coffee Mug Hitbox
      // (Artisanal coffee mug in decor.glb located at x: 1670, y: 200, z: 900)
      const coffeeBox = new THREE.Mesh(
        new THREE.BoxGeometry(450, 600, 450),
        createHitboxMaterial()
      );
      coffeeBox.position.set(1670, 260, 900);
      coffeeBox.userData = {
        id: 'coffee',
        label: '☕ Houndstooth Cortado — Austin Coffee Compass'
      };
      this.scene.add(coffeeBox);
      this.interactiveObjects.push(coffeeBox);

      // 3. Custom Mechanical Keyboard Hitbox
      const keyboardBox = new THREE.Mesh(
        new THREE.BoxGeometry(1100, 220, 500),
        createHitboxMaterial()
      );
      keyboardBox.position.set(0, 160, 1150);
      keyboardBox.userData = {
        id: 'keyboard',
        label: '⌨️ Custom 75% Keyboard — Boba U4T Tactiles'
      };
      this.scene.add(keyboardBox);
      this.interactiveObjects.push(keyboardBox);

      // 4. Desk Flora / Plant Hitbox
      const plantBox = new THREE.Mesh(
        new THREE.BoxGeometry(600, 800, 600),
        createHitboxMaterial()
      );
      plantBox.position.set(-1800, 400, 200);
      plantBox.userData = {
        id: 'plant',
        label: '🌱 Desk Succulent (Austin Studio)'
      };
      this.scene.add(plantBox);
      this.interactiveObjects.push(plantBox);
    }

    /* --------------------------------------------------------------------------
       Coffee Steam Effect (Subtle rising wisps from the cortado cup)
       -------------------------------------------------------------------------- */
    buildCoffeeSteam() {
      const particleCount = 28;
      const geo = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3 + 0] = 1670 + (Math.random() - 0.5) * 60;
        posArray[i * 3 + 1] = 300 + Math.random() * 400;
        posArray[i * 3 + 2] = 900 + (Math.random() - 0.5) * 60;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      const mat = new THREE.PointsMaterial({
        color: 0xdedede,
        size: 24,
        transparent: true,
        opacity: 0.22,
        depthWrite: false
      });

      this.steamParticles = new THREE.Points(geo, mat);
      this.scene.add(this.steamParticles);
    }

    /* --------------------------------------------------------------------------
       User Interactions & Events
       -------------------------------------------------------------------------- */
    bindEvents() {
      window.addEventListener('resize', () => this.onResize());
      window.addEventListener('mousemove', e => this.onMouseMove(e));
      this.renderer.domElement.addEventListener('click', e => this.onClick(e));

      // Scroll wheel to zoom into monitor from room view
      window.addEventListener('wheel', e => {
        if (this.currentState === 'desk' && e.deltaY > 50) {
          this.setCameraState('monitor');
        }
      }, { passive: true });

      // Click delegation for all Step Back buttons
      document.addEventListener('click', e => {
        const btn = e.target.closest('#stepBackBtn, .back-to-room-btn');
        if (btn) {
          e.preventDefault();
          this.setCameraState('desk', true);
        }
      });

      // Keyboard navigation (ESC returns to desk view)
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          if (e.target && typeof e.target.blur === 'function') {
            e.target.blur();
          }
          this.setCameraState('desk', true);
          return;
        }

        // Spacebar enters monitor when in desk view
        if (e.key === ' ' && this.currentState === 'desk') {
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
            return;
          }
          e.preventDefault();
          this.setCameraState('monitor');
        }
      });
    }

    onResize() {
      if (!this.renderer || !this.camera) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    onMouseMove(e) {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.currentState === 'desk') {
        this.targetMouse.x = this.mouse.x;
        this.targetMouse.y = this.mouse.y;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveObjects, false);

        const hoverPill = document.getElementById('sceneHoverPill');
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          document.body.style.cursor = 'pointer';
          this.hoveredObject = hit;
          if (hoverPill && hit.userData && hit.userData.label) {
            hoverPill.textContent = hit.userData.label;
            hoverPill.style.display = 'inline-flex';
            hoverPill.classList.remove('opacity-0');
          }
        } else {
          document.body.style.cursor = 'default';
          this.hoveredObject = null;
          if (hoverPill) hoverPill.classList.add('opacity-0');
        }
      }
    }

    onClick(e) {
      if (this.currentState !== 'desk') return;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.interactiveObjects, false);

      if (intersects.length > 0) {
        const id = intersects[0].object.userData.id;

        if (id === 'monitor') {
          this.setCameraState('monitor');
        } else if (id === 'coffee') {
          this.setCameraState('coffee');
          if (this.coffeeTimeout) clearTimeout(this.coffeeTimeout);
          this.coffeeTimeout = setTimeout(() => {
            this.openDossierDirectly();
            const coffeeSec = document.getElementById('coffee');
            if (coffeeSec) coffeeSec.scrollIntoView({ behavior: 'smooth' });
          }, 500);
        } else if (id === 'keyboard') {
          if (window.soundEngine) window.soundEngine.playKeyClick();
          // Brief pulse on monitor terminal
          this.renderScreenContent(true);
          if (this.screenTexture) this.screenTexture.needsUpdate = true;
        } else if (id === 'plant') {
          if (window.soundEngine) window.soundEngine.playTone(680, 0.08, 'sine', 0.1);
        }
      }
    }

    openDossierDirectly() {
      if (this.zoomTimeout) {
        clearTimeout(this.zoomTimeout);
        this.zoomTimeout = null;
      }
      if (this.coffeeTimeout) {
        clearTimeout(this.coffeeTimeout);
        this.coffeeTimeout = null;
      }
      this.setCameraState('monitor', true);
      const overlay = document.getElementById('monitorOverlay');
      if (overlay) {
        overlay.classList.add('is-active');
      }
    }

    setCameraState(stateName, force = false) {
      if (stateName === 'room') stateName = 'desk';
      if (this.zoomTimeout) {
        clearTimeout(this.zoomTimeout);
        this.zoomTimeout = null;
      }
      if (this.coffeeTimeout) {
        clearTimeout(this.coffeeTimeout);
        this.coffeeTimeout = null;
      }

      if (!force && this.currentState === stateName) {
        if (stateName === 'desk') {
          const overlay = document.getElementById('monitorOverlay');
          if (overlay) {
            overlay.classList.remove('is-active');
            overlay.scrollTop = 0;
          }
          const stepBackBtn = document.getElementById('stepBackBtn');
          if (stepBackBtn) stepBackBtn.classList.add('hidden');
          const roomCta = document.getElementById('roomCtaBar');
          if (roomCta) roomCta.classList.remove('is-hidden');
        }
        return;
      }

      this.currentState = stateName;
      const target = this.cameraStates[stateName];
      if (!target) return;

      this.targetCamPos.copy(target.pos);
      this.targetCamLook.copy(target.target);

      const overlay = document.getElementById('monitorOverlay');
      const stepBackBtn = document.getElementById('stepBackBtn');
      const roomCta = document.getElementById('roomCtaBar');
      const hoverPill = document.getElementById('sceneHoverPill');

      if (stateName === 'monitor') {
        if (window.soundEngine) window.soundEngine.playZoomIn();
        if (roomCta) roomCta.classList.add('is-hidden');
        if (stepBackBtn) stepBackBtn.classList.remove('hidden');
        if (hoverPill) hoverPill.classList.add('opacity-0');

        // Smoothly display overlay as camera approaches the monitor
        this.zoomTimeout = setTimeout(() => {
          if (overlay) overlay.classList.add('is-active');
        }, 400);

      } else if (stateName === 'desk') {
        if (window.soundEngine) window.soundEngine.playZoomOut();
        // Immediately fade out overlay so 3D room is visible and reset scroll
        if (overlay) {
          overlay.classList.remove('is-active');
          overlay.scrollTop = 0;
        }
        if (stepBackBtn) stepBackBtn.classList.add('hidden');
        if (roomCta) roomCta.classList.remove('is-hidden');

      } else if (stateName === 'coffee') {
        if (window.soundEngine) window.soundEngine.playTone(560, 0.08, 'sine');
        if (overlay) overlay.classList.remove('is-active');
        if (stepBackBtn) stepBackBtn.classList.remove('hidden');
        if (roomCta) roomCta.classList.add('is-hidden');
      }
    }

    animate(timestamp) {
      requestAnimationFrame(time => this.animate(time));

      // Cursor blinking on monitor screen every 520ms
      if (timestamp - this.lastBlinkTime > 520) {
        this.cursorBlink = !this.cursorBlink;
        this.lastBlinkTime = timestamp;
        this.renderScreenContent(this.cursorBlink);
        if (this.screenTexture) {
          this.screenTexture.needsUpdate = true;
        }
      }

      // Camera smooth interpolation (smooth quintic feel with lerp)
      const lerpSpeed = 0.055;
      this.currentCamPos.lerp(this.targetCamPos, lerpSpeed);
      this.currentCamLook.lerp(this.targetCamLook, lerpSpeed);

      // Subtle mouse parallax when in desk view
      if (this.currentState === 'desk') {
        const aspect = window.innerHeight / window.innerWidth;
        const targetX = this.targetCamPos.x + this.targetMouse.x * 220;
        const targetY = this.targetCamPos.y + this.targetMouse.y * 120;
        const targetZ = this.targetCamPos.z + aspect * 800 - 400;

        this.camera.position.set(
          this.currentCamPos.x + (targetX - this.currentCamPos.x) * 0.05,
          this.currentCamPos.y + (targetY - this.currentCamPos.y) * 0.05,
          this.currentCamPos.z + (targetZ - this.currentCamPos.z) * 0.05
        );
      } else {
        this.camera.position.copy(this.currentCamPos);
      }

      this.camera.lookAt(this.currentCamLook);

      // Animate Coffee Steam
      if (this.steamParticles) {
        const positions = this.steamParticles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += 1.2;
          positions[i - 1] += (Math.random() - 0.5) * 0.4;
          if (positions[i] > 650) {
            positions[i] = 280;
            positions[i - 1] = 1670 + (Math.random() - 0.5) * 50;
          }
        }
        this.steamParticles.geometry.attributes.position.needsUpdate = true;
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  window.studioScene3D = new StudioScene3D();
  document.addEventListener('DOMContentLoaded', () => {
    window.studioScene3D.init();
  });
})(window, document);
