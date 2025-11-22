import * as THREE from 'three';
import { SETTINGS } from '../utils/settings.js';
import { Projectile } from './projectile.js';

export class Tower {
    constructor(scene, type, x, z) {
        this.scene = scene;
        this.type = type;
        this.level = 1;
        
        const stats = SETTINGS.TOWERS[type];
        this.range = stats.range;
        this.damage = stats.damage;
        this.cooldown = stats.cooldown;
        this.cost = stats.cost;
        this.color = stats.color;
        this.height = stats.height;
        
        this.lastShotTime = 0;
        
        // Group for the whole tower
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 0, z);
        
        // Voxel Style Base (Stacked Cubes)
        const baseGeo = new THREE.BoxGeometry(2.4, 0.5, 2.4);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x555555 }); // Dark grey stone
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.25;
        base.castShadow = true;
        base.receiveShadow = true;
        this.mesh.add(base);
        
        // Voxel Turret Body
        let bodyGeo;
        if (type === 'basic') {
            // Simple pillar
            bodyGeo = new THREE.BoxGeometry(1.2, this.height, 1.2);
        } else if (type === 'sniper') {
            // Tall thin pillar
            bodyGeo = new THREE.BoxGeometry(0.8, this.height, 0.8);
        } else if (type === 'rapid') {
            // Wide short block
            bodyGeo = new THREE.BoxGeometry(1.6, this.height, 1.6);
        }
        
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.2, // Shiny plastic/metal look
            metalness: 0.5
        });
        this.turretHead = new THREE.Mesh(bodyGeo, bodyMat);
        this.turretHead.position.y = 0.5 + this.height / 2;
        this.turretHead.castShadow = true;
        this.mesh.add(this.turretHead);
        
        // Voxel Cannon / Barrel
        // Remove old barrel logic and replace with voxel logic
        if (type === 'basic') {
            const bGeo = new THREE.BoxGeometry(0.3, 0.3, 1.2);
            const barrel = new THREE.Mesh(bGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
            barrel.position.z = 0.6;
            barrel.position.y = 0.2;
            this.turretHead.add(barrel);
        } else if (type === 'sniper') {
            const bGeo = new THREE.BoxGeometry(0.15, 0.15, 2.5);
            const barrel = new THREE.Mesh(bGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
            barrel.position.z = 1.2;
            barrel.position.y = 0.5;
            this.turretHead.add(barrel);
        } else if (type === 'rapid') {
            const bGeo = new THREE.BoxGeometry(0.15, 0.15, 0.8);
            const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            // 4 barrels
            const offsets = [[0.2, 0.2], [0.2, -0.2], [-0.2, 0.2], [-0.2, -0.2]];
            offsets.forEach(off => {
                const b = new THREE.Mesh(bGeo, mat);
                b.position.set(off[0], 0, 0.5);
                this.turretHead.add(b);
            });
        }

        // Add "bolts" or details (small cubes)
        const detailGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const detailMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const d1 = new THREE.Mesh(detailGeo, detailMat);
        d1.position.set(0.4, 0, 0);
        this.turretHead.add(d1);
        
        const d2 = new THREE.Mesh(detailGeo, detailMat);
        d2.position.set(-0.4, 0, 0);
        this.turretHead.add(d2);
        
        // Range Indicator (hidden by default)
        const rangeGeo = new THREE.RingGeometry(this.range - 0.1, this.range, 32);
        const rangeMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 0.3 
        });
        this.rangeRing = new THREE.Mesh(rangeGeo, rangeMat);
        this.rangeRing.rotation.x = -Math.PI / 2;
        this.rangeRing.position.y = 0.1;
        this.rangeRing.visible = false;
        this.mesh.add(this.rangeRing);

        this.scene.add(this.mesh);
    }

    update(dt, time, enemies, projectiles, damageMult = 1.0) {
        // Find target
        let target = null;
        let minDist = this.range;

        // Simple targeting: closest
        for (const enemy of enemies) {
            const dist = this.mesh.position.distanceTo(enemy.mesh.position);
            if (dist <= this.range) {
                // Prioritize closest to end? Or closest to tower?
                // Let's do closest to tower for simplicity
                if (dist < minDist) {
                    minDist = dist;
                    target = enemy;
                }
            }
        }

        if (target) {
            // Rotate turret to face target
            this.turretHead.lookAt(target.mesh.position.x, this.turretHead.position.y, target.mesh.position.z);

            // Shoot
            if (time - this.lastShotTime >= this.cooldown) {
                this.shoot(target, projectiles, damageMult);
                this.lastShotTime = time;
            }
        }
    }

    shoot(target, projectiles, damageMult) {
        const startPos = this.mesh.position.clone();
        startPos.y = this.height + 0.5; // Top of turret
        
        const proj = new Projectile(
            this.scene, 
            startPos, 
            target, 
            this.damage * damageMult, 
            5.0, // Base projectile speed
            this.color
        );
        projectiles.push(proj);
    }

    select() {
        this.rangeRing.visible = true;
        // Highlight material?
    }

    deselect() {
        this.rangeRing.visible = false;
    }
    
    upgrade() {
        this.level++;
        this.damage *= 1.2;
        this.range *= 1.1;
        this.cooldown *= 0.9;
        
        // Update range ring
        this.mesh.remove(this.rangeRing);
        const rangeGeo = new THREE.RingGeometry(this.range - 0.1, this.range, 32);
        const rangeMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 0.3 
        });
        this.rangeRing = new THREE.Mesh(rangeGeo, rangeMat);
        this.rangeRing.rotation.x = -Math.PI / 2;
        this.rangeRing.position.y = 0.1;
        this.rangeRing.visible = true; // Keep visible if selected
        this.mesh.add(this.rangeRing);
    }

    createRangeRing(range, color = 0xffffff, isDotted = false) {
        // Use CircleGeometry for a filled area, but we want a border.
        // Let's use a thin ring for border and a very transparent circle for fill.
        
        const group = new THREE.Group();
        
        // 1. The Border (Thin Line)
        // RingGeometry with very small difference is okay, or LineLoop
        const borderGeo = new THREE.RingGeometry(range - 0.05, range, 64);
        const borderMat = new THREE.MeshBasicMaterial({ 
            color: color, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: isDotted ? 0.8 : 0.5
        });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.rotation.x = -Math.PI / 2;
        border.position.y = 0.1;
        group.add(border);
        
        // 2. The Fill (Transparent Area)
        if (!isDotted) {
            const fillGeo = new THREE.CircleGeometry(range, 64);
            const fillMat = new THREE.MeshBasicMaterial({
                color: color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.1 // Very faint fill
            });
            const fill = new THREE.Mesh(fillGeo, fillMat);
            fill.rotation.x = -Math.PI / 2;
            fill.position.y = 0.05; // Slightly below border
            group.add(fill);
        }

        return group;
    }

    showUpgradePreview(show) {
        if (show) {
            if (!this.upgradeRing) {
                const nextRange = this.range * 1.1;
                this.upgradeRing = this.createRangeRing(nextRange, 0xffff00, true);
                this.mesh.add(this.upgradeRing);
            }
            this.upgradeRing.visible = true;
        } else {
            if (this.upgradeRing) {
                this.upgradeRing.visible = false;
            }
        }
    }
}
