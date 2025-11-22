import * as THREE from 'three';

export class Projectile {
    constructor(scene, startPos, target, damage, speed, color) {
        this.scene = scene;
        this.target = target;
        this.damage = damage;
        this.speed = speed * 5; // Speed up for 3D scale
        
        this.position = startPos.clone();
        this.isDead = false;

        // Mesh - Voxel Style
        const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const material = new THREE.MeshBasicMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        
        // Add light to projectile
        this.light = new THREE.PointLight(color, 1, 3);
        this.mesh.add(this.light);
        
        this.scene.add(this.mesh);
    }

    update(dt) {
        if (this.isDead) return;

        if (!this.target || this.target.isDead) {
            this.destroy();
            return;
        }

        const targetPos = this.target.mesh.position.clone();
        // Aim for center
        targetPos.y = 0.5; 

        const direction = new THREE.Vector3().subVectors(targetPos, this.position);
        const distance = direction.length();

        if (distance < 0.5) {
            // Hit
            this.target.takeDamage(this.damage);
            this.destroy();
            return this.target;
        } else {
            direction.normalize();
            this.position.add(direction.multiplyScalar(this.speed * dt));
            this.mesh.position.copy(this.position);
            return null;
        }
    }

    destroy() {
        this.isDead = true;
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
