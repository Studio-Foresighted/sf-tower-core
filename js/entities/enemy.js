import * as THREE from 'three';
import { SETTINGS } from '../utils/settings.js';

export class Enemy {
    constructor(scene, type, path, hpMult = 1.0, rewardMult = 1.0) {
        this.scene = scene;
        this.type = type;
        this.path = path;
        this.waypointIndex = 0;
        
        const stats = SETTINGS.ENEMIES[type];
        this.hp = stats.hp * hpMult;
        this.maxHp = this.hp;
        this.damage = stats.damage;
        this.speed = stats.speed;
        this.reward = Math.floor(stats.reward * rewardMult);
        this.radius = stats.radius;
        
        this.isDead = false;
        this.reachedEnd = false;

        // Mesh - Voxel Style (Cubes)
        let geometry;
        if (type === 'basic') {
            geometry = new THREE.BoxGeometry(this.radius * 2, this.radius * 2, this.radius * 2);
        } else if (type === 'fast') {
            geometry = new THREE.BoxGeometry(this.radius * 1.5, this.radius * 1.5, this.radius * 1.5);
        } else if (type === 'tank') {
            geometry = new THREE.BoxGeometry(this.radius * 2.5, this.radius * 2.5, this.radius * 2.5);
        } else {
            // Boss or default
            geometry = new THREE.BoxGeometry(this.radius * 2, this.radius * 2, this.radius * 2);
        }

        const material = new THREE.MeshStandardMaterial({ 
            color: stats.color,
            roughness: 0.1, // Shiny
            metalness: 0.1
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Add details for tank (Turret block)
        if (type === 'tank') {
            const topGeo = new THREE.BoxGeometry(this.radius * 1.5, this.radius * 0.8, this.radius * 1.5);
            const topMesh = new THREE.Mesh(topGeo, material);
            topMesh.position.y = this.radius * 1.5;
            this.mesh.add(topMesh);
        }
        
        // Add "Eyes" to all enemies to give them character
        const eyeGeo = new THREE.BoxGeometry(this.radius * 0.4, this.radius * 0.4, 0.1);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White eyes
        const pupilGeo = new THREE.BoxGeometry(this.radius * 0.15, this.radius * 0.15, 0.11);
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black pupils

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-this.radius * 0.5, this.radius * 0.2, this.radius);
        this.mesh.add(leftEye);
        
        const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftPupil.position.set(-this.radius * 0.5, this.radius * 0.2, this.radius);
        this.mesh.add(leftPupil);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(this.radius * 0.5, this.radius * 0.2, this.radius);
        this.mesh.add(rightEye);

        const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightPupil.position.set(this.radius * 0.5, this.radius * 0.2, this.radius);
        this.mesh.add(rightPupil);
        const start = this.path[0];
        this.mesh.position.set(start.x, 0.5, start.z);
        
        this.scene.add(this.mesh);
        
        // Health Bar (simple sprite)
        // For simplicity in this foundation, we might skip health bar or add a simple one later
    }

    update(dt) {
        if (this.isDead || this.reachedEnd) return;

        // Move along path
        const target = this.path[this.waypointIndex + 1];
        if (!target) {
            this.reachedEnd = true;
            return;
        }

        const currentPos = this.mesh.position;
        const targetPos = new THREE.Vector3(target.x, 0.5, target.z);
        
        const direction = new THREE.Vector3().subVectors(targetPos, currentPos);
        const dist = direction.length();
        
        if (dist < 0.1) {
            this.waypointIndex++;
            if (this.waypointIndex >= this.path.length - 1) {
                this.reachedEnd = true;
            }
        } else {
            direction.normalize();
            const moveDist = this.speed * dt;
            currentPos.add(direction.multiplyScalar(moveDist));
            
            // Rotate mesh for effect
            this.mesh.rotation.x += dt * 2;
            this.mesh.rotation.y += dt * 2;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        
        // Flash white
        this.mesh.material.emissive.setHex(0xffffff);
        setTimeout(() => {
            if (!this.isDead) this.mesh.material.emissive.setHex(0x000000);
        }, 50);

        if (this.hp <= 0) {
            this.die();
            return true; // Killed
        }
        return false;
    }

    die() {
        this.isDead = true;
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        // Could add particle explosion here
    }
}
