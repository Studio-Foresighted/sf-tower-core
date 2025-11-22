import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SETTINGS, PATH_WAYPOINTS } from './utils/settings.js';
import { Enemy } from './entities/enemy.js';
import { Tower } from './entities/tower.js';
import { DoomFace } from './ui/doomFace.js';
import { FloatingTextManager } from './ui/floatingText.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // State
        this.money = SETTINGS.STARTING_MONEY;
        this.lives = SETTINGS.BASE_HEALTH;
        this.waveIndex = 0;
        this.isWaveActive = false;
        this.enemiesToSpawn = [];
        this.nextSpawnTime = 0;
        
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        
        this.selectedTower = null;
        this.placingType = null;
        
        // Hero & Bot
        this.heroType = 'warrior';
        this.isBotMode = false;
        this.heroAbilityActive = false;
        this.heroAbilityTimer = 0;
        this.botTimer = 0;

        // Particles
        this.particles = [];
        
        // Callbacks for UI
        this.onStatsUpdate = null;
        this.onGameOver = null;
        this.onSelectionChange = null;
        this.onMessage = null; // New callback for messages

        this.doomFace = new DoomFace(); // Initialize Doom Face
        this.floatingText = new FloatingTextManager();

        this.timeScale = 1.0; // Game speed multiplier

        this.initThree();
        this.initMap();
        this.initInput();
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this.scene.fog = new THREE.Fog(0x111111, 30, 90);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
        this.camera.position.set(0, 40, 40); // Higher up for larger map
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Controls
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below ground
        this.controls.minDistance = 10;
        this.controls.maxDistance = 80;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(20, 40, 20);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 40;
        dirLight.shadow.camera.bottom = -40;
        dirLight.shadow.camera.left = -40;
        dirLight.shadow.camera.right = 40;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
    }

    initMap() {
        // Ground - Retro Grid
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0x050505, // Almost black
            roughness: 0.9 
        });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        // Path Visuals - Voxel Road
        const pathGroup = new THREE.Group();
        
        // Draw path segments
        for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
            const start = PATH_WAYPOINTS[i];
            const end = PATH_WAYPOINTS[i+1];
            
            const dx = end.x - start.x;
            const dz = end.z - start.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            // Create a road segment
            const roadGeo = new THREE.BoxGeometry(2, 0.1, dist);
            const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const road = new THREE.Mesh(roadGeo, roadMat);
            
            // Position at midpoint
            road.position.set(start.x + dx/2, 0.05, start.z + dz/2);
            
            // Rotate to align
            const angle = Math.atan2(dx, dz);
            road.rotation.y = angle;
            
            road.receiveShadow = true;
            pathGroup.add(road);
        }
        this.scene.add(pathGroup);

        // Base Area
        const endPoint = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
        this.baseGroup = new THREE.Group();
        this.baseGroup.position.set(endPoint.x, 0, endPoint.z);
        
        // Main Base Structure - Voxel Style
        const baseMainGeo = new THREE.BoxGeometry(4, 2, 4);
        const baseMainMat = new THREE.MeshStandardMaterial({ color: 0x0044ff, emissive: 0x001144, roughness: 0.2, metalness: 0.8 });
        const baseMain = new THREE.Mesh(baseMainGeo, baseMainMat);
        baseMain.position.y = 1;
        baseMain.castShadow = true;
        this.baseGroup.add(baseMain);
        
        // Energy Core - Voxel
        const coreGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.baseCore = new THREE.Mesh(coreGeo, coreMat);
        this.baseCore.position.y = 3;
        this.baseGroup.add(this.baseCore);
        
        // Base Ring - Voxel Blocks
        const ringGroup = new THREE.Group();
        for(let i=0; i<8; i++) {
            const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), coreMat);
            const angle = (i / 8) * Math.PI * 2;
            b.position.set(Math.cos(angle)*3, 0.5, Math.sin(angle)*3);
            ringGroup.add(b);
        }
        this.baseGroup.add(ringGroup);
        this.baseRing = ringGroup; // For animation

        this.scene.add(this.baseGroup);
        
        // Spawn Area (Portal)
        const startPoint = PATH_WAYPOINTS[0];
        this.spawnGroup = new THREE.Group();
        this.spawnGroup.position.set(startPoint.x, 0, startPoint.z);
        
        // Portal Frame
        const portalFrameGeo = new THREE.TorusGeometry(2, 0.3, 16, 32);
        const portalFrameMat = new THREE.MeshStandardMaterial({ color: 0x330000, metalness: 0.5 });
        const portalFrame = new THREE.Mesh(portalFrameGeo, portalFrameMat);
        portalFrame.position.y = 2;
        this.spawnGroup.add(portalFrame);
        
        // Portal Vortex
        const vortexGeo = new THREE.CircleGeometry(1.8, 32);
        const vortexMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        const vortex = new THREE.Mesh(vortexGeo, vortexMat);
        vortex.position.y = 2;
        this.spawnGroup.add(vortex);
        
        // Base Platform
        const spawnBaseGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 16);
        const spawnBaseMat = new THREE.MeshStandardMaterial({ color: 0x220000 });
        const spawnBase = new THREE.Mesh(spawnBaseGeo, spawnBaseMat);
        spawnBase.position.y = 0.1;
        this.spawnGroup.add(spawnBase);

        this.scene.add(this.spawnGroup);
        
        // Placement Ghost
        const ghostGeo = new THREE.BoxGeometry(1.8, 0.5, 1.8);
        const ghostMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
        this.ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
        this.ghostMesh.visible = false;
        
        // Ghost Range Ring
        // Use a group to hold border and fill
        this.ghostRangeGroup = new THREE.Group();
        
        // Border
        this.ghostRangeBorder = new THREE.Mesh(
            new THREE.RingGeometry(0.95, 1, 64),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
        );
        this.ghostRangeBorder.rotation.x = -Math.PI / 2;
        this.ghostRangeGroup.add(this.ghostRangeBorder);
        
        // Fill
        this.ghostRangeFill = new THREE.Mesh(
            new THREE.CircleGeometry(1, 64),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.1 })
        );
        this.ghostRangeFill.rotation.x = -Math.PI / 2;
        this.ghostRangeGroup.add(this.ghostRangeFill);
        
        this.ghostMesh.add(this.ghostRangeGroup);
        
        this.scene.add(this.ghostMesh);
    }

    initInput() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredTower = null;

        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / this.width) * 2 - 1;
            this.mouse.y = -(e.clientY / this.height) * 2 + 1;
            
            if (this.placingType) {
                this.updateGhost();
            } else {
                this.updateHover();
            }
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.placingType) {
                this.tryPlaceTower();
            } else {
                this.trySelectTower();
            }
        });
        
        // Right click to cancel
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.placingType = null;
            this.ghostMesh.visible = false;
            if (this.selectedTower) {
                this.selectedTower.deselect();
                this.selectedTower = null;
                if (this.onSelectionChange) this.onSelectionChange(null);
            }
        });
    }

    updateGhost() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.ground);
        
        if (intersects.length > 0) {
            const point = intersects[0].point;
            // Snap to grid (size 2)
            const x = Math.round(point.x / 2) * 2;
            const z = Math.round(point.z / 2) * 2;
            
            this.ghostMesh.position.set(x, 0.25, z);
            this.ghostMesh.visible = true;
            
            // Check validity color
            if (this.isValidPlacement(x, z)) {
                this.ghostMesh.material.color.setHex(0x00ff00);
            } else {
                this.ghostMesh.material.color.setHex(0xff0000);
            }
            
            // Update Ghost Range Ring
            if (this.placingType) {
                const range = SETTINGS.TOWERS[this.placingType].range;
                // Group is world-aligned, so scale X and Z to stretch the circle on the ground
                this.ghostRangeGroup.scale.set(range, 1, range);
            }
        } else {
            this.ghostMesh.visible = false;
        }
    }

    isValidPlacement(x, z) {
        // Check bounds
        if (Math.abs(x) > 38 || Math.abs(z) > 38) return false;
        
        // Check collision with towers
        for (const tower of this.towers) {
            if (Math.abs(tower.mesh.position.x - x) < 1 && Math.abs(tower.mesh.position.z - z) < 1) {
                return false;
            }
        }
        
        // Check collision with path
        // Simple check: distance to path segments
        const pos = new THREE.Vector3(x, 0, z);
        for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
            const p1 = new THREE.Vector3(PATH_WAYPOINTS[i].x, 0, PATH_WAYPOINTS[i].z);
            const p2 = new THREE.Vector3(PATH_WAYPOINTS[i+1].x, 0, PATH_WAYPOINTS[i+1].z);
            
            // Distance from point to line segment
            const line = new THREE.Line3(p1, p2);
            const closest = new THREE.Vector3();
            line.closestPointToPoint(pos, true, closest);
            
            if (pos.distanceTo(closest) < 1.5) { // 1.5 radius clearance
                return false;
            }
        }
        
        return true;
    }

    buildTower(type, x, z) {
        const cost = SETTINGS.TOWERS[type].cost;
        if (this.money >= cost) {
            this.money -= cost;
            const tower = new Tower(this.scene, type, x, z);
            this.towers.push(tower);
            if (this.onStatsUpdate) this.onStatsUpdate();
            return true;
        }
        return false;
    }

    tryPlaceTower() {
        if (!this.ghostMesh.visible) return;
        
        const x = this.ghostMesh.position.x;
        const z = this.ghostMesh.position.z;
        
        if (this.isValidPlacement(x, z)) {
            if (this.buildTower(this.placingType, x, z)) {
                // Continuous placement: don't clear placingType
                // this.placingType = null; 
                // this.ghostMesh.visible = false;
            }
        }
    }

    trySelectTower() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Intersect with tower meshes
        // Need to traverse towers
        let clickedTower = null;
        
        for (const tower of this.towers) {
            const intersects = this.raycaster.intersectObjects(tower.mesh.children);
            if (intersects.length > 0) {
                clickedTower = tower;
                break;
            }
        }
        
        if (this.selectedTower) {
            this.selectedTower.deselect();
        }
        
        this.selectedTower = clickedTower;
        
        if (this.selectedTower) {
            this.selectedTower.select();
        }
        
        if (this.onSelectionChange) this.onSelectionChange(this.selectedTower);
    }

    startWave() {
        if (this.isWaveActive) return;
        if (this.waveIndex >= SETTINGS.WAVES.length) return;
        
        this.isWaveActive = true;
        const waveConfig = SETTINGS.WAVES[this.waveIndex];
        
        // Prepare spawn queue
        this.enemiesToSpawn = [];
        
        for (const group of waveConfig) {
            for (let i = 0; i < group.count; i++) {
                this.enemiesToSpawn.push({
                    type: group.type,
                    delay: group.interval
                });
            }
        }
        
        this.spawnTimer = 0;
        this.waveIndex++;
        if (this.onStatsUpdate) this.onStatsUpdate();
        if (this.onMessage) this.onMessage(`Wave ${this.waveIndex} Started!`);
        
        this.doomFace.show();
    }

    spawnEnemy(type) {
        const enemy = new Enemy(this.scene, type, PATH_WAYPOINTS, this.hpMult, this.rewardMult);
        this.enemies.push(enemy);
    }

    update(time, dt) {
        this.controls.update();
        
        // Apply time scale
        dt *= this.timeScale;
        
        this.updateBot(dt);
        this.updateParticles(dt);

        // Hero Ability Logic
        if (this.heroAbilityActive) {
            this.heroAbilityTimer -= dt;
            if (this.heroAbilityTimer <= 0) {
                this.heroAbilityActive = false;
            }
        }

        // Wave Logic
        if (this.isWaveActive) {
            if (this.enemiesToSpawn.length > 0) {
                this.spawnTimer += dt;
                const nextEnemy = this.enemiesToSpawn[0];
                
                if (this.spawnTimer >= nextEnemy.delay) {
                    this.spawnEnemy(nextEnemy.type);
                    this.enemiesToSpawn.shift();
                    this.spawnTimer = 0;
                }
            } else if (this.enemies.length === 0) {
                this.isWaveActive = false;
                this.doomFace.hide();
                if (this.onMessage) this.onMessage("Wave Complete!");
                console.log("Wave Complete");
                if (this.waveIndex >= SETTINGS.WAVES.length) {
                    console.log("Victory");
                    if (this.onGameOver) this.onGameOver(true);
                }
            }
        }

        // Update Entities
        // Apply Mage Slow
        const speedMult = (this.heroType === 'mage' && this.heroAbilityActive) ? 0.5 : 1.0;
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt * speedMult);
            
            if (enemy.reachedEnd) {
                this.lives -= enemy.damage;
                this.scene.remove(enemy.mesh);
                this.enemies.splice(i, 1);
                if (this.onStatsUpdate) this.onStatsUpdate();
                
                if (this.lives <= 0) {
                    if (this.onGameOver) this.onGameOver(false);
                }
            }
        }

        // Apply Warrior Damage Boost
        const damageMult = (this.heroType === 'warrior' && this.heroAbilityActive) ? 2.0 : 1.0;

        this.towers.forEach(tower => {
            tower.update(dt, time, this.enemies, this.projectiles, damageMult);
        });

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            const hit = proj.update(dt);
            
            if (hit) {
                this.scene.remove(proj.mesh);
                this.projectiles.splice(i, 1);
                
                if (hit.takeDamage) { // If hit returns the enemy object
                     // Check hp (not health) and allow isDead because takeDamage sets it
                     if (hit.hp <= 0) {
                        // Ensure we only process death once (if still in list)
                        const idx = this.enemies.indexOf(hit);
                        if (idx > -1) {
                            this.money += hit.reward;
                            this.createExplosion(hit.mesh.position, hit.mesh.material.color);
                            this.floatingText.spawn(`+${hit.reward}`, hit.mesh.position, '#ffd700');
                            // Mesh is already removed by Enemy.die(), but we remove from array
                            this.enemies.splice(idx, 1);
                            if (this.onStatsUpdate) this.onStatsUpdate();
                        }
                    }
                }
            } else if (proj.life <= 0 || proj.isDead) {
                this.scene.remove(proj.mesh);
                this.projectiles.splice(i, 1);
            }
        }

        this.renderer.render(this.scene, this.camera);
        
        this.floatingText.update(dt, this.camera);

        // Animate Base and Spawn
        if (this.baseCore) {
            this.baseCore.rotation.y += dt;
            this.baseCore.position.y = 3 + Math.sin(time * 2) * 0.2;
        }
        if (this.spawnGroup) {
            // Rotate the portal frame or vortex?
            // Let's rotate the vortex if I can access it easily, or just the whole group?
            // I didn't save vortex reference. Let's just rotate the core.
        }

        this.updateParticles(dt);
    }
    
    upgradeSelected() {
        if (this.selectedTower) {
            const cost = Math.floor(this.selectedTower.cost * 0.5 * this.selectedTower.level);
            if (this.money >= cost) {
                this.money -= cost;
                this.selectedTower.upgrade();
                if (this.onStatsUpdate) this.onStatsUpdate();
                if (this.onSelectionChange) this.onSelectionChange(this.selectedTower);
            }
        }
    }
    
    sellSelected() {
        if (this.selectedTower) {
            const refund = Math.floor(this.selectedTower.cost * 0.5);
            this.money += refund;
            
            // Remove from scene
            this.scene.remove(this.selectedTower.mesh);
            // Remove from array
            const index = this.towers.indexOf(this.selectedTower);
            if (index > -1) this.towers.splice(index, 1);
            
            this.selectedTower = null;
            if (this.onStatsUpdate) this.onStatsUpdate();
            if (this.onSelectionChange) this.onSelectionChange(null);
        }
    }

    startGame(heroType, difficulty, botMode) {
        this.heroType = heroType;
        this.difficulty = difficulty;
        this.isBotMode = botMode;
        
        // Difficulty Multipliers
        this.hpMult = 1.0;
        this.rewardMult = 1.0;
        
        if (this.difficulty === 'normal') {
            this.hpMult = 1.15;
            this.rewardMult = 0.8;
        } else if (this.difficulty === 'hard') {
            this.hpMult = 1.4;
            this.rewardMult = 0.7;
        }
        
        // Reset Game State
        this.money = SETTINGS.STARTING_MONEY;
        this.lives = SETTINGS.BASE_HEALTH;
        this.waveIndex = 0;
        this.isWaveActive = false;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        
        // Clear Scene Entities
        // (In a real engine we'd remove children, here we just clear arrays and scene objects would need removal logic)
        // For simplicity, we'll reload the page or just clear known entity meshes
        // Ideally we should have a clearScene method.
        // Let's just reset values for now, assuming fresh start or simple restart.
        
        // Apply Hero Passive
        if (this.heroType === 'warrior') {
            // Warrior starts with more money? Or just damage boost logic in tower
            // Let's say Warrior towers do 10% more damage
        } else if (this.heroType === 'mage') {
            // Mage towers slow enemies?
        }
        
        if (this.onStatsUpdate) this.onStatsUpdate();
    }
    
    cancelPlacement() {
        this.placingType = null;
        this.ghostMesh.visible = false;
        if (this.selectedTower) {
            this.selectedTower.deselect();
            this.selectedTower = null;
            if (this.onSelectionChange) this.onSelectionChange(null);
        }
    }

    activateHeroAbility() {
        if (this.heroAbilityActive) return;
        
        console.log(`Activating ${this.heroType} ability!`);
        this.heroAbilityActive = true;
        this.heroAbilityTimer = 5.0; // 5 seconds duration
        
        // Visual effect
        const flash = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshBasicMaterial({ color: this.heroType === 'warrior' ? 0xff0000 : 0x0000ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
        );
        flash.rotation.x = Math.PI / 2;
        flash.position.y = 1;
        this.scene.add(flash);
        
        setTimeout(() => {
            this.scene.remove(flash);
        }, 500);
    }

    updateBot(dt) {
        if (!this.isBotMode) return;
        
        this.botTimer += dt;
        if (this.botTimer < 1.0) return; // Think every 1 second
        this.botTimer = 0;
        
        // Auto Start Wave
        if (!this.isWaveActive && this.enemies.length === 0) {
            this.startWave();
            return;
        }
        
        // Simple Build Logic
        // Try to build a random tower at a random valid spot
        if (this.money >= 100) {
            const types = ['basic', 'sniper', 'rapid'];
            const type = types[Math.floor(Math.random() * types.length)];
            const cost = SETTINGS.TOWERS[type].cost;
            
            if (this.money >= cost) {
                // Try 10 random spots
                for (let i = 0; i < 10; i++) {
                    const x = Math.floor(Math.random() * 20) * 2 - 20;
                    const z = Math.floor(Math.random() * 20) * 2 - 20;
                    
                    if (this.isValidPlacement(x, z)) {
                        this.buildTower(type, x, z);
                        break;
                    }
                }
            }
        }
    }

    updateHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        let found = null;
        for (const tower of this.towers) {
            const intersects = this.raycaster.intersectObjects(tower.mesh.children);
            if (intersects.length > 0) {
                found = tower;
                break;
            }
        }
        
        if (this.hoveredTower && this.hoveredTower !== found) {
            // Mouse left previous tower
            if (this.hoveredTower !== this.selectedTower) {
                this.hoveredTower.rangeRing.visible = false;
            }
        }
        
        this.hoveredTower = found;
        
        if (this.hoveredTower) {
            this.hoveredTower.rangeRing.visible = true;
        }
    }

    createExplosion(position, color) {
        const particleCount = 8;
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshBasicMaterial({ color: color });
        
        for (let i = 0; i < particleCount; i++) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(position);
            
            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5 + 2, // Upward bias
                (Math.random() - 0.5) * 5
            );
            
            this.particles.push({
                mesh: mesh,
                velocity: velocity,
                life: 1.0
            });
            
            this.scene.add(mesh);
        }
    }

    restartGame() {
        // Clear Entities
        this.enemies.forEach(e => this.scene.remove(e.mesh));
        this.enemies = [];
        
        this.towers.forEach(t => {
            this.scene.remove(t.mesh);
            if (t.rangeRing) this.scene.remove(t.rangeRing);
        });
        this.towers = [];
        
        this.projectiles.forEach(p => this.scene.remove(p.mesh));
        this.projectiles = [];
        
        this.particles.forEach(p => this.scene.remove(p.mesh));
        this.particles = [];
        
        // Reset State
        this.money = SETTINGS.STARTING_MONEY;
        this.lives = SETTINGS.BASE_HEALTH;
        this.waveIndex = 0;
        this.isWaveActive = false;
        this.enemiesToSpawn = [];
        this.selectedTower = null;
        this.placingType = null;
        this.ghostMesh.visible = false;
        
        // Reset UI
        if (this.onStatsUpdate) this.onStatsUpdate();
        if (this.onSelectionChange) this.onSelectionChange(null);
        
        // Hide Doom Face
        if (this.doomFace) this.doomFace.hide();
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
                continue;
            }
            
            p.velocity.y -= 9.8 * dt; // Gravity
            p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
            p.mesh.rotation.x += p.velocity.z * dt;
            p.mesh.rotation.z -= p.velocity.x * dt;
            p.mesh.scale.setScalar(p.life); // Shrink
        }
    }
}
