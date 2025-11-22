export class DoomFace {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'doom-face-canvas';
        this.canvas.width = 48; // Increased resolution for detail
        this.canvas.height = 48;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.imageRendering = 'pixelated';
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // Container for styling and positioning
        this.container = document.createElement('div');
        this.container.id = 'doom-face-container';
        this.container.style.position = 'absolute';
        this.container.style.top = '100px'; // Moved down below stats panel
        this.container.style.left = '20px';
        this.container.style.width = '288px'; // 6x scale
        this.container.style.height = '288px';
        this.container.style.border = 'none';
        this.container.style.backgroundColor = 'transparent';
        this.container.style.transform = 'translateX(-200%)'; // Start hidden
        this.container.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        this.container.style.boxShadow = 'none';
        this.container.style.overflow = 'hidden';
        this.container.style.zIndex = '1000';

        // CRT Effect Overlay
        const crt = document.createElement('div');
        crt.style.position = 'absolute';
        crt.style.top = '0';
        crt.style.left = '0';
        crt.style.width = '100%';
        crt.style.height = '100%';
        crt.style.background = 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))';
        crt.style.backgroundSize = '100% 2px, 3px 100%';
        crt.style.pointerEvents = 'none';
        this.container.appendChild(this.canvas);
        this.container.appendChild(crt);

        document.getElementById('ui-layer').appendChild(this.container);

        // Palette based on the Lost Soul image
        this.palette = {
            '.': null,              // Transparent
            'R': '#8a0000',         // Dark Red (Fire base)
            'r': '#d60000',         // Red (Fire mid)
            'O': '#ff6a00',         // Orange (Fire high)
            'Y': '#ffcc00',         // Yellow (Fire tip / Eyes)
            'W': '#ffffff',         // White (Hot center)
            'g': '#2a2a2a',         // Dark Grey (Skull shadow)
            'G': '#4a4a4a',         // Mid Grey (Skull base)
            'L': '#7a7a7a',         // Light Grey (Skull highlight)
            'B': '#000000',         // Black (Features)
            'H': '#554444',         // Horn Dark
            'h': '#887777',         // Horn Light
            'E': '#ff0000'          // Eye Glow
        };

        // 48x48 Sprite Map (Compressed representation)
        // Based on the Lost Soul: Horns, Flaming top, Skull face
        this.spriteMap = [
            "................................................",
            "......................O.........................",
            ".....................OYO........................",
            "....................OYWO........................",
            "...................OYWWO........................",
            "..................rOYWWO........................",
            ".................rrOYWWO........................",
            "................RrrOYWWO........................",
            "...............RRrrOYWWO........................",
            "..............RRRrrOYWWO........................",
            ".............RRRRrrOYWWO........................",
            "............RRRRRrrOYWWO........................",
            "...........RRRRRRrrOYWWO........................",
            "..........RRRRRRRrrOYWWO........................",
            ".........RRRRRRRRrrOYWWO........................",
            "........RRRRRRRRRrrOYWWO........................",
            ".......RRRRRRRRRRrrOYWWO........................",
            "......RRRRRRRRRRRrrOYWWO........................",
            ".....RRRRRRRRRRRRrrOYWWO........................",
            "....RRRRRRRRRRRRRrrOYWWO........................",
            "...RRRRRRRRRRRRRRrrOYWWO........................",
            "..RRRRRRRRRRRRRRRrrOYWWO........................",
            ".RRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................",
            "RRRRRRRRRRRRRRRRRrrOYWWO........................"
        ];
        
        // Let's procedurally generate the complex sprite instead of a massive string
        // It's easier to control the shapes
        
        this.frame = 0;
        this.timer = 0;
        this.isVisible = false;
        
        this.draw();
        this.animate();
    }

    draw() {
        this.ctx.clearRect(0, 0, 48, 48);
        
        // Helper to draw rect
        const rect = (x, y, w, h, c) => {
            this.ctx.fillStyle = c;
            this.ctx.fillRect(x, y, w, h);
        };
        
        // Helper for symmetry
        const symRect = (x, y, w, h, c) => {
            rect(24 + x, y, w, h, c);
            rect(24 - x - w, y, w, h, c);
        };

        // 1. FLAMES (Animated)
        // Base Fire
        for(let i=0; i<20; i++) {
            const flicker = Math.floor(Math.random() * 3);
            const w = 16 - i * 0.6;
            symRect(0, 2 + i, w, 1, '#8a0000'); // Dark Red BG
        }
        
        // Core Fire
        const fireH = 18 + Math.sin(Date.now()/100)*2;
        symRect(0, 0, 4, fireH, '#ffcc00'); // Yellow core
        symRect(4, 4, 4, fireH-4, '#ff6a00'); // Orange mid
        symRect(8, 8, 4, fireH-8, '#d60000'); // Red outer

        // 2. HORNS
        // Left/Right Horns
        symRect(14, 18, 8, 3, '#554444'); // Base
        symRect(18, 17, 6, 2, '#887777'); // Tip
        symRect(22, 16, 2, 1, '#aaaaaa'); // Point

        // 3. SKULL FACE
        // Main Cranium
        symRect(0, 16, 11, 14, '#4a4a4a'); // Base Grey
        symRect(0, 16, 9, 4, '#7a7a7a');  // Forehead Highlight
        
        // Eye Sockets
        symRect(4, 22, 4, 3, '#000000');
        
        // Glowing Eyes
        const eyeColor = (this.frame === 0) ? '#ff0000' : '#ffaa00';
        symRect(5, 23, 2, 1, eyeColor);
        
        // Nose
        symRect(0, 26, 2, 2, '#000000');
        
        // Cheekbones
        symRect(9, 24, 2, 4, '#2a2a2a');
        
        // Mouth / Jaw
        // Upper Jaw
        symRect(0, 30, 8, 2, '#4a4a4a');
        // Lower Jaw (Animated)
        const jawY = (this.frame === 1) ? 36 : 34;
        symRect(0, jawY, 7, 3, '#4a4a4a'); // Jaw bone
        
        // Mouth Void
        const mouthH = (this.frame === 1) ? 6 : 4;
        symRect(0, 31, 6, mouthH, '#000000');
        
        // Teeth
        symRect(2, 31, 1, 1, '#ffffff'); // Top
        symRect(4, 31, 1, 1, '#ffffff');
        symRect(2, jawY, 1, 1, '#ffffff'); // Bottom
        symRect(4, jawY, 1, 1, '#ffffff');
        
        // 4. FLAME PARTICLES (Overlay)
        for(let i=0; i<5; i++) {
            const px = Math.random() * 48;
            const py = Math.random() * 20;
            rect(px, py, 1, 1, '#ffff00');
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.isVisible) return;

        this.timer++;
        if (this.timer % 8 === 0) { // Fast flicker
            this.frame = this.frame === 0 ? 1 : 0;
            this.draw();
        }
    }

    show() {
        this.isVisible = true;
        this.container.style.transform = 'translateX(0)';
    }

    hide() {
        this.isVisible = false;
        this.container.style.transform = 'translateX(-200%)';
    }
}
