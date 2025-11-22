export const SETTINGS = {
    STARTING_MONEY: 500,
    BASE_HEALTH: 20,
    
    // Map
    MAP_SIZE: 40, // Increased size
    TILE_SIZE: 2,
    
    // Towers
    TOWERS: {
        basic: {
            cost: 100,
            range: 8,
            damage: 10,
            cooldown: 1.0,
            color: 0x0088ff,
            height: 1.5
        },
        sniper: {
            cost: 250,
            range: 16,
            damage: 50,
            cooldown: 2.0,
            color: 0x00ff00,
            height: 3.0
        },
        rapid: {
            cost: 400,
            range: 6,
            damage: 5,
            cooldown: 0.2,
            color: 0x00ffff,
            height: 1.2
        }
    },
    
    // Enemies
    ENEMIES: {
        basic: {
            hp: 30,
            damage: 1,
            speed: 3.0,
            reward: 10,
            color: 0xff3333,
            radius: 0.5
        },
        fast: {
            hp: 15,
            damage: 1,
            speed: 6.0,
            reward: 15,
            color: 0xffff00,
            radius: 0.4
        },
        tank: {
            hp: 100,
            damage: 5,
            speed: 1.5,
            reward: 30,
            color: 0xff00ff,
            radius: 0.8
        }
    },
    
    // Waves
    WAVES: [
        [ { type: 'basic', count: 5, interval: 1.0 }, { type: 'fast', count: 2, interval: 1.5 } ],
        [ { type: 'basic', count: 10, interval: 0.8 }, { type: 'fast', count: 5, interval: 1.2 }, { type: 'tank', count: 1, interval: 2.0 } ],
        [ { type: 'fast', count: 15, interval: 0.5 }, { type: 'tank', count: 3, interval: 2.0 }, { type: 'basic', count: 20, interval: 0.4 } ]
    ]
};

// Larger, winding path for 40x40 map
// Coordinates range roughly -18 to 18
export const PATH_WAYPOINTS = [
    { x: -18, z: -18 },
    { x: -10, z: -18 },
    { x: -10, z: -10 },
    { x: 0, z: -10 },
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 10, z: 10 },
    { x: -10, z: 10 },
    { x: -10, z: 18 },
    { x: 18, z: 18 }
];
