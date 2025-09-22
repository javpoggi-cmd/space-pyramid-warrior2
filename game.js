document.addEventListener('DOMContentLoaded', () => {
    const lobby = document.getElementById('lobby');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startScreen = document.getElementById('startScreen');
    const initButton = document.getElementById('initButton');

    const gameContainer = document.createElement('div');
    gameContainer.style.position = 'relative';
    document.body.appendChild(gameContainer);
    gameContainer.appendChild(canvas);

    // --- Variables de Escala ---
    const BASE_WIDTH = 1920; 
    let scaleFactor = 1;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        scaleFactor = canvas.width / BASE_WIDTH;
        scaleFactor = Math.min(scaleFactor, 1.0); 
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); 

    // =========================================================================
    // --- 1. CONFIGURACIONES CENTRALIZADAS ---
    // =========================================================================
    const GAME_CONFIG = {
        player: {
            speed: 7,
            width: 100,
            height: 100,
            invulnerabilityDuration: 2000,
        },
        powerups: {
            smartBombCooldown: 30000,
            laserDuration: 15000,
            laserShootCooldown: 1000,
            slowShotDuration: 15000,
        },
        drones: {
            orbitRadius: 100,
            rotationSpeed: 0.04,
            shootCooldown: 2000,
            bulletSpeed: 15, // CAMBIO 1: Velocidad de bala de dron aumentada
        },
        missiles: {
            maxCharges: 3,
            chargeTime: 6000
        },
        difficulty: {
            increaseInterval: 120000, 
            speedMultiplierIncrease: 0.15
        },
        gameplay: {
            chargeCycleDuration: 60000, 
            superBossChargeCycleDuration: 90000,
            intermissionDuration: 8000 // CAMBIO 12: Duración del intermedio
        }
    };
    
    // CAMBIO 12: Nombres de los Jefes
    const BOSS_NAMES = {
        'REGULAR': "Líder de Flota Menor",
        'SUPER_BOSS_1': "Acorazado 'Aguijón'",
        'SUPER_BOSS_2': "Nave de Asedio 'Colmena'",
        'SUPER_BOSS_3': "Interceptor 'Espiral'",
        'SUPER_BOSS_4': "Nave Nodriza 'Invocadora'",
        'GIGA_BOSS': "El Aniquilador 'Giga-Insectoide'",
        'FINAL_ENEMY': "El Ojo del Enjambre"
    };

    const DIFFICULTY_SETTINGS = [
        { 
            name: 'Cero', 
            enemies: 1, 
            initialLives: 5, maxLives: 7, 
            initialHealth: 5, maxHealth: 7, 
            shootCooldown: 200, 
            enemySpeedMultiplier: 1.0, 
            powerUpChance: 0.90, // CAMBIO 2: Suerte por Dificultad
            scoreMultiplier: 1,
            maxDrones: 4 // CAMBIO 3: Drones por Dificultad
        },
        { 
            name: 'Baja', 
            enemies: 3, 
            initialLives: 4, maxLives: 6, 
            initialHealth: 4, maxHealth: 6, 
            shootCooldown: 250, 
            enemySpeedMultiplier: 1.10,
            powerUpChance: 0.80, // CAMBIO 2: Suerte por Dificultad
            scoreMultiplier: 2,
            maxDrones: 4 // CAMBIO 3: Drones por Dificultad
        },
        { 
            name: 'Normal', 
            enemies: 6, 
            initialLives: 3, maxLives: 5, 
            initialHealth: 3, maxHealth: 5, 
            shootCooldown: 300, 
            enemySpeedMultiplier: 1.15,
            powerUpChance: 0.70, // CAMBIO 2: Suerte por Dificultad
            scoreMultiplier: 3,
            maxDrones: 3 // CAMBIO 3: Drones por Dificultad
        },
        { 
            name: 'Difícil', 
            enemies: 9, 
            initialLives: 2, maxLives: 4, 
            initialHealth: 2, maxHealth: 4, 
            shootCooldown: 350, 
            enemySpeedMultiplier: 1.20,
            powerUpChance: 0.60, // CAMBIO 2: Suerte por Dificultad
            scoreMultiplier: 4,
            maxDrones: 3 // CAMBIO 3: Drones por Dificultad
        },
        { 
            name: 'Severa', 
            enemies: 12, 
            initialLives: 2, maxLives: 3, 
            initialHealth: 1, maxHealth: 2, 
            shootCooldown: 400, 
            enemySpeedMultiplier: 1.25,
            powerUpChance: 0.50, // CAMBIO 2: Suerte por Dificultad
            scoreMultiplier: 5,
            maxDrones: 2 // CAMBIO 3: Drones por Dificultad
        },
        { 
            name: 'Máxima', 
            enemies: 15, 
            initialLives: 1, maxLives: 2, 
            initialHealth: 0, maxHealth: 1, 
            shootCooldown: 500, 
            enemySpeedMultiplier: 1.30,
            powerUpChance: 0.30, // CAMBIO 2: Suerte por Dificultad
            scoreMultiplier: 6,
            maxDrones: 1 // CAMBIO 3: Drones por Dificultad
        }
    ];

    // --- Variables del juego ---
    let appState = 'START_SCREEN';
    let gameState = 'NORMAL_WAVE';
    let gameRunning = false;
    let isPaused = false;
    let allowSpawning = true;
    let score = 0;
    let keys = {};
    let animationFrameId;
    let player;
    let bullets = [], enemyBullets = [], asteroids = [], enemies = [], explosions = [], smallExplosions = [], stars = [], powerUps = [], bosses = [], missiles = [], drones = [], laserBeams = [], asteroidShots = [];
    let enemyDestroyedCount = 0;
    let bossesDestroyed = 0;
    let asteroidInterval, bossTimer, meteorShowerTimer, aggressiveAsteroidSpawner, waveTimer;
    let difficultyTimer;
    const bossProgression = [1, 3, 4, 5, 6, 7, 2];
    const superBossProgression = ['SUPER_BOSS_1', 'SUPER_BOSS_2', 'SUPER_BOSS_3', 'SUPER_BOSS_4', 'GIGA_BOSS', 'FINAL_ENEMY'];
    let currentBossIndex = 0;
    let isPostSuperBoss4 = false; // CAMBIO 8: Flag para variedad de asteroides
    let intermissionData = null; // CAMBIO 12: Datos para pantalla de intermedio
    let currentComboTier = 0; // Para saber qué icono mostrar en el HUD
    let floatingIndicators = []; // Array para los indicadores flotantes
    let screenShakeDuration = 0;
    let screenShakeMagnitude = 0;
    let backgroundColor = 'rgb(0, 0, 0)';
    let targetBackgroundColor = 'rgb(135, 206, 235)';
    
// --- Variables de Sonido, Assets y Cheats ---
    const assets = {};
    const audioAssets = {};
    let isMusicOn = true;
    let isSfxOn = true;
    let musicVolume = 0.5;
    let sfxVolume = 1.0;
    let cheatModeActive = false;
    let applyAllPowerupsCheat = false;
    let scoreAndStatsDisabled = false;

    // --- Variables de estado del jugador ---
    let playerLives, playerHealth;
    let isInvulnerable = false;
    let playerLastShotTime = 0;
    let burstFireLevel = 0;
    let wingCannonsActive = false;
    let heavyCannonLevel = 0;
    let heavyCannonTimeout;
    let laserActive = false;
    let laserTimeout;
    let missileSystemActive = false;
    let missileCharges = 0;
    let missileChargeInterval;
    let slowShotStacks = 0;
    let slowShotTimeout;
    
    // --- Dificultad y Puntuación ---
    let difficultyLevel = 2; // Normal por defecto
    let enemySpeedMultiplier;
    let powerUpSpawnChance;
    let smartBombOnCooldown = false;
    let enemiesSinceDamage = 0;
    
    // --- Rutas de Assets ---
    const assetPaths = { 
        player: 'img/player.png', drone: 'img/drone.png', droneBullet: 'img/drone_bullet.png', bullet: 'img/bullet.png', heavyBullet: 'img/heavy_bullet.png', missile: 'img/missile.png', enemyBullet: 'img/enemy_bullet.png', explosion1: 'img/explosion1.png', explosion2: 'img/explosion2.png', explosion3: 'img/explosion3.png', 
        shieldEffect1: 'img/shield_effect_1.png', shieldEffect2: 'img/shield_effect_2.png', shieldEffect3: 'img/shield_effect_3.png', 
        enemy1: 'img/enemy1.png', enemy2: 'img/enemy2.png', enemy3: 'img/enemy3.png', enemy4: 'img/enemy4.png', enemy5: 'img/enemy5.png', enemy6: 'img/enemy6.png', enemy7: 'img/enemy7.png', 
        enemy8: 'img/enemy8.png', enemy9: 'img/enemy9.png', enemy10: 'img/enemy10.png',
        superBoss1: 'img/super_boss_1.png', superBoss2: 'img/super_boss_2.png', superBoss3: 'img/super_boss_3.png', superBoss4: 'img/super_boss_4.png', gigaBoss: 'img/giga_boss.png', finalEnemy: 'img/final_enemy.png', 
        // CAMBIO 8: Nuevos assets de asteroides (requiere que crees estas imágenes)
        asteroid1_a: 'img/asteroid1_a.png', asteroid1_b: 'img/asteroid1_b.png', asteroid1_c: 'img/asteroid1_c.png',
        asteroid1_d: 'img/asteroid1_d.png', asteroid1_e: 'img/asteroid1_e.png', asteroid1_f: 'img/asteroid1_f.png',
        asteroid2_a: 'img/asteroid2_a.png', asteroid2_b: 'img/asteroid2_b.png', asteroid2_c: 'img/asteroid2_c.png',
        asteroid2_d: 'img/asteroid2_d.png', asteroid2_e: 'img/asteroid2_e.png', asteroid2_f: 'img/asteroid2_f.png',
        asteroid3_a: 'img/asteroid3_a.png', asteroid3_b: 'img/asteroid3_b.png', asteroid3_c: 'img/asteroid3_c.png',
        asteroid3_d: 'img/asteroid3_d.png', asteroid3_e: 'img/asteroid3_e.png', asteroid3_f: 'img/asteroid3_f.png',
        asteroid4_a: 'img/asteroid4_a.png', asteroid4_b: 'img/asteroid4_b.png', asteroid4_c: 'img/asteroid4_c.png',
        asteroid4_d: 'img/asteroid4_d.png', asteroid4_e: 'img/asteroid4_e.png', asteroid4_f: 'img/asteroid4_f.png',
        asteroidShot_a: 'img/asteroid_shot_a.png', asteroidShot_b: 'img/asteroid_shot_b.png', asteroidShot_c: 'img/asteroid_shot_c.png',
        asteroidShot_d: 'img/asteroid_shot_d.png', asteroidShot_e: 'img/asteroid_shot_e.png', asteroidShot_f: 'img/asteroid_shot_f.png',
        powerupHealth: 'img/powerup_health.png', powerupRapidFire: 'img/powerup_rapidfire.png', powerupExtraLife: 'img/powerup_extralife.png', powerupWings: 'img/powerup_wings.png', powerupHeavy: 'img/powerup_heavy.png', powerupMissile: 'img/powerup_missile.png', powerupBomb: 'img/powerup_bomb.png', powerupDrone: 'img/powerup_drone.png', 
        powerupLaser: 'img/powerup_laser.png', 
        powerdownSlow: 'img/powerdown_slow.png',
        missileIcon: 'img/missile_icon.png', homingBullet: 'img/homing_bullet.png', 
        lifeIcon: 'img/life_icon.png', healthIcon: 'img/health_icon.png',
        introScreen: 'img/intro_screen.png', ending1: 'img/ending_1.png', ending2: 'img/ending_2.png', ending3: 'img/ending_3.png', ending4: 'img/ending_4.png', ending5: 'img/ending_5.png',
        laser: 'img/laser.png',
        combo_1_5x: 'img/combo_1_5x.png',
    combo_2x: 'img/combo_2x.png',
    combo_3x: 'img/combo_3x.png',
    combo_4x: 'img/combo_4x.png',
    combo_5x: 'img/combo_5x.png',
    combo_hud_1_5x: 'img/combo_hud_1_5x.png',
    combo_hud_2x: 'img/combo_hud_2x.png',
    combo_hud_3x: 'img/combo_hud_3x.png',
    combo_hud_4x: 'img/combo_hud_4x.png',
    combo_hud_5x: 'img/combo_hud_5x.png'
    };
    const audioPaths = { backgroundMusic: 'audio/background_music.mp3', bossMusic: 'audio/boss_music.mp3', introMusic: 'audio/intro_music.mp3', endingMusic: 'audio/ending_music.mp3', playerShoot: 'audio/player_shoot.wav', heavyShoot: 'audio/heavy_shoot.wav', missileLaunch: 'audio/missile_launch.wav', missileExplosion: 'audio/missile_explosion.wav', enemyShoot: 'audio/enemy_shoot.wav', explosionSmall: 'audio/explosion_small.wav', explosionLarge: 'audio/explosion_large.wav', bossExplosion: 'audio/boss_explosion.wav', powerupShield: 'audio/powerup_shield.wav', powerupBurst: 'audio/powerup_burst.wav', powerupExtraLife: 'audio/powerup_extralife.wav', powerupWings: 'audio/powerup_wings.wav', powerupHeavy: 'audio/powerup_heavy.wav', powerupMissile: 'audio/powerup_missile.wav', powerupBombPickup: 'audio/powerup_bomb_pickup.wav', powerupDrone: 'audio/powerup_drone.wav', bombExplode: 'audio/bomb_explode.wav', hit: 'audio/hit.wav', powerdown: 'audio/powerdown.wav', playerDamaged: 'audio/player_damaged.wav', laserShoot: 'audio/laser_shoot.wav',
    intermission: 'audio/intermission.wav',
    combo_tier1: 'audio/combo_tier1.wav',
    combo_tier2: 'audio/combo_tier2.wav',
    combo_tier3: 'audio/combo_tier3.wav',
    combo_tier4: 'audio/combo_tier4.wav',
    combo_tier5: 'audio/combo_tier5.wav'
 };

    function preloadAssets() {
        console.log("Iniciando precarga de imágenes...");
        const promises = Object.keys(assetPaths).map(key => {
            return new Promise((resolve) => {
                const img = new Image();
                const path = assetPaths[key];
                img.src = path;
                img.onload = () => { assets[key] = img; resolve(); };
                img.onerror = () => {
                    console.warn(`¡ERROR! No se pudo cargar la imagen: ${path}. Usando un placeholder.`);
                    const placeholder = document.createElement('canvas');
                    placeholder.width = 64; placeholder.height = 64;
                    const pCtx = placeholder.getContext('2d');
                    pCtx.fillStyle = 'magenta'; pCtx.fillRect(0, 0, 64, 64);
                    const placeholderImg = new Image();
                    placeholderImg.src = placeholder.toDataURL();
                    assets[key] = placeholderImg;
                    resolve();
                };
            });
        });
        return Promise.all(promises);
    }
    function lerpColor(color1, color2, factor) {
    let result = color1.slice();
    for (let i = 0; i < 3; i++) {
        result[i] = Math.round(result[i] + factor * (color2[i] - result[i]));
    }
    return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
}
    function updateBackgroundColor() {
    const colors = {
        skyBlue: [135, 206, 235],
        darkBlue: [0, 0, 50],
        black: [0, 0, 0],
        darkPurple: [48, 25, 52],
        lightPurple: [90, 60, 100],
        reddish: [139, 0, 0],
        darkRed: [100, 0, 0],
        blueBlack: [0, 0, 20]
    };

    let targetRgb = colors.skyBlue; // Por defecto

    if (bossesDestroyed >= bossProgression.length + 5) targetRgb = colors.blueBlack; // Después de Giga
    else if (bossesDestroyed >= bossProgression.length + 4) targetRgb = colors.darkRed;  // Después de Súper-Jefe 4
    else if (bossesDestroyed >= bossProgression.length + 3) targetRgb = colors.reddish; // Al llegar a Súper-Jefe 4
    else if (bossesDestroyed >= bossProgression.length + 1) targetRgb = colors.lightPurple; // Hasta Súper-Jefe 2
    else if (bossesDestroyed >= bossProgression.length) targetRgb = colors.darkPurple; // Hasta Súper-Jefe 1
    else if (bossesDestroyed >= 4) targetRgb = colors.black;
    else if (bossesDestroyed >= 2) targetRgb = colors.darkBlue;
    
    const currentColorRgb = backgroundColor.match(/\d+/g).map(Number);
    backgroundColor = lerpColor(currentColorRgb, targetRgb, 0.001); // 0.001 es la velocidad de transición
} 
    function preloadAudio() { console.log("Creando objetos de audio..."); for (const key in audioPaths) { const audio = new Audio(); audio.src = audioPaths[key]; audioAssets[key] = audio; } console.log("Objetos de audio creados."); }
    function playMusic(track) { if (audioAssets.backgroundMusic) audioAssets.backgroundMusic.pause(); if (audioAssets.bossMusic) audioAssets.bossMusic.pause(); if(audioAssets.introMusic) audioAssets.introMusic.pause(); if(audioAssets.endingMusic) audioAssets.endingMusic.pause(); if (isMusicOn && track) { track.currentTime = 0; track.loop = true; track.volume = musicVolume; track.play().catch(e => {}); } }
    function playSound(sound, volume = 1.0) { if (isSfxOn && sound) { const soundInstance = sound.cloneNode(); soundInstance.volume = sfxVolume * volume; soundInstance.play().catch(e => {}); } }
    
    // --- Clases del Juego ---
    class Player { constructor() { this.image = assets.player; this.width = GAME_CONFIG.player.width * scaleFactor; this.height = GAME_CONFIG.player.height * scaleFactor; this.x = canvas.width / 2 - this.width / 2; this.y = canvas.height + this.height; this.speed = GAME_CONFIG.player.speed * scaleFactor; this.isPositioned = false; } draw() { if (this.image) { if (isInvulnerable) { ctx.globalAlpha = (Math.floor(Date.now() / 100) % 2 === 0) ? 0.5 : 1; } ctx.drawImage(this.image, this.x, this.y, this.width, this.height); ctx.globalAlpha = 1; } } update() { if (!this.isPositioned) { const targetY = canvas.height - 150 * scaleFactor; if (this.y > targetY) { this.y -= 2 * scaleFactor; } else { this.y = targetY; this.isPositioned = true; } return; } let moveX = 0; let moveY = 0; if (keys['arrowleft'] || keys['a']) moveX -= 1; if (keys['arrowright'] || keys['d']) moveX += 1; if (keys['arrowup'] || keys['w']) moveY -= 1; if (keys['arrowdown'] || keys['s']) moveY += 1; const gamepad = navigator.getGamepads()[0]; if (gamepad) { const stickX = gamepad.axes[0]; const stickY = gamepad.axes[1]; const deadzone = 0.2; if (Math.abs(stickX) > deadzone) moveX = stickX; if (Math.abs(stickY) > deadzone) moveY = stickY; if (gamepad.buttons[14] && gamepad.buttons[14].pressed) moveX = -1; if (gamepad.buttons[15] && gamepad.buttons[15].pressed) moveX = 1; if (gamepad.buttons[12] && gamepad.buttons[12].pressed) moveY = -1; if (gamepad.buttons[13] && gamepad.buttons[13].pressed) moveY = 1; if (gamepad.buttons[0].pressed) { this.shoot(); } if (gamepad.buttons[7] && gamepad.buttons[7].wasPressed) { launchMissile(); } } if (touchMoveX) moveX = touchMoveX; if (touchMoveY) moveY = touchMoveY; if (moveX !== 0) this.x += this.speed * moveX; if (moveY !== 0) this.y += this.speed * moveY; if (this.x < 0) this.x = 0; if (this.x > canvas.width - this.width) this.x = canvas.width - this.width; if (this.y < 0) this.y = 0; if (this.y > canvas.height - this.height) this.y = canvas.height - this.height; } shoot() { 
        const now = Date.now();
        let baseCooldown = DIFFICULTY_SETTINGS[difficultyLevel].shootCooldown;
        if (slowShotStacks > 0) { baseCooldown *= (1 + (0.5 * slowShotStacks)); }
        if (laserActive) { if (now - playerLastShotTime < GAME_CONFIG.powerups.laserShootCooldown) return; playSound(audioAssets.laserShoot, 0.8); laserBeams.push(new LaserBeam(this.x + this.width / 2, this.y));
        } else if (heavyCannonLevel > 0) { if (now - playerLastShotTime < baseCooldown * 1.5) return; playSound(audioAssets.heavyShoot, 0.8); const shots = heavyCannonLevel; for (let i = 0; i < shots; i++) { setTimeout(() => { if (gameRunning) bullets.push(new HeavyBullet(this.x + this.width / 2 - (15 * scaleFactor), this.y)); }, i * 120); }
        } else { if (now - playerLastShotTime < baseCooldown) return; playSound(audioAssets.playerShoot, 0.7); let shotsPerBurst = 1 + burstFireLevel; const fire = (xOffset) => { for (let i = 0; i < shotsPerBurst; i++) { setTimeout(() => { if (gameRunning) bullets.push(new Bullet(this.x + xOffset, this.y)); }, i * 100); } }; if (wingCannonsActive) { fire(this.width * 0.2); fire(this.width * 0.8 - (10 * scaleFactor)); } else { fire(this.width / 2 - (5 * scaleFactor)); }
        } playerLastShotTime = now;
    }}
    class Bullet { constructor(x, y) { this.image = assets.bullet; this.x = x; this.y = y; this.width = 10 * scaleFactor; this.height = 30 * scaleFactor; this.speed = 12 * scaleFactor; this.damage = 1; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.y -= this.speed; } }
    class LaserBeam { constructor(x, y) { this.image = assets.laser; this.x = x - (20 * scaleFactor / 2); this.y = y - canvas.height; this.width = 20 * scaleFactor; this.height = canvas.height; this.damage = 15; this.life = 60; this.collidedEnemies = new Set(); } draw() { if (this.image) { ctx.globalAlpha = this.life / 60; ctx.drawImage(this.image, this.x, this.y, this.width, this.height); ctx.globalAlpha = 1; } } update() { this.life--; } }
    class AsteroidShot {
        constructor(x, y, angle) {
            // CAMBIO 8: Lógica de Variedad de Sprites
            const variantSet = isPostSuperBoss4 ? ['d', 'e', 'f'] : ['a', 'b', 'c'];
            const variant = variantSet[Math.floor(Math.random() * 3)];
            this.image = assets[`asteroidShot_${variant}`] || assets.asteroidShot_a; // Fallback
            this.x = x; this.y = y; this.width = 40 * scaleFactor; this.height = 40 * scaleFactor; this.damage = 10;
            const speed = 6 * scaleFactor; this.speedX = Math.cos(angle) * speed; this.speedY = Math.sin(angle) * speed;
        }
        draw() { if (this.image) { ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } }
        update() { this.x += this.speedX; this.y += this.speedY; }
    }
    class DroneBullet { constructor(x, y, angle) { this.image = assets.droneBullet; this.x = x; this.y = y; this.width = 20 * scaleFactor; this.height = 20 * scaleFactor; this.damage = 0.6; const speed = GAME_CONFIG.drones.bulletSpeed * scaleFactor; this.speedX = Math.cos(angle) * speed; this.speedY = Math.sin(angle) * speed; } draw() { if (this.image) { ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } } update() { this.x += this.speedX; this.y += this.speedY; } }
    class Drone { constructor(player, angleOffset) { this.player = player; this.image = assets.drone; this.width = 50 * scaleFactor; this.height = 50 * scaleFactor; this.angle = angleOffset; this.lastShotTime = 0; this.target = null; } update() { const orbitRadius = GAME_CONFIG.drones.orbitRadius * scaleFactor; this.angle += GAME_CONFIG.drones.rotationSpeed; this.x = this.player.x + this.player.width / 2 + Math.cos(this.angle) * orbitRadius - this.width / 2; this.y = this.player.y + this.player.height / 2 + Math.sin(this.angle) * orbitRadius - this.height / 2; if (this.target && this.target.health <= 0) { this.target = null; } if (!this.target) { this.target = findNearestTarget(this.x, this.y, ['enemies', 'bosses']); } const now = Date.now(); if (this.target && now - this.lastShotTime > GAME_CONFIG.drones.shootCooldown) { const angleToTarget = Math.atan2( (this.target.y + this.target.height / 2) - (this.y + this.height / 2), (this.target.x + this.target.width / 2) - (this.x + this.width / 2) ); bullets.push(new DroneBullet(this.x + this.width / 2, this.y + this.height / 2, angleToTarget)); this.lastShotTime = now; } } draw() { if (this.image) { ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } } }
    class HeavyBullet { constructor(x, y) { this.image = assets.heavyBullet; this.x = x; this.y = y; this.width = 30 * scaleFactor; this.height = 50 * scaleFactor; this.speed = 8 * scaleFactor; this.damage = 15; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.y -= this.speed; } }
    class Missile { constructor(x, y, target) { this.image = assets.missile; this.x = x; this.y = y; this.target = target; this.width = 40 * scaleFactor; this.height = 40 * scaleFactor; this.speed = 4 * scaleFactor; this.damage = 15; } draw() { if (this.image) { ctx.save(); ctx.translate(this.x + this.width / 2, this.y + this.height / 2); const angle = this.target ? Math.atan2(this.target.y - this.y, this.target.x - this.x) + Math.PI / 2 : 0; ctx.rotate(angle); ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height); ctx.restore(); } } update() { if (this.target && this.target.health > 0) { const angle = Math.atan2(this.target.y + this.target.height / 2 - this.y, this.target.x + this.target.width / 2 - this.x); this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; } else { this.y -= this.speed; } } }
    class EnemyBullet { constructor(x, y, speedX = 0, speedY = 7) { this.image = assets.enemyBullet; this.x = x; this.y = y; this.width = 32 * scaleFactor; this.height = 32 * scaleFactor; this.speedX = speedX * scaleFactor; this.speedY = speedY * scaleFactor; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.x += this.speedX; this.y += this.speedY; } }
    class HomingEnemyBullet { constructor(x, y, target) { this.image = assets.homingBullet; this.x = x; this.y = y; this.target = target; this.width = 40 * scaleFactor; this.height = 40 * scaleFactor; this.speed = 3 * scaleFactor; } draw() { if (this.image) { ctx.drawImage(this.image, this.x, this.y, this.width, this.height); ctx.filter = 'none'; } } update() { if (this.target && player) { const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x); this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; } else { this.y += this.speed; } } }
    class MineBullet { constructor(x, y) { this.x = x; this.y = y; this.width = 25 * scaleFactor; this.height = 25 * scaleFactor; this.speedY = 1.5 * scaleFactor; this.life = 200; } draw() { ctx.fillStyle = `hsl(${this.life * 2}, 100%, 50%)`; ctx.fillRect(this.x, this.y, this.width, this.height); } update() { this.y += this.speedY; this.life--; if (this.life <= 0) { this.explode(); } } explode() { playSound(audioAssets.explosionSmall, 0.7); for (let i = 0; i < 8; i++) { const angle = (i / 8) * (Math.PI * 2); enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * 4, Math.sin(angle) * 4)); } } }
    class Explosion { constructor(x, y, size) { const type = Math.ceil(Math.random() * 3); this.image = assets[`explosion${type}`]; this.x = x - size / 2; this.y = y - size / 2; this.width = size; this.height = size; this.life = 20; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.life--; } }
    class SmallExplosion extends Explosion { constructor(x, y) { super(x, y, 30 * scaleFactor); this.life = 10; } }
    class PowerUp { constructor(x, y, type) { this.x = x; this.y = y; this.type = type; this.width = 50 * scaleFactor; this.height = 50 * scaleFactor; this.speed = 2.5 * scaleFactor; let imgKey = 'powerupHealth'; if (type === 'rapidFire') imgKey = 'powerupRapidFire'; if (type === 'extraLife') imgKey = 'powerupExtraLife'; if (type === 'wingCannons') imgKey = 'powerupWings'; if (type === 'heavyCannon') imgKey = 'powerupHeavy'; if (type === 'missileSystem') imgKey = 'powerupMissile'; if (type === 'smartBomb') imgKey = 'powerupBomb'; if (type === 'drone') imgKey = 'powerupDrone'; if (type === 'laser') imgKey = 'powerupLaser'; if (type === 'slowShot') imgKey = 'powerdownSlow'; this.image = assets[imgKey]; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.y += this.speed; } }
    class Asteroid {
        constructor(type) {
            this.type = type;
            // CAMBIO 8: Lógica de Variedad de Sprites
            const variantSet = isPostSuperBoss4 ? ['d', 'e', 'f'] : ['a', 'b', 'c'];
            const variant = variantSet[Math.floor(Math.random() * 3)];
            this.image = assets[`asteroid${type}_${variant}`] || assets[`asteroid${type}_a`]; // Fallback

            if (this.type === 1) { this.width = 150 * scaleFactor; this.height = 150 * scaleFactor; this.health = 3; } 
            else if (this.type === 2) { this.width = 280 * scaleFactor; this.height = 280 * scaleFactor; this.health = 12; } // CAMBIO 7: Vida aumentada
            else if (this.type === 3) { this.width = 80 * scaleFactor; this.height = 80 * scaleFactor; this.health = 2; } 
            else if (this.type === 4) { this.width = 400 * scaleFactor; this.height = 400 * scaleFactor; this.health = 30; }
            this.maxHealth = this.health;
            this.x = Math.random() * canvas.width; this.y = 0 - this.height; this.speedX = (Math.random() - 0.5) * 1 * scaleFactor; this.speedY = (Math.random() * 1.5 + 0.5) * scaleFactor; this.angle = 0; this.rotationSpeed = (Math.random() - 0.5) * 0.005;
        }
        draw() { if(this.image) { ctx.save(); ctx.translate(this.x + this.width / 2, this.y + this.height / 2); ctx.rotate(this.angle); ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height); ctx.restore(); } }
        update() { this.x += this.speedX; this.y += this.speedY; this.angle += this.rotationSpeed; }
    }
    
     class FloatingIndicator {
    constructor(x, y, image) {
        this.x = x;
        this.y = y;
        this.image = image;
        this.width = 80 * scaleFactor;  
        this.height = 80 * scaleFactor;
        this.initialY = y;
        this.life = 120; // 2 segundos
        this.alpha = 1;
    }

    update() {
        this.life--;
        this.y -= 1 * scaleFactor; // Velocidad de subida
        if (this.life < 60) { // Empezar a desvanecer en el último segundo
            this.alpha = this.life / 60;
        }
    }

    draw() {
        ctx.globalAlpha = this.alpha;
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        ctx.globalAlpha = 1;
    }
}

     class Star { constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.size = (Math.random() * 2 + 1) * scaleFactor; this.speed = this.size / 2; } draw() { ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2); ctx.fill(); } update(playerSpeedX, playerSpeedY) { this.y += this.speed * 2.5; this.x -= playerSpeedX * this.speed * 0.1; this.y -= playerSpeedY * this.speed * 0.1; if (this.y > canvas.height) { this.y = 0; this.x = Math.random() * canvas.width; } if (this.y < 0) { this.y = canvas.height; this.x = Math.random() * canvas.width; } if (this.x > canvas.width) { this.x = 0; this.y = Math.random() * canvas.height; } if (this.x < 0) { this.x = canvas.width; this.y = Math.random() * canvas.height; } } }
    class Enemy { constructor(type) { this.type = type; this.image = assets[`enemy${type}`]; this.retreating = false; let baseWidth, baseHeight, baseSpeed, baseHealth; switch(type) { case 1: baseWidth = 100; baseHeight = 100; baseSpeed = 2.5; baseHealth = 2; this.shootInterval = 2200; this.movementPattern = 'chaseRetreat'; this.behaviorState = 'advancing'; this.behaviorTimer = Date.now(); break; case 2: baseWidth = 80; baseHeight = 80; baseSpeed = 4; baseHealth = 1; this.shootInterval = 1500; break; case 3: baseWidth = 140; baseHeight = 140; baseSpeed = 1; baseHealth = 5; this.shootInterval = 3000; break; case 4: baseWidth = 90; baseHeight = 90; baseSpeed = 3; baseHealth = 2; this.movementPattern = 'zigzag'; this.zigzagDir = 1; this.shootInterval = 2000; break; case 5: baseWidth = 110; baseHeight = 110; baseSpeed = 1.5; baseHealth = 3; this.movementPattern = 'homing'; this.shootInterval = 1800; break; case 6: baseWidth = 100; baseHeight = 100; baseSpeed = 2.5; baseHealth = 3; this.movementPattern = 'sineWave'; this.angle = 0; this.initialX = Math.random() * (canvas.width - (baseWidth * scaleFactor)); this.shootInterval = 2200; break; case 7: baseWidth = 180; baseHeight = 180; baseSpeed = 0.8; baseHealth = 10; this.shootInterval = 3500; break; case 8: baseWidth = 60; baseHeight = 60; baseSpeed = 2.8; baseHealth = 1; this.movementPattern = 'diveBomb'; this.behaviorState = 'patrolling'; this.speedY = baseSpeed * 0.5; this.speedX = (Math.random() < 0.5 ? 1 : -1) * baseSpeed * 0.7; break; case 9: baseWidth = 70; baseHeight = 70; baseSpeed = 2.0; baseHealth = 2; this.movementPattern = 'squadron'; this.shootInterval = 2500; this.squadAngle = 0; break; case 10: baseWidth = 90; baseHeight = 90; baseSpeed = 3.5; baseHealth = 3; this.movementPattern = 'zigzagWide'; this.zigzagDir = (Math.random() < 0.5 ? 1 : -1); this.shootInterval = 1800; break; default: baseWidth = 100; baseHeight = 100; baseSpeed = 2; baseHealth = 1; this.shootInterval = 2500; } this.width = baseWidth * scaleFactor; this.height = baseHeight * scaleFactor; this.speed = baseSpeed * scaleFactor; this.health = baseHealth; this.maxHealth = baseHealth; this.x = this.initialX || Math.random() * (canvas.width - this.width); this.y = 0 - this.height; this.lastShotTime = Date.now(); } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update(player) { if (this.retreating) { this.y += this.speed * 3; return; } const currentSpeed = this.speed * enemySpeedMultiplier; if (this.movementPattern === 'diveBomb') { if (this.behaviorState === 'patrolling') { this.x += this.speedX * enemySpeedMultiplier; this.y += this.speedY * enemySpeedMultiplier; if (this.x <= 0 || this.x >= canvas.width - this.width) { this.speedX *= -1; } if (Math.abs(this.x + this.width / 2 - (player.x + player.width / 2)) < 50) { this.behaviorState = 'diving'; this.speedY = (GAME_CONFIG.player.speed * scaleFactor) * 1.5; this.speedX = 0; } } else { this.y += this.speedY * enemySpeedMultiplier; } } else if (this.movementPattern === 'squadron') { this.squadAngle += 0.05; this.x += Math.sin(this.squadAngle) * 2 * scaleFactor; this.y += currentSpeed * 0.6; } else if (this.movementPattern === 'zigzagWide') { this.x += currentSpeed * this.zigzagDir; if (this.x <= 0 || this.x >= canvas.width - this.width) { this.zigzagDir *= -1; } this.y += currentSpeed * 0.4; } else if (this.movementPattern === 'chaseRetreat') { if (Date.now() - this.behaviorTimer > 2000) { this.behaviorState = this.behaviorState === 'advancing' ? 'retreating' : 'advancing'; this.behaviorTimer = Date.now(); } let angle; if (this.behaviorState === 'advancing') { angle = Math.atan2(player.y - this.y, player.x - this.x); } else { angle = Math.atan2(player.y - this.y, player.x - this.x) + Math.PI; } this.x += Math.cos(angle) * currentSpeed; this.y += Math.sin(angle) * currentSpeed; if (this.y < 0) this.y = 0; } else if (this.movementPattern === 'zigzag') { this.x += currentSpeed * this.zigzagDir; if (this.x <= 0 || this.x >= canvas.width - this.width) this.zigzagDir *= -1; this.y += currentSpeed / 2; } else if (this.movementPattern === 'homing') { const angle = Math.atan2(player.y - this.y, player.x - this.x); this.x += Math.cos(angle) * currentSpeed; this.y += Math.sin(angle) * currentSpeed; } else if (this.movementPattern === 'sineWave') { this.angle += 0.05; this.x = this.initialX + Math.sin(this.angle) * (100 * scaleFactor); this.y += currentSpeed / 2; } else { if (this.x < player.x) this.x += currentSpeed / 2; if (this.x > player.x) this.x -= currentSpeed / 2; if (this.type === 7) { this.y += currentSpeed * 1.5; } else { this.y += currentSpeed / 2; } } if (this.x > canvas.width) { this.x = 0 - this.width; } else if (this.x + this.width < 0) { this.x = canvas.width; } if (this.y > canvas.height) { this.y = 0 - this.height; this.x = player.x + (Math.random() * 200 - 100); if (this.x < 0) this.x = 0; if (this.x > canvas.width - this.width) this.x = canvas.width - this.width; } if (Date.now() - this.lastShotTime > this.shootInterval && this.type !== 8) { this.shoot(); } } shoot() {
    if (!gameRunning) return; playSound(audioAssets.enemyShoot, 0.4); this.lastShotTime = Date.now(); const bulletX = this.x + this.width / 2 - (16 * scaleFactor); const bulletY = this.y + this.height;
    switch (this.type) { case 1: setTimeout(() => { if (gameRunning) enemyBullets.push(new EnemyBullet(this.x + this.width / 2 - (16 * scaleFactor), this.y + this.height)); }, 0); setTimeout(() => { if (gameRunning) enemyBullets.push(new EnemyBullet(this.x + this.width / 2 - (16 * scaleFactor), this.y + this.height)); }, 150); break; case 3: enemyBullets.push(new EnemyBullet(this.x + this.width * 0.2, bulletY)); enemyBullets.push(new EnemyBullet(this.x + this.width * 0.8, bulletY)); break; case 4: const speedX = 2 * this.zigzagDir; const speedY = 5; enemyBullets.push(new EnemyBullet(bulletX, bulletY, speedX - 1.5, speedY)); enemyBullets.push(new EnemyBullet(bulletX, bulletY, speedX - 0.5, speedY)); enemyBullets.push(new EnemyBullet(bulletX, bulletY, speedX + 0.5, speedY)); enemyBullets.push(new EnemyBullet(bulletX, bulletY, speedX + 1.5, speedY)); break; case 5: enemyBullets.push(new EnemyBullet(bulletX, bulletY, 0, 7)); enemyBullets.push(new EnemyBullet(bulletX, this.y, 0, -7)); break; case 6: enemyBullets.push(new EnemyBullet(bulletX, bulletY, -2, 6)); enemyBullets.push(new EnemyBullet(bulletX, bulletY, 2, 6)); break; case 7: for (let i = 0; i < 4; i++) { setTimeout(() => { if (gameRunning) enemyBullets.push(new EnemyBullet(this.x + this.width / 2 - (16 * scaleFactor), this.y + this.height)); }, i * 150); } setTimeout(() => { if (!gameRunning) return; const bulletSpeed = 5; const angleRad = -30 * (Math.PI / 180); const speedX_right = Math.cos(angleRad) * bulletSpeed; const speedY_up = Math.sin(angleRad) * bulletSpeed; enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y, speedX_right, speedY_up)); const speedX_left = -speedX_right; enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y, speedX_left, speedY_up)); }, 500); break; case 9: enemyBullets.push(new EnemyBullet(bulletX, bulletY, -1.5, 6)); enemyBullets.push(new EnemyBullet(bulletX, bulletY, 0, 7)); enemyBullets.push(new EnemyBullet(bulletX, bulletY, 1.5, 6)); break; case 10: for (let i = 0; i < 3; i++) { setTimeout(() => { if (gameRunning) enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height)); }, i * 120); } break; default: enemyBullets.push(new EnemyBullet(bulletX, bulletY)); break; }
} } 
    class Boss { constructor(bossType) { this.bossType = bossType; const bossConfigs = { 'SUPER_BOSS_1': { img: assets.superBoss1, size: 6, health: 250, attacks: ['homingBarrage', 'sweepingWall'] }, 'SUPER_BOSS_2': { img: assets.superBoss2, size: 6, health: 300, attacks: ['mineLayer', 'crossfire'] }, 'SUPER_BOSS_3': { img: assets.superBoss3, size: 6, health: 350, attacks: ['spiral', 'burstSnipe'] }, 'SUPER_BOSS_4': { img: assets.superBoss4, size: 6, health: 450, attacks: ['cone', 'summon'] }, 'GIGA_BOSS': { img: assets.gigaBoss, size: 10, health: 900, attacks: ['homingBarrage', 'sweepingWall', 'mineLayer', 'crossfire', 'spiral', 'burstSnipe', 'cone', 'summon'] }, 'FINAL_ENEMY': { img: assets.finalEnemy, size: 1.5, health: 100, attacks: ['finalBurst', 'spiral'] }, 'REGULAR': { img: assets[`enemy${bossType}`], size: 4, health: 100, attacks: ['radial', 'circular'] } }; const config = bossConfigs[bossType] || bossConfigs['REGULAR']; this.image = config.img; const playerBaseWidth = GAME_CONFIG.player.width * scaleFactor; if (this.bossType === 'GIGA_BOSS') { this.width = 1000 * scaleFactor; this.height = 500 * scaleFactor; } else { this.width = playerBaseWidth * config.size; this.height = playerBaseWidth * config.size; } this.health = config.health; this.maxHealth = this.health; this.attackPatterns = config.attacks; this.x = canvas.width / 2 - this.width / 2; this.y = 0 - this.height; this.speed = 1 * scaleFactor; this.isPositioned = false; this.isVulnerable = false; this.attackPhaseIndex = 0; this.attackPhase = this.attackPatterns[0]; this.lastAttackSwitch = Date.now(); this.lastShotTime = 0; this.circularShotIndex = 0; this.movementAngle = -Math.PI / 2; this.sweepAngle = -Math.PI / 4; this.sweepDirection = 1; if (this.bossType === 'FINAL_ENEMY') { this.speed = GAME_CONFIG.player.speed * scaleFactor * 1.5; this.moveTimer = 0; this.targetX = Math.random() * (canvas.width - this.width); this.targetY = Math.random() * (canvas.height - this.height); } } draw() { if (this.image) { ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } if (this.isPositioned && this.bossType !== 'FINAL_ENEMY') { const barWidth = canvas.width / 2; const barHeight = 25 * scaleFactor; const barY = 30 * scaleFactor; const healthPercentage = this.health / this.maxHealth; ctx.fillStyle = '#440000'; ctx.fillRect(canvas.width / 2 - barWidth / 2, barY, barWidth, barHeight); ctx.fillStyle = '#00ff00'; ctx.fillRect(canvas.width / 2 - barWidth / 2, barY, barWidth * healthPercentage, barHeight); ctx.strokeStyle = 'white'; ctx.strokeRect(canvas.width / 2 - barWidth / 2, barY, barWidth, barHeight); } } update() { if (this.bossType === 'FINAL_ENEMY') { if (!this.isPositioned) { if (this.y < canvas.height / 2) { this.y += this.speed; } else { this.isPositioned = true; this.isVulnerable = true; } } this.moveTimer -= 16; if (this.moveTimer <= 0) { if (Math.random() < 0.3) { this.targetX = player.x > canvas.width / 2 ? Math.random() * (canvas.width / 4) : canvas.width * 0.75 + Math.random() * (canvas.width / 4); this.targetY = player.y > canvas.height / 2 ? Math.random() * (canvas.height / 4) : canvas.height * 0.75 + Math.random() * (canvas.height / 4); } else { this.targetX = Math.random() * (canvas.width - this.width); this.targetY = Math.random() * (canvas.height * 0.8); } this.moveTimer = Math.random() * 1000 + 500; } const angle = Math.atan2(this.targetY - this.y, this.targetX - this.x); this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; } else { if (!this.isPositioned) { if (this.y < (50 * scaleFactor)) { this.y += this.speed; } else { this.isPositioned = true; this.isVulnerable = true; } return; } this.movementAngle += 0.01; const moveRange = (this.bossType === 'GIGA_BOSS') ? (200 * scaleFactor) : (100 * scaleFactor); this.x = (canvas.width / 2 - this.width / 2) + Math.cos(this.movementAngle) * moveRange; if (this.bossType === 'GIGA_BOSS') { this.y = (50 * scaleFactor) + Math.sin(this.movementAngle * 0.7) * (40 * scaleFactor); } } if (Date.now() - this.lastAttackSwitch > 10000) { this.attackPhaseIndex = (this.attackPhaseIndex + 1) % this.attackPatterns.length; this.attackPhase = this.attackPatterns[this.attackPhaseIndex]; this.lastAttackSwitch = Date.now(); this.circularShotIndex = 0; } this.shoot(); } shoot() { switch(this.attackPhase) { case 'radial': if (Date.now() - this.lastShotTime > 4000) { this.lastShotTime = Date.now(); setTimeout(() => this.fireRadialBurst(), 0); setTimeout(() => this.fireRadialBurst(), 500); } break; case 'circular': if (Date.now() - this.lastShotTime > 150) { this.lastShotTime = Date.now(); this.fireCircularShot(); } break; case 'homingBarrage': if (Date.now() - this.lastShotTime > 2000) { this.lastShotTime = Date.now(); this.firePredictiveBurst(); } break; case 'sweepingWall': if (Date.now() - this.lastShotTime > 50) { this.lastShotTime = Date.now(); this.fireSweepingWall(); } break; case 'mineLayer': if (Date.now() - this.lastShotTime > 1000) { this.lastShotTime = Date.now(); this.fireMine(); } break; case 'crossfire': if (Date.now() - this.lastShotTime > 200) { this.lastShotTime = Date.now(); this.fireCrossfire(); } break; case 'spiral': if (Date.now() - this.lastShotTime > 40) { this.lastShotTime = Date.now(); this.fireSpiral(); } break; case 'burstSnipe': if (Date.now() - this.lastShotTime > 2000) { this.lastShotTime = Date.now(); this.fireBurstSnipe(); } break; case 'cone': if (Date.now() - this.lastShotTime > 1500) { this.lastShotTime = Date.now(); this.fireCone(); } break; case 'summon': if (Date.now() - this.lastShotTime > 8000) { this.lastShotTime = Date.now(); this.summonEnemies(); } break; case 'finalBurst': if (Date.now() - this.lastShotTime > 1500) { this.lastShotTime = Date.now(); this.fireFinalBurst(); } break; } } fireRadialBurst() { playSound(audioAssets.enemyShoot, 0.6); const bulletSpeed = 5; const wingLeftX = this.x + this.width * 0.1; const wingRightX = this.x + this.width * 0.9; const wingY = this.y + this.height * 0.7; for (let i = 0; i < 8; i++) { const angle = (i / 8) * Math.PI * 2; const speedX = Math.cos(angle) * bulletSpeed; const speedY = Math.sin(angle) * bulletSpeed; enemyBullets.push(new EnemyBullet(wingLeftX, wingY, speedX, speedY)); enemyBullets.push(new EnemyBullet(wingRightX, wingY, speedX, speedY)); } } fireCircularShot() { playSound(audioAssets.enemyShoot, 0.3); const bulletSpeed = 6; const baseAngle = Math.atan2(0, -Math.sin(this.movementAngle)); const angle = baseAngle + (this.circularShotIndex / 15) * Math.PI * 2; const speedX = Math.cos(angle) * bulletSpeed; const speedY = Math.sin(angle) * bulletSpeed; enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height * 0.8, speedX, speedY)); this.circularShotIndex++; if (this.circularShotIndex >= 15) { this.circularShotIndex = 0; this.lastShotTime = Date.now() + 2000; } } firePredictiveBurst() { playSound(audioAssets.enemyShoot, 0.7); const bulletSpeed = 8; const centerX = this.x + this.width / 2; const centerY = this.y + this.height * 0.8; const angleToPlayer = Math.atan2(player.y - centerY, player.x - centerX); for(let i = -1; i <= 1; i++){ const angle = angleToPlayer + i * 0.2; enemyBullets.push(new EnemyBullet(centerX, centerY, Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed)); } } fireSweepingWall() { playSound(audioAssets.enemyShoot, 0.2); const bulletSpeed = 7; const baseAngle = Math.PI / 2; const angle = baseAngle + this.sweepAngle; const speedX = Math.cos(angle) * bulletSpeed; const speedY = Math.sin(angle) * bulletSpeed; enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height * 0.8, speedX, speedY)); this.sweepAngle += 0.05 * this.sweepDirection; if (this.sweepAngle > Math.PI / 4 || this.sweepAngle < -Math.PI / 4) { this.sweepDirection *= -1; } } fireMine() { playSound(audioAssets.enemyShoot, 0.5); const mineX = this.x + Math.random() * this.width; enemyBullets.push(new MineBullet(mineX, this.y + this.height * 0.7)); } fireCrossfire() {
    playSound(audioAssets.enemyShoot, 0.2);
    const bulletSpeed = 8;
    // Dispara una ráfaga de 2 balas desde cada lado
    for (let i = 0; i < 2; i++) {
        setTimeout(() => {
            if (!gameRunning) return;
            const angleToPlayerL = Math.atan2(player.y - (this.y + this.height * 0.6), player.x - (this.x + this.width * 0.2));
            const angleToPlayerR = Math.atan2(player.y - (this.y + this.height * 0.6), player.x - (this.x + this.width * 0.8));
            enemyBullets.push(new EnemyBullet(this.x + this.width * 0.2, this.y + this.height * 0.6, Math.cos(angleToPlayerL) * bulletSpeed, Math.sin(angleToPlayerL) * bulletSpeed));
            enemyBullets.push(new EnemyBullet(this.x + this.width * 0.8, this.y + this.height * 0.6, Math.cos(angleToPlayerR) * bulletSpeed, Math.sin(angleToPlayerR) * bulletSpeed));
        }, i * 100);
    }
} fireSpiral() { playSound(audioAssets.enemyShoot, 0.1); const bulletSpeed = 5; for(let j = 0; j < 3; j++){ const angle = this.circularShotIndex * 0.2 + j * (Math.PI * 2 / 3); const speedX = Math.cos(angle) * bulletSpeed; const speedY = Math.sin(angle) * bulletSpeed; enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height / 2, speedX, speedY)); } const increment = this.bossType === 'FINAL_ENEMY' ? 2 : 1; this.circularShotIndex += increment; } fireBurstSnipe() { playSound(audioAssets.enemyShoot, 0.7); const bulletSpeed = 10; const angleToPlayer = Math.atan2(player.y - (this.y + this.height / 2), player.x - (this.x + this.width / 2)); for(let i = 0; i < 3; i++){ setTimeout(() => { enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height / 2, Math.cos(angleToPlayer) * bulletSpeed, Math.sin(angleToPlayer) * bulletSpeed)); }, i * 100); } } fireCone() { playSound(audioAssets.enemyShoot, 0.8); const bulletSpeed = 6; const angleToPlayer = Math.atan2(player.y - (this.y + this.height * 0.8), player.x - (this.x + this.width / 2)); for(let i = -2; i <= 2; i++){ const angle = angleToPlayer + i * 0.15; enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height * 0.8, Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed)); } } summonEnemies() { playSound(audioAssets.powerupBurst); for(let i = 0; i < 2; i++){ const randomType = Math.floor(Math.random() * 5) + 1; if(gameRunning) enemies.push(new Enemy(randomType)); } } fireFinalBurst() { playSound(audioAssets.enemyShoot, 0.6); const bulletSpeed = 9; const angleToPlayer = Math.atan2(player.y - (this.y + this.height / 2), player.x - (this.x + this.width / 2)); for(let i = 0; i < 12; i++){ setTimeout(() => { if (gameRunning) enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height / 2, Math.cos(angleToPlayer) * bulletSpeed, Math.sin(angleToPlayer) * bulletSpeed)); }, i * 50); } } }
    
    // --- Lógica del Juego y Funciones Principales ---
    function resetPlayerStats(fullReset = false) {
        const diff = DIFFICULTY_SETTINGS[difficultyLevel];
        if(fullReset) { score = 0; enemyDestroyedCount = 0; bossesDestroyed = 0; enemiesSinceDamage = 0; playerLives = diff.initialLives; }
        playerHealth = diff.initialHealth; isInvulnerable = false; burstFireLevel = 0; wingCannonsActive = false; heavyCannonLevel = 0; laserActive = false; missileSystemActive = false; missileCharges = 0; slowShotStacks = 0; drones = []; powerUpSpawnChance = diff.powerUpChance; smartBombOnCooldown = false;
        clearTimeout(heavyCannonTimeout); clearTimeout(laserTimeout); clearTimeout(slowShotTimeout); clearInterval(missileChargeInterval);
    }

    function initGame(startProgressionIndex = 0) {
        resizeCanvas();
        scoreAndStatsDisabled = cheatModeActive || applyAllPowerupsCheat;
        const diff = DIFFICULTY_SETTINGS[difficultyLevel];
        resetPlayerStats(true);
        enemySpeedMultiplier = diff.enemySpeedMultiplier; 
        powerUpSpawnChance = diff.powerUpChance;
        allowSpawning = true;
        
        [difficultyTimer, asteroidInterval, bossTimer, meteorShowerTimer, aggressiveAsteroidSpawner, waveTimer].forEach(timer => { if(timer) {clearInterval(timer); clearTimeout(timer);} });
        
        difficultyTimer = setInterval(() => { if (gameRunning && !isPaused) { enemySpeedMultiplier += GAME_CONFIG.difficulty.speedMultiplierIncrease; } }, GAME_CONFIG.difficulty.increaseInterval);
        
        player = new Player();
        bullets = []; enemyBullets = []; asteroids = []; enemies = []; explosions = []; smallExplosions = []; stars = []; powerUps = []; bosses = []; missiles = []; laserBeams = []; asteroidShots = [];
        for (let i = 0; i < 100; i++) stars.push(new Star());
        
        currentBossIndex = startProgressionIndex;
        isPostSuperBoss4 = false; // Reiniciar flag
        if (currentBossIndex > bossProgression.length + 3) { isPostSuperBoss4 = true; } // Si empieza en Giga o Final, activar
        
        if (applyAllPowerupsCheat) {
            playerHealth = diff.maxHealth; playerLives = diff.maxLives; burstFireLevel = 2; wingCannonsActive = true; missileSystemActive = true; missileCharges = GAME_CONFIG.missiles.maxCharges;
            if(!missileChargeInterval) { missileChargeInterval = setInterval(() => { if (gameRunning && !isPaused && missileCharges < GAME_CONFIG.missiles.maxCharges) { missileCharges++; } }, GAME_CONFIG.missiles.chargeTime); }
        }

        gameState = 'NORMAL_WAVE';
        handleGameStateChange();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        gameRunning = true;
        isPaused = false;
        gameLoop();
    }
    
    function spawnWave(count) { for (let i = 0; i < count; i++) { const randomType = Math.floor(Math.random() * 10) + 1; setTimeout(() => { if (gameRunning) enemies.push(new Enemy(randomType)); }, i * 300); } }
    function handleGameStateChange(arg) { switch (gameState) { case 'METEOR_SHOWER': playMusic(audioAssets.bossMusic); clearInterval(asteroidInterval); allowSpawning = false; enemies.forEach(e => e.retreating = true); aggressiveAsteroidSpawner = setInterval(() => { if (gameRunning && !isPaused) asteroids.push(new Asteroid(Math.ceil(Math.random() * 4))); }, 400); meteorShowerTimer = setTimeout(() => { gameState = 'BOSS_FIGHT'; handleGameStateChange(); }, 10000); break; case 'BOSS_FIGHT': clearInterval(aggressiveAsteroidSpawner); let bossType; if (currentBossIndex < bossProgression.length) { bossType = bossProgression[currentBossIndex]; } else { const superIndex = currentBossIndex - bossProgression.length; bossType = superBossProgression[superIndex]; } bosses.push(new Boss(bossType)); break; case 'NORMAL_WAVE': playMusic(audioAssets.backgroundMusic); allowSpawning = true; const chargeCycleDuration = (currentBossIndex >= bossProgression.length) ? GAME_CONFIG.gameplay.superBossChargeCycleDuration : GAME_CONFIG.gameplay.chargeCycleDuration; bossTimer = setInterval(() => { gameState = 'METEOR_SHOWER'; handleGameStateChange(); clearInterval(bossTimer); }, chargeCycleDuration); asteroidInterval = setInterval(() => { if (gameRunning && !isPaused && asteroids.length < 5) { const rand = Math.random(); let type = 1; if (rand < 0.60) type = 1; else if (rand < 0.85) type = 2; else if (rand < 0.95) type = 3; else type = 4; asteroids.push(new Asteroid(type)); } }, 8000); const startingEnemies = typeof arg === 'number' ? arg : DIFFICULTY_SETTINGS[difficultyLevel].enemies; spawnWave(startingEnemies); break; } }
    function findNearestTarget(fromX, fromY, targetTypes = ['enemies', 'bosses', 'asteroids']) {
        let allTargets = []; if (targetTypes.includes('enemies')) allTargets.push(...enemies); if (targetTypes.includes('bosses')) allTargets.push(...bosses); if (targetTypes.includes('asteroids')) allTargets.push(...asteroids); if (allTargets.length === 0) return null; let nearestTarget = null; let minDistanceSq = Infinity;
        allTargets.forEach(target => { if (target.health <= 0) return; const dx = target.x - fromX; const dy = target.y - fromY; const distanceSq = dx * dx + dy * dy; if (distanceSq < minDistanceSq) { minDistanceSq = distanceSq; nearestTarget = target; } }); return nearestTarget;
    }
    function getComboTier(killCount) {
    if (killCount >= 55) return 5;
    if (killCount >= 45) return 4;
    if (killCount >= 35) return 3;
    if (killCount >= 25) return 2;
    if (killCount >= 15) return 1;
    return 0;
}

function triggerComboIndicator(x, y, tier) {
    const tierMap = { 1: '1_5x', 2: '2x', 3: '3x', 4: '4x', 5: '5x' };
    const imageName = `combo_${tierMap[tier]}`;
    const soundName = `combo_tier${tier}`;
    
    if (assets[imageName]) {
        floatingIndicators.push(new FloatingIndicator(x, y, assets[imageName]));
    }
    if (audioAssets[soundName]) {
        playSound(audioAssets[soundName], 0.9);
    }
}
    // CAMBIO 13: Nuevo Sistema de Puntuación
    function addScore(basePoints) {
        if (scoreAndStatsDisabled) return 69;
        const diff = DIFFICULTY_SETTINGS[difficultyLevel];
        let comboMultiplier = 1;

        if (enemiesSinceDamage >= 55) comboMultiplier = 5;
        else if (enemiesSinceDamage >= 45) comboMultiplier = 4;
        else if (enemiesSinceDamage >= 35) comboMultiplier = 3;
        else if (enemiesSinceDamage >= 25) comboMultiplier = 2;
        else if (enemiesSinceDamage >= 15) comboMultiplier = 1.5;

        const finalMultiplier = diff.scoreMultiplier + (comboMultiplier > 1 ? comboMultiplier - 1 : 0);
        const finalPoints = Math.ceil(basePoints * finalMultiplier);
        score += finalPoints;
        return finalPoints;
    }

  
    function restartCurrentLevel() { gameRunning = false; isPaused = false; playMusic(null); [difficultyTimer, asteroidInterval, bossTimer, meteorShowerTimer, aggressiveAsteroidSpawner, missileChargeInterval, slowShotTimeout, waveTimer].forEach(timer => { if(timer) {clearInterval(timer); clearTimeout(timer);} }); const pauseMenu = document.getElementById('pauseMenu'); if (pauseMenu) gameContainer.removeChild(pauseMenu); score = 0; enemyDestroyedCount = 0; bossesDestroyed = 0; enemiesSinceDamage = 0; initGame(currentBossIndex); }
    function togglePause() {
        if (gameState === 'INTERMISSION') return; // No se puede pausar en intermedio
        isPaused = !isPaused; if (isPaused) { cancelAnimationFrame(animationFrameId); if (audioAssets.backgroundMusic) audioAssets.backgroundMusic.pause(); if (audioAssets.bossMusic) audioAssets.bossMusic.pause(); const pauseMenu = document.createElement('div'); Object.assign(pauseMenu.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#fff', zIndex: '100', fontFamily: "'Arial', sans-serif", backgroundColor: 'rgba(0, 0, 0, 0.85)', padding: '20px', borderRadius: '10px', minWidth: '300px' }); pauseMenu.id = 'pauseMenu'; pauseMenu.innerHTML = `<h1 style="font-size: 2.5em; color: #00ff00; text-shadow: 2px 2px 4px #000; margin-top: 0;">PAUSA</h1><div id="mainPauseButtons" style="margin-bottom: 25px;"><button id="resumeButton" style="padding: 12px 24px; font-size: 1.2em; margin: 5px; cursor: pointer;">Seguir</button><button id="restartButton" style="padding: 12px 24px; font-size: 1.2em; margin: 5px; cursor: pointer;">Reiniciar Nivel</button><button id="exitButton" style="padding: 12px 24px; font-size: 1.2em; margin: 5px; cursor: pointer;">Salir</button></div><div id="pauseSoundControls" style="border-top: 1px solid #444; padding-top: 15px;"><div style="display: flex; justify-content: space-around; align-items: center; margin-bottom: 10px;"><button id="musicToggleButton" style="flex-basis: 45%; padding: 10px;">Música</button><button id="sfxToggleButton" style="flex-basis: 45%; padding: 10px;">SFX</button></div><div style="margin-bottom: 10px;"><label for="musicVolumeSlider">Volumen Música</label><input type="range" id="musicVolumeSlider" min="0" max="1" step="0.05" style="width: 90%;"></div><div><label for="sfxVolumeSlider">Volumen SFX</label><input type="range" id="sfxVolumeSlider" min="0" max="1" step="0.05" style="width: 90%;"></div></div>`; gameContainer.appendChild(pauseMenu); const resumeButton = document.getElementById('resumeButton'); const restartButton = document.getElementById('restartButton'); const exitButton = document.getElementById('exitButton'); const musicToggleButton = document.getElementById('musicToggleButton'); const sfxToggleButton = document.getElementById('sfxToggleButton'); const musicVolumeSlider = document.getElementById('musicVolumeSlider'); const sfxVolumeSlider = document.getElementById('sfxVolumeSlider'); resumeButton.onclick = togglePause; restartButton.onclick = restartCurrentLevel; exitButton.onclick = exitToLobby; const updateMusicButtonText = () => { musicToggleButton.textContent = `Música: ${isMusicOn ? 'ON' : 'OFF'}`; }; const updateSfxButtonText = () => { sfxToggleButton.textContent = `SFX: ${isSfxOn ? 'ON' : 'OFF'}`; }; updateMusicButtonText(); updateSfxButtonText(); musicToggleButton.onclick = () => { isMusicOn = !isMusicOn; updateMusicButtonText(); if (!isMusicOn) { playMusic(null); } }; sfxToggleButton.onclick = () => { isSfxOn = !isSfxOn; updateSfxButtonText(); }; musicVolumeSlider.value = musicVolume; sfxVolumeSlider.value = sfxVolume; musicVolumeSlider.addEventListener('input', (e) => { musicVolume = parseFloat(e.target.value); const currentTrack = (gameState === 'NORMAL_WAVE') ? audioAssets.backgroundMusic : audioAssets.bossMusic; if(currentTrack) currentTrack.volume = musicVolume; }); sfxVolumeSlider.addEventListener('input', (e) => { sfxVolume = parseFloat(e.target.value); }); } else { if (isMusicOn) { const currentTrack = (gameState === 'NORMAL_WAVE') ? audioAssets.backgroundMusic : audioAssets.bossMusic; playMusic(currentTrack); } const pauseMenu = document.getElementById('pauseMenu'); if (pauseMenu) gameContainer.removeChild(pauseMenu); gameLoop(); }
    }
    function exitToLobby() { gameRunning = false; isPaused = false; playMusic(null); [difficultyTimer, asteroidInterval, bossTimer, meteorShowerTimer, aggressiveAsteroidSpawner, missileChargeInterval, slowShotTimeout, waveTimer].forEach(timer => { if(timer) {clearInterval(timer); clearTimeout(timer);} }); const pauseMenu = document.getElementById('pauseMenu'); if (pauseMenu) gameContainer.removeChild(pauseMenu); canvas.style.display = 'none'; lobby.style.display = 'flex'; updateLobbyUI(); }
    function damagePlayer(amount = 1) { if (isInvulnerable) return; if (playerHealth > 0) { playerHealth--; playSound(audioAssets.powerupShield); triggerDamageVignette(); isInvulnerable = true; setTimeout(() => { isInvulnerable = false; }, 500); return; } handlePlayerDeath(); }
    function handlePlayerDeath() { if (isInvulnerable) return; playerLives--; enemiesSinceDamage = 0; playSound(audioAssets.explosionLarge); explosions.push(new Explosion(player.x, player.y, player.width)); if (playerLives <= 0) { gameRunning = false; playMusic(null); [difficultyTimer, asteroidInterval, bossTimer, meteorShowerTimer, aggressiveAsteroidSpawner, missileChargeInterval, slowShotTimeout, waveTimer].forEach(timer => { if (timer) { clearInterval(timer); clearTimeout(timer); } }); showGameOverScreen(); } else { playerHealth = DIFFICULTY_SETTINGS[difficultyLevel].initialHealth; player.x = canvas.width / 2 - player.width / 2; player.y = canvas.height - 150 * scaleFactor; isInvulnerable = true; setTimeout(() => { isInvulnerable = false; }, GAME_CONFIG.player.invulnerabilityDuration); } }
    function triggerDamageVignette() { const vignette = document.createElement('div'); Object.assign(vignette.style, { position: 'absolute', top: '0', left: '0', width: '100vw', height: '100vh', boxShadow: 'inset 0 0 150px 50px rgba(255, 0, 0, 0.6)', pointerEvents: 'none', zIndex: '998', opacity: '1', transition: 'opacity 0.5s ease-out' }); gameContainer.appendChild(vignette); setTimeout(() => { vignette.style.opacity = '0'; }, 100); setTimeout(() => { if (gameContainer.contains(vignette)) { gameContainer.removeChild(vignette); } }, 600); }
    
    function handleCollisions() { checkPlayerProjectilesVsTargets(); checkSpecialProjectilesVsTargets(); checkEnemyProjectilesVsPlayer(); checkPlayerVsPowerUps(); checkPlayerVsHazards(); }
    function checkPlayerProjectilesVsTargets() {
        const projectiles = [...bullets, ...missiles];
        for (let pIndex = projectiles.length - 1; pIndex >= 0; pIndex--) {
            const p = projectiles[pIndex]; if (!p) continue;
            let targets = [...bosses, ...enemies, ...asteroids];
            for (let tIndex = targets.length - 1; tIndex >= 0; tIndex--) {
                const target = targets[tIndex]; if (!target) continue;
                if (target instanceof Boss && !target.isVulnerable) continue; // CAMBIO 10: Chequeo de vulnerabilidad
                if (p.x < target.x + target.width && p.x + p.width > target.x && p.y < target.y + target.height && p.y + p.height > target.y) {
                    target.health -= p.damage; playSound(p instanceof Missile ? audioAssets.missileExplosion : audioAssets.hit); explosions.push(new Explosion(p.x, p.y, p instanceof Missile ? 150 * scaleFactor : 30 * scaleFactor));
                    if(bullets.includes(p)) bullets.splice(bullets.indexOf(p), 1); if(missiles.includes(p)) missiles.splice(missiles.indexOf(p), 1);
                    if (target.health <= 0) { handleTargetDestroyed(target); }
                    break; 
                }
            }
        }
    }
    function checkSpecialProjectilesVsTargets() {
        let targets = [...bosses, ...enemies, ...asteroids];
        laserBeams.forEach(laser => {
            targets.forEach(target => {
                if (target instanceof Boss && !target.isVulnerable) return; // CAMBIO 10: Chequeo de vulnerabilidad
                if (target.health > 0 && !laser.collidedEnemies.has(target)) { if (laser.x < target.x + target.width && laser.x + laser.width > target.x) { target.health -= laser.damage; laser.collidedEnemies.add(target); playSound(audioAssets.hit); smallExplosions.push(new SmallExplosion(target.x + target.width / 2, Math.max(target.y, 0))); if (target.health <= 0) { handleTargetDestroyed(target); } } }
            });
        });
        for (let asIndex = asteroidShots.length - 1; asIndex >= 0; asIndex--) {
            const shot = asteroidShots[asIndex]; if (!shot) continue; let hit = false;
            for (let tIndex = targets.length - 1; tIndex >= 0; tIndex--) {
                const target = targets[tIndex]; if (!target || target === shot) continue;
                if (target instanceof Boss && !target.isVulnerable) continue; // CAMBIO 10: Chequeo de vulnerabilidad
                if (shot.x < target.x + target.width && shot.x + shot.width > target.x && shot.y < target.y + target.height && shot.y + shot.height > target.y) { target.health -= shot.damage; hit = true; if (target.health <= 0) { handleTargetDestroyed(target); } }
            }
            if (hit) { playSound(audioAssets.explosionSmall); explosions.push(new Explosion(shot.x, shot.y, 80 * scaleFactor)); asteroidShots.splice(asIndex, 1); }
        }
    }
    function handleTargetDestroyed(target) {
        if (target instanceof Boss) {
            if (target.bossType === 'SUPER_BOSS_4') { isPostSuperBoss4 = true; } // CAMBIO 8: Activar flag
            if (target.bossType === 'FINAL_ENEMY') { startEndingSequence(); return; }
            const scoreForBoss = target.maxHealth;
            const pointsFromBoss = addScore(scoreForBoss);
            createChainedExplosions(target);
            triggerScreenShake(500, 15 * scaleFactor);
            bosses.splice(bosses.indexOf(target), 1);
            if (!scoreAndStatsDisabled) bossesDestroyed++;
            currentBossIndex++;
            if (currentBossIndex >= bossProgression.length + superBossProgression.length) { currentBossIndex = 0; }
            // CAMBIO 12: Iniciar intermedio
            intermissionData = { name: BOSS_NAMES[target.bossType] || BOSS_NAMES['REGULAR'], score: pointsFromBoss, startTime: Date.now() };
            gameState = 'INTERMISSION';
            playSound(audioAssets.intermission);
            triggerScreenFlash(500);

        } else if (target instanceof Asteroid) {
            addScore(target.maxHealth); // CAMBIO 13: Asteroides dan puntos normales
            // CAMBIO 9: Explosiones múltiples de asteroides
            const explosionCount = target.type === 2 ? 2 : (target.type === 4 ? 3 : 1);
            createMultiExplosion(target, explosionCount);
            
            // CAMBIO 5: Asteroide 2 mejorado
            if (target.type === 2 && Math.random() < 0.50) { for (let i = 0; i < 6; i++) { const angle = (i / 6) * (Math.PI * 2); asteroidShots.push(new AsteroidShot(target.x + target.width/2, target.y + target.height/2, angle)); } }
            // CAMBIO 6: Asteroide 4 mejorado
            if (target.type === 4) { asteroids.push(new Asteroid(2)); asteroids.push(new Asteroid(2)); asteroids.push(new Asteroid(2)); }
            asteroids.splice(asteroids.indexOf(target), 1);

        } else if (target instanceof Enemy) {
            addScore(target.maxHealth); // CAMBIO 13: Usar nuevo sistema de puntuación
            playSound(audioAssets.explosionLarge);
            explosions.push(new Explosion(target.x, target.y, target.width));
            enemies.splice(enemies.indexOf(target), 1);
            if (!scoreAndStatsDisabled) {
    const oldKills = enemiesSinceDamage;
    enemyDestroyedCount++;
    enemiesSinceDamage++;
    const oldTier = getComboTier(oldKills);
    const newTier = getComboTier(enemiesSinceDamage);

    if (newTier > oldTier) {
        triggerComboIndicator(target.x, target.y, newTier);
    }
    currentComboTier = newTier;
}
            
            if (enemyDestroyedCount > 0 && enemyDestroyedCount % 20 === 0 && !smartBombOnCooldown) {
                powerUps.push(new PowerUp(target.x, target.y, 'smartBomb')); smartBombOnCooldown = true; setTimeout(() => { smartBombOnCooldown = false; }, GAME_CONFIG.powerups.smartBombCooldown);
            } else if (Math.random() < powerUpSpawnChance) { // CAMBIO 2: Lógica de LuckUp eliminada
                const rand = Math.random(); let type = 'health';
                if (rand < 0.18) type = 'slowShot'; else if (rand < 0.36) type = 'rapidFire'; else if (rand < 0.48) type = 'health'; else if (rand < 0.58) type = 'extraLife'; else if (rand < 0.68) type = 'wingCannons'; else if (rand < 0.78) type = 'heavyCannon'; else if (rand < 0.88) type = 'drone'; else type = 'laser';
                powerUps.push(new PowerUp(target.x, target.y, type));
            }
            if (gameState === 'NORMAL_WAVE') { spawnEnemies(); }
        }
    }
    function checkEnemyProjectilesVsPlayer() {
        if (!player || isInvulnerable) return;
        const playerHitboxWidth = player.width / 2; const playerHitboxHeight = player.height / 2; const playerHitboxX = player.x + playerHitboxWidth / 2; const playerHitboxY = player.y + playerHitboxHeight / 2;
        for (let bIndex = enemyBullets.length - 1; bIndex >= 0; bIndex--) {
            const bullet = enemyBullets[bIndex];
            if (bullet.x < playerHitboxX + playerHitboxWidth && bullet.x + bullet.width > playerHitboxX && bullet.y < playerHitboxY + playerHitboxHeight && bullet.y + bullet.height > playerHitboxY) {
                enemyBullets.splice(bIndex, 1); smallExplosions.push(new SmallExplosion(bullet.x, bullet.y)); enemiesSinceDamage = 0; damagePlayer(1); return;
            }
        }
    }
    function checkPlayerVsPowerUps() {
        if (!player) return;
        for (let pIndex = powerUps.length - 1; pIndex >= 0; pIndex--) {
            const powerUp = powerUps[pIndex];
            if (player.x < powerUp.x + powerUp.width && player.x + player.width > powerUp.x && player.y < powerUp.y + powerUp.height && player.y + player.height > powerUp.y) {
                applyPowerUp(powerUp.type); powerUps.splice(pIndex, 1);
            }
        }
    }
    function applyPowerUp(type) {
        const diff = DIFFICULTY_SETTINGS[difficultyLevel];
        switch(type) {
            case 'health': playSound(audioAssets.powerupShield); playerHealth = Math.min(diff.maxHealth, playerHealth + 1); break;
            case 'rapidFire': playSound(audioAssets.powerupBurst); burstFireLevel = Math.min(2, burstFireLevel + 1); break;
            case 'extraLife': playSound(audioAssets.powerupExtraLife); if (playerLives < diff.maxLives) { playerLives++; } break;
            case 'wingCannons': playSound(audioAssets.powerupWings); wingCannonsActive = true; break;
            case 'heavyCannon': playSound(audioAssets.powerupHeavy); heavyCannonLevel = Math.min(3, heavyCannonLevel + 1); laserActive = false; clearTimeout(heavyCannonTimeout); clearTimeout(laserTimeout); heavyCannonTimeout = setTimeout(() => { heavyCannonLevel = 0; }, 15000); break;
            case 'laser': playSound(audioAssets.powerupHeavy); laserActive = true; heavyCannonLevel = 0; clearTimeout(heavyCannonTimeout); clearTimeout(laserTimeout); laserTimeout = setTimeout(() => { laserActive = false; }, GAME_CONFIG.powerups.laserDuration); break;
            case 'missileSystem': playSound(audioAssets.powerupMissile); if (!missileSystemActive) { missileSystemActive = true; missileChargeInterval = setInterval(() => { if (gameRunning && !isPaused && missileCharges < GAME_CONFIG.missiles.maxCharges) { missileCharges++; } }, GAME_CONFIG.missiles.chargeTime); } if (missileCharges < GAME_CONFIG.missiles.maxCharges) missileCharges++; break;
            case 'smartBomb': playSound(audioAssets.bombExplode); enemies.forEach(e => { explosions.push(new Explosion(e.x, e.y, e.width)); addScore(e.health); }); enemies = []; triggerScreenFlash(); spawnWave(4); break;
            case 'drone': playSound(audioAssets.powerupDrone); if(drones.length < diff.maxDrones) { const angleOffset = drones.length > 0 ? drones[0].angle + Math.PI : 0; drones.push(new Drone(player, angleOffset)); } break; // CAMBIO 3: Usar maxDrones de dificultad
            case 'slowShot': playSound(audioAssets.powerdownSound); slowShotStacks = Math.min(4, slowShotStacks + 1); clearTimeout(slowShotTimeout); slowShotTimeout = setTimeout(() => { slowShotStacks = 0; }, GAME_CONFIG.powerups.slowShotDuration); break; // CAMBIO 4: Aumentar acumulaciones
        }
    }

    function gameLoop() {
    if (!gameRunning || gameState === 'ENDING' || gameState === 'POST_ENDING') { 
        if (animationFrameId) cancelAnimationFrame(animationFrameId); 
        return; 
    }
    if (isPaused) { 
        requestAnimationFrame(gameLoop); 
        return; 
    }
    
    // --- 1. LÓGICA DE TEMBLOR Y FONDO ---
    ctx.save(); 
    if (screenShakeDuration > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeMagnitude;
        const shakeY = (Math.random() - 0.5) * screenShakeMagnitude;
        ctx.translate(shakeX, shakeY);
        screenShakeDuration -= 16;
    }

    updateBackgroundColor();
    ctx.fillStyle = backgroundColor; 
    ctx.fillRect(0, 0, canvas.width, canvas.height); 

    // --- 2. LÓGICA DE ESTADO DEL JUEGO ---
    if (gameState === 'INTERMISSION') {
        if (Date.now() - intermissionData.startTime > GAME_CONFIG.gameplay.intermissionDuration) {
            gameState = 'NORMAL_WAVE';
            handleGameStateChange(6);
            intermissionData = null;
        }
    }
    
    let playerSpeedX = 0, playerSpeedY = 0; 
    if (keys['arrowleft'] || keys['a']) playerSpeedX = -player.speed; 
    if (keys['arrowright'] || keys['d']) playerSpeedX = player.speed; 
    if (keys['arrowup'] || keys['w']) playerSpeedY = -player.speed; 
    if (keys['arrowdown'] || keys['s']) playerSpeedY = player.speed;
    if (isShooting) player.shoot();

    // --- 3. ACTUALIZACIÓN DE ENTIDADES ---
    stars.forEach(s => s.update(playerSpeedX, playerSpeedY));
    if (gameState !== 'INTERMISSION') { player.update(); }
    bullets.forEach((b, i) => { b.update(); if (b.y + b.height < 0 || b.y > canvas.height) bullets.splice(i, 1); });
    laserBeams.forEach((l, i) => { l.update(); if (l.life <= 0) laserBeams.splice(i, 1); });
    asteroidShots.forEach((as, i) => { as.update(); if (as.y + as.height < 0 || as.y > canvas.height || as.x + as.width < 0 || as.x > canvas.width) asteroidShots.splice(i, 1); });
    missiles.forEach(m => m.update());
    drones.forEach(d => d.update());
    enemyBullets.forEach((eb, i) => { eb.update(); if (eb.y > canvas.height || eb.life <= 0 || eb.x < -eb.width || eb.x > canvas.width) enemyBullets.splice(i, 1); });
    enemies.forEach((e, i) => { e.update(player); if (e.y > canvas.height + e.height*2 && e.retreating) enemies.splice(i,1); });
    bosses.forEach(b => b.update());
    explosions.forEach((ex, i) => { ex.update(); if (ex.life <= 0) explosions.splice(i, 1); });
    smallExplosions.forEach((ex, i) => { ex.update(); if (ex.life <= 0) smallExplosions.splice(i, 1); });
    powerUps.forEach((p, i) => { p.update(); if (p.y > canvas.height) powerUps.splice(i, 1); });
    asteroids.forEach((a, i) => { a.update(); if (a.y > canvas.height) asteroids.splice(i, 1); });
    floatingIndicators.forEach((ind, i) => {
        ind.update();
        if (ind.life <= 0) {
            floatingIndicators.splice(i, 1);
        }
    });

    if (gameState !== 'INTERMISSION') handleCollisions();

    // --- 4. DIBUJADO DE ENTIDADES ---
    stars.forEach(s => s.draw()); 
    asteroids.forEach(a => a.draw()); 
    bullets.forEach(b => b.draw()); 
    laserBeams.forEach(l => l.draw()); 
    asteroidShots.forEach(as => as.draw()); 
    missiles.forEach(m => m.draw()); 
    enemies.forEach(e => e.draw()); 
    bosses.forEach(b => b.draw()); 
    powerUps.forEach(p => p.draw()); 
    player.draw(); 
    drones.forEach(d => d.draw()); 
    explosions.forEach(ex => ex.draw()); 
    smallExplosions.forEach(ex => ex.draw()); 
    enemyBullets.forEach(eb => eb.draw());
    floatingIndicators.forEach(ind => ind.draw());
    
    // --- 5. DIBUJADO DE UI ---
    const fontSize = 24 * scaleFactor; 
    ctx.fillStyle = 'white'; 
    ctx.font = `${fontSize}px Arial`; 
    ctx.textAlign = 'left';
    ctx.fillText(`Puntaje: ${score}`, 20 * scaleFactor, 40 * scaleFactor); 
    ctx.fillText(`Derribos: ${enemyDestroyedCount}`, 20 * scaleFactor, 70 * scaleFactor); 
    ctx.fillText(`Jefes: ${bossesDestroyed}`, 20 * scaleFactor, 100 * scaleFactor);
    const iconSize = 40 * scaleFactor; 
    const iconGap = 10 * scaleFactor;
    if (assets.lifeIcon) { for (let i = 0; i < playerLives; i++) { ctx.drawImage(assets.lifeIcon, canvas.width - (iconSize + iconGap) * (i + 1), 20 * scaleFactor, iconSize, iconSize); } }
    if (assets.healthIcon) { for (let i = 0; i < playerHealth; i++) { ctx.drawImage(assets.healthIcon, canvas.width - (iconSize + iconGap) * (i + 1), 20 * scaleFactor + iconSize + iconGap, iconSize, iconSize); } }
    if (currentComboTier > 0) {
        const tierMap = { 1: '1_5x', 2: '2x', 3: '3x', 4: '4x', 5: '5x' };
        const hudImageName = `combo_hud_${tierMap[currentComboTier]}`;
        if (assets[hudImageName]) {
            const hudIconSize = 50 * scaleFactor;
            ctx.drawImage(assets[hudImageName], canvas.width - (hudIconSize + iconGap), 20 * scaleFactor + iconSize * 2 + iconGap * 2, hudIconSize, hudIconSize);
        }
    }
    if (missileSystemActive && assets.missileIcon) { const mIconSize = 60 * scaleFactor; const mGap = 10 * scaleFactor; const totalWidth = GAME_CONFIG.missiles.maxCharges * (mIconSize + mGap); for (let i = 0; i < missileCharges; i++) { ctx.drawImage(assets.missileIcon, (canvas.width / 2) - (totalWidth / 2) + (i * (mIconSize + mGap)), canvas.height - (mIconSize + mGap), mIconSize, mIconSize); } }
    
    if (gameState === 'INTERMISSION' && intermissionData) {
        drawIntermissionScreen();
    }
    
    if (isPaused) { 
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height); 
    }

    // --- 6. FINALIZACIÓN DEL FRAME ---
    ctx.restore(); 
    animationFrameId = requestAnimationFrame(gameLoop);
}
    function checkPlayerVsHazards() {
        if (!player || isInvulnerable) return;
        const playerHitboxWidth = player.width / 2; const playerHitboxHeight = player.height / 2; const playerHitboxX = player.x + playerHitboxWidth / 2; const playerHitboxY = player.y + playerHitboxHeight / 2;
        const hazards = [...asteroids, ...bosses, ...enemies.filter(e => e.type === 8), ...asteroidShots];
        for (let i = hazards.length - 1; i >= 0; i--) {
            const hazard = hazards[i];
            if (hazard instanceof Boss && !hazard.isVulnerable) continue; // CAMBIO 10: Chequeo de vulnerabilidad
            if (playerHitboxX < hazard.x + hazard.width && playerHitboxX + playerHitboxWidth > hazard.x && playerHitboxY < hazard.y + hazard.height && playerHitboxY + playerHitboxHeight > hazard.y) {
                enemiesSinceDamage = 0;
                if (hazard instanceof Asteroid) { playSound(audioAssets.explosionLarge); explosions.push(new Explosion(hazard.x, hazard.y, hazard.width)); asteroids.splice(asteroids.indexOf(hazard), 1); handlePlayerDeath(); return; }
                if (hazard instanceof AsteroidShot) {
    damagePlayer(1);
    asteroidShots.splice(asteroidShots.indexOf(hazard), 1);
    // El disparo de asteroide solo daña y desaparece.
} else if (hazard instanceof Boss || hazard.type === 8) {
    damagePlayer(1);
    if (hazard.type === 8) { 
        hazard.health = 0; 
        handleTargetDestroyed(hazard); // El kamikaze sí debe procesarse como destruido.
    }
}
return;
            }
        }
    }
    // CAMBIO 9: Nueva función de explosiones múltiples
    function createMultiExplosion(target, count) {
        for (let i = 0; i < count; i++) { setTimeout(() => { if (!gameRunning && gameState !== 'ENDING' && gameState !== 'POST_ENDING') return; const exX = target.x + (Math.random() * target.width * 0.8) + (target.width * 0.1); const exY = target.y + (Math.random() * target.height * 0.8) + (target.height * 0.1); const exSize = (Math.random() * 0.3 + 0.2) * target.width; explosions.push(new Explosion(exX, exY, exSize)); playSound(audioAssets.explosionLarge, 0.4); }, i * 100); }
    }

    function triggerScreenShake(duration, magnitude) {
    screenShakeDuration = duration;
    screenShakeMagnitude = magnitude;
}
    function createChainedExplosions(target, isIntro = false) { playSound(audioAssets.bossExplosion || audioAssets.explosionLarge); const numExplosions = isIntro ? 20 : 15; for (let i = 0; i < numExplosions; i++) { setTimeout(() => { const exX = target.x + Math.random() * target.width; const exY = target.y + Math.random() * target.height; const exSize = (Math.random() * 0.4 + 0.2) * target.width; explosions.push(new Explosion(exX, exY, exSize)); if(i % 3 === 0) playSound(audioAssets.explosionLarge, 0.5); }, i * 80); } }
    function spawnEnemies() { if(!allowSpawning) return; const enemiesToSpawn = (enemyDestroyedCount > 0 && enemyDestroyedCount % 3 === 0) ? 2 : 1; for (let i = 0; i < enemiesToSpawn; i++) { const randomType = Math.floor(Math.random() * 10) + 1; setTimeout(() => { if(gameRunning) enemies.push(new Enemy(randomType)); }, 500); } }
    function triggerScreenFlash(duration = 240, intensity = 0.7) { const flash = document.createElement('div'); Object.assign(flash.style, { position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: '999', pointerEvents: 'none', transition: 'background-color 0.05s' }); gameContainer.appendChild(flash); setTimeout(() => { flash.style.backgroundColor = `rgba(255, 255, 255, ${intensity})`; }, 0); setTimeout(() => { flash.style.backgroundColor = 'rgba(0, 0, 0, 0)'; }, duration / 2); setTimeout(() => { if (gameContainer.contains(flash)) { gameContainer.removeChild(flash); } }, duration); }
    function showGameOverScreen() { if (!scoreAndStatsDisabled) { const highScore = localStorage.getItem('spaceShooterHighScore') || 0; if (score > highScore) { localStorage.setItem('spaceShooterHighScore', score); } const bossHighScore = localStorage.getItem('spaceShooterBossHighScore') || 0; if (bossesDestroyed > bossHighScore) { localStorage.setItem('spaceShooterBossHighScore', bossesDestroyed); } const enemyHighScore = localStorage.getItem('spaceShooterEnemyHighScore') || 0; if (enemyDestroyedCount > enemyHighScore) { localStorage.setItem('spaceShooterEnemyHighScore', enemyDestroyedCount); } }
        const gameOverDiv = document.createElement('div'); gameOverDiv.id = 'gameOverScreen'; Object.assign(gameOverDiv.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#fff', backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: '40px', borderRadius: '10px', zIndex: '100' }); 
        let scoreHTML = `<p style="font-size: 1.8em;">Tu puntaje: ${score}</p><p style="font-size: 1.2em;">Puntaje Máximo: ${localStorage.getItem('spaceShooterHighScore') || 0}</p><p style="font-size: 1.2em; color: #ffaa00;">Récord de Jefes: ${localStorage.getItem('spaceShooterBossHighScore') || 0}</p>`;
        if(scoreAndStatsDisabled) { scoreHTML = `<p style="font-size: 1.5em; color: #ff4444;">Puntaje deshabilitado en Modo Cheat</p>`; }
        gameOverDiv.innerHTML = ` <h1 style="color: #ff4444; font-size: 3.5em;">GAME OVER</h1> ${scoreHTML} <button id="restartButton">Volver al Menú</button> `; 
        gameContainer.appendChild(gameOverDiv); const restartButton = document.getElementById('restartButton'); Object.assign(restartButton.style, { padding: '15px 30px', fontSize: '1.5em', cursor: 'pointer', backgroundColor: '#00ff00', color: '#000', border: 'none', borderRadius: '5px', marginTop: '20px' }); restartButton.onclick = () => { gameContainer.removeChild(gameOverDiv); lobby.style.display = 'flex'; canvas.style.display = 'none'; updateLobbyUI(); }; 
    }
    // CAMBIO 12: Nueva función para dibujar el intermedio
    function drawIntermissionScreen() {
        const elapsedTime = Date.now() - intermissionData.startTime;
        const FADE_TIME = 1000;
        let alpha = 1;

        if (elapsedTime < FADE_TIME) {
            alpha = elapsedTime / FADE_TIME;
        } else if (elapsedTime > GAME_CONFIG.gameplay.intermissionDuration - FADE_TIME) {
            alpha = (GAME_CONFIG.gameplay.intermissionDuration - elapsedTime) / FADE_TIME;
        }
        
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.font = `bold ${48 * scaleFactor}px Arial`;
        ctx.fillText(intermissionData.name, canvas.width / 2, canvas.height / 2 - 30 * scaleFactor);
        
        ctx.font = `${32 * scaleFactor}px Arial`;
        ctx.fillText(`Puntos: ${intermissionData.score}`, canvas.width / 2, canvas.height / 2 + 30 * scaleFactor);
        ctx.globalAlpha = 1;
    }
    let endingState = { currentImage: 0, alpha: 0, phase: 'exploding', timer: 0 }; const endingTitles = [ "Space Pyramid Warrior Vs The Incectisoids from the 9th Dimension", "Producido por Zowie Pixel Arts", "Creación del Juego Javier Poggi", "Gracias por Jugar (˶˃ ᵕ ˂˶)" ]; function startEndingSequence() { playMusic(audioAssets.endingMusic); gameState = 'ENDING'; gameRunning = false; enemies = []; enemyBullets = []; asteroids = []; bosses = []; powerUps = []; let flashCount = 0; const flashInterval = setInterval(() => { triggerScreenFlash(150, 0.5); flashCount++; if (flashCount > 19) clearInterval(flashInterval); }, 200); setTimeout(() => { for (let i = 0; i < 20; i++) { setTimeout(() => { const exX = Math.random() * canvas.width; const exY = Math.random() * canvas.height; explosions.push(new Explosion(exX, exY, Math.random() * 200 + 100)); if (i % 2 === 0) { playSound(audioAssets.explosionLarge, 0.7); } }, i * 100); } }, 500); setTimeout(() => { endingState = { currentImage: 1, alpha: 0, phase: 'fade-in', timer: Date.now() }; requestAnimationFrame(endingLoop); }, 5000); } function endingLoop() { if (gameState !== 'ENDING' && gameState !== 'POST_ENDING') return; ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); stars.forEach(s => { s.update(0,0); s.draw(); }); explosions.forEach((ex, i) => { ex.update(); if (ex.life <= 0) explosions.splice(i, 1); else ex.draw(); }); const img = assets[`ending${endingState.currentImage}`]; if (img && gameState === 'ENDING') { const elapsedTime = Date.now() - endingState.timer; if (endingState.phase === 'fade-in') { endingState.alpha = Math.min(1, elapsedTime / 3000); if (endingState.alpha >= 1) { endingState.phase = 'hold'; endingState.timer = Date.now(); } } else if (endingState.phase === 'hold') { if (elapsedTime > 4000) { endingState.phase = 'fade-out'; endingState.timer = Date.now(); } } else if (endingState.phase === 'fade-out') { endingState.alpha = Math.max(0, 1 - (elapsedTime / 3000)); if (endingState.alpha <= 0) { endingState.currentImage++; if (assets[`ending${endingState.currentImage}`]) { endingState.phase = 'fade-in'; endingState.timer = Date.now(); } else { gameState = 'POST_ENDING'; for (let i = 0; i < 15; i++) { setTimeout(() => { const exX = Math.random() * canvas.width; const exY = Math.random() * canvas.height; explosions.push(new Explosion(exX, exY, Math.random() * 200 + 100)); }, i * 100); } setTimeout(showVictoryScreen, 3000); } } } ctx.globalAlpha = endingState.alpha; const scale = Math.min(canvas.width / img.width, canvas.height / img.height); const w = img.width * scale; const h = img.height * scale; ctx.drawImage(img, canvas.width/2 - w/2, canvas.height/2 - h/2, w, h); const titleIndex = endingState.currentImage - 1; if (endingTitles[titleIndex]) { const title = endingTitles[titleIndex]; ctx.fillStyle = 'white'; ctx.textAlign = 'center'; const fontSize = (titleIndex === 0) ? Math.max(24, Math.floor(canvas.width / 45)) : Math.max(32, Math.floor(canvas.width / 40)); ctx.font = `bold ${fontSize}px Arial`; ctx.shadowColor = 'black'; ctx.shadowBlur = 10; ctx.fillText(title, canvas.width / 2, canvas.height * 0.85); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; } ctx.globalAlpha = 1; } requestAnimationFrame(endingLoop); } function showVictoryScreen() { const victoryDiv = document.createElement('div'); victoryDiv.id = 'victoryScreen'; Object.assign(victoryDiv.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#fff', backgroundColor: 'rgba(0, 20, 0, 0.8)', padding: '40px', borderRadius: '10px', zIndex: '100', border: '2px solid #00ff00' }); victoryDiv.innerHTML = ` <h1 style="color: #00ff00; font-size: 3.5em; text-shadow: 2px 2px 8px #0f0;">¡VICTORIA!</h1> <p style="font-size: 1.8em;">Has derrotado a los insectoides de la 9ª Dimensión.</p> <p style="font-size: 1.5em;">Puntaje Final: ${score}</p> <button id="restartButton">Volver al Menú</button> `; gameContainer.appendChild(victoryDiv); const restartButton = document.getElementById('restartButton'); Object.assign(restartButton.style, { padding: '15px 30px', fontSize: '1.5em', cursor: 'pointer', backgroundColor: '#00ff00', color: '#000', border: 'none', borderRadius: '5px', marginTop: '20px' }); restartButton.onclick = () => { gameContainer.removeChild(victoryDiv); lobby.style.display = 'flex'; canvas.style.display = 'none'; updateLobbyUI(); }; }
    async function startGame(startProgressionIndex = 0) { lobby.innerHTML = '<h1>Cargando...</h1>'; try { await preloadAssets(); lobby.style.display = 'none'; canvas.style.display = 'flex'; initGame(startProgressionIndex); } catch (error) { lobby.innerHTML = `<h1>Error al cargar imágenes</h1><p>${error}</p>`; console.error("Error durante la precarga de assets:", error); } }
    function updateLobbyUI() {
        playMusic(audioAssets.introMusic);
        const highScore = localStorage.getItem('spaceShooterHighScore') || 0; const enemyHighScore = localStorage.getItem('spaceShooterEnemyHighScore') || 0; const bossHighScore = localStorage.getItem('spaceShooterBossHighScore') || 0;
        // CAMBIO 11: Márgenes reducidos en el HTML del lobby
        lobby.innerHTML = `
            <h1 style="font-size: 2.5em; line-height: 1.2; margin-bottom: 5px; text-align: center;">Space Pyramid Warrior...</h1>
            <h2 style="font-size: 1.5em; margin-bottom: 5px;">Puntaje Máximo: <span style="color: #00ff00;">${highScore}</span></h2>
            <h3 style="font-size: 1.2em; margin-top: 5px; margin-bottom: 5px;">Récord de Derribos: <span style="color: #00aaff;">${enemyHighScore}</span></h3>
            <h3 style="font-size: 1.2em; margin-top: 5px;">Récord de Jefes: <span style="color: #ffaa00;">${bossHighScore}</span></h3>
            <button id="startButton" style="margin-top: 15px; margin-bottom: 15px; padding: 15px 30px; font-size: 1.5em;">¡Comenzar Juego!</button>
            <div id="difficultySelector"></div><div id="soundControls"></div><div id="cheatContainer"></div>`;
        lobby.querySelector('#startButton').addEventListener('click', () => startGame());
        const difficultyContainer = lobby.querySelector('#difficultySelector'); const difficultyLabel = document.createElement('label'); difficultyLabel.htmlFor = 'difficultySlider'; difficultyLabel.id = 'difficultyLabel'; Object.assign(difficultyLabel.style, { display: 'block', marginBottom: '10px', fontSize: '1.2em', textAlign: 'center' }); const difficultySlider = document.createElement('input'); difficultySlider.type = 'range'; difficultySlider.id = 'difficultySlider'; difficultySlider.min = 0; difficultySlider.max = DIFFICULTY_SETTINGS.length - 1; difficultySlider.value = difficultyLevel; difficultySlider.style.width = '100%'; const updateDifficultyLabel = () => { difficultyLabel.textContent = `Dificultad: ${DIFFICULTY_SETTINGS[difficultyLevel].name}`; }; updateDifficultyLabel(); difficultySlider.addEventListener('input', (e) => { difficultyLevel = parseInt(e.target.value); updateDifficultyLabel(); }); difficultyContainer.appendChild(difficultyLabel); difficultyContainer.appendChild(difficultySlider);
        const soundControls = lobby.querySelector('#soundControls'); const buttonsContainer = document.createElement('div'); Object.assign(buttonsContainer.style, { display: 'flex', justifyContent: 'space-around', marginBottom: '15px' }); const musicButton = document.createElement('button'); musicButton.textContent = `Música: ${isMusicOn ? 'ON' : 'OFF'}`; musicButton.onclick = () => { isMusicOn = !isMusicOn; musicButton.textContent = `Música: ${isMusicOn ? 'ON' : 'OFF'}`; if(!isMusicOn){ playMusic(null); } else { playMusic(audioAssets.introMusic); } }; const sfxButton = document.createElement('button'); sfxButton.textContent = `SFX: ${isSfxOn ? 'ON' : 'OFF'}`; sfxButton.onclick = () => { isSfxOn = !isSfxOn; sfxButton.textContent = `SFX: ${isSfxOn ? 'ON' : 'OFF'}`; }; [musicButton, sfxButton].forEach(btn => { Object.assign(btn.style, { padding: '10px 20px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#333', color: '#fff', border: '1px solid #fff', borderRadius: '5px', flex: '1', margin: '0 5px' }); buttonsContainer.appendChild(btn); }); soundControls.appendChild(buttonsContainer);
        const createSlider = (labelText, volumeVar, callback) => { const container = document.createElement('div'); container.style.marginTop = '15px'; container.style.textAlign = 'center'; const label = document.createElement('label'); label.textContent = labelText; label.style.marginRight = '10px'; const slider = document.createElement('input'); slider.type = 'range'; slider.min = '0'; slider.max = '1'; slider.step = '0.05'; slider.value = volumeVar; slider.style.width = '70%'; slider.addEventListener('input', callback); container.appendChild(label); container.appendChild(slider); return container; };
        const musicSlider = createSlider('Volumen Música:', musicVolume, (e) => { musicVolume = parseFloat(e.target.value); if (audioAssets.introMusic && !audioAssets.introMusic.paused) { audioAssets.introMusic.volume = musicVolume; } }); const sfxSlider = createSlider('Volumen SFX:', sfxVolume, (e) => { sfxVolume = parseFloat(e.target.value); }); soundControls.appendChild(musicSlider); soundControls.appendChild(sfxSlider);
        const cheatContainer = lobby.querySelector('#cheatContainer'); const cheatToggleButton = document.createElement('button'); cheatToggleButton.textContent = `Cheat Mode: ${cheatModeActive ? 'ON' : 'OFF'}`; Object.assign(cheatToggleButton.style, { backgroundColor: cheatModeActive ? '#ff4444' : '#555', color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', marginBottom: '10px' }); cheatToggleButton.onclick = () => { cheatModeActive = !cheatModeActive; updateLobbyUI(); }; cheatContainer.appendChild(cheatToggleButton);
        if (cheatModeActive) { const cheatButtonsContainer = document.createElement('div'); cheatButtonsContainer.style.marginTop = '15px'; const createCheatButton = (text, index, isToggle = false) => { const button = document.createElement('button'); button.textContent = text; Object.assign(button.style, { margin: '5px', padding: '8px 12px', cursor: 'pointer', backgroundColor: '#8a2be2', color: 'white', border: 'none', borderRadius: '3px' }); if (isToggle) { button.style.backgroundColor = applyAllPowerupsCheat ? '#00ff00' : '#8a2be2'; button.onclick = () => { applyAllPowerupsCheat = !applyAllPowerupsCheat; updateLobbyUI(); }; } else { button.onclick = () => startFromCheat(index); } cheatButtonsContainer.appendChild(button); }; createCheatButton(`Empezar con Todo: ${applyAllPowerupsCheat ? 'ON' : 'OFF'}`, 0, true); createCheatButton('Super-Boss 1', bossProgression.length); createCheatButton('Giga-Boss', bossProgression.length + 4); createCheatButton('Final Boss', bossProgression.length + 5); cheatContainer.appendChild(cheatButtonsContainer); }
    }
    async function startFromCheat(progressionJumpIndex) { lobby.innerHTML = '<h1>Cargando...</h1>'; try { await preloadAssets(); if (isTouchDevice()) setupTouchControls(); initGame(progressionJumpIndex); gameState = 'METEOR_SHOWER'; handleGameStateChange(); lobby.style.display = 'none'; canvas.style.display = 'block'; } catch (error) { console.error("Error al iniciar con truco:", error); } }
    let introStartTime; async function initIntro() { appState = 'INTRO'; startScreen.style.display = 'none'; canvas.style.display = 'block'; await Promise.all([preloadAssets(), preloadAudio()]); if (isTouchDevice()) setupTouchControls(); introStartTime = Date.now(); playMusic(audioAssets.introMusic); introLoop(); } function introLoop() { if (appState !== 'INTRO') return; const elapsedTime = Date.now() - introStartTime; ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); if (assets.introScreen) { if (elapsedTime < 10000) { ctx.globalAlpha = (elapsedTime < 5000) ? (elapsedTime / 5000) : 1; } else if (elapsedTime < 11000) { ctx.globalAlpha = 1 - (elapsedTime - 10000) / 1000; if (elapsedTime % 200 < 50) { ctx.fillStyle = 'white'; ctx.fillRect(0,0,canvas.width, canvas.height); } if (!explosions.length) { createChainedExplosions({x: canvas.width/2, y: canvas.height/2, width: canvas.width, height: canvas.height}, true); } } else { appState = 'LOBBY'; canvas.style.display = 'none'; lobby.style.display = 'flex'; updateLobbyUI(); return; } const img = assets.introScreen; const startScale = 0.30; const endScale = 0.95; const animationDuration = 10000; let currentScale = startScale + (endScale - startScale) * (elapsedTime / animationDuration); currentScale = Math.min(currentScale, endScale); const newWidth = img.width * currentScale; const newHeight = img.height * currentScale; ctx.drawImage(img, canvas.width / 2 - newWidth / 2, canvas.height / 2 - newHeight / 2, newWidth, newHeight); ctx.globalAlpha = 1; } explosions.forEach((ex, i) => { ex.update(); ex.draw(); if (ex.life <= 0) explosions.splice(i, 1); }); requestAnimationFrame(introLoop); }
    
       document.addEventListener("keydown", function(event) {
  if (event.altKey && event.key.toLowerCase() === "x") {
    skipIntroToEnd();
  }
});

function skipIntroToEnd() {
  if (appState !== 'INTRO') return; // Solo funciona durante el intro
    
  // Detiene todos los procesos del intro
  appState = 'LOBBY';
  explosions = [];
  if (audioAssets.introMusic) audioAssets.introMusic.pause();
  
  // Transición al lobby
  canvas.style.display = 'none';
  lobby.style.display = 'flex';
  updateLobbyUI();
}

    function launchMissile() { if (player && gameRunning && !isPaused && missileCharges > 0) { const target = findNearestTarget(player.x, player.y); if (target) { missiles.push(new Missile(player.x + player.width / 2 - (10 * scaleFactor), player.y, target)); missileCharges--; playSound(audioAssets.missileLaunch); } } }
    window.addEventListener('keydown', (e) => { const key = e.key.toLowerCase(); keys[key] = true; if (key === ' ' && player && gameRunning && !isPaused) { player.shoot(); } if (key === 'control' && player && gameRunning && !isPaused) { e.preventDefault(); launchMissile(); } if (key === 'escape' && gameRunning) { togglePause(); } });
    window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
    let touchMoveX = 0, touchMoveY = 0, isShooting = false;
    function isTouchDevice() { return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0); }
    function setupTouchControls() { const joystick = document.createElement('div'); joystick.id = 'joystick'; const stick = document.createElement('div'); stick.id = 'stick'; joystick.appendChild(stick); gameContainer.appendChild(joystick); const actionButton = document.createElement('div'); actionButton.id = 'actionButton'; actionButton.className = 'touch-button'; gameContainer.appendChild(actionButton); const missileButton = document.createElement('div'); missileButton.id = 'missileButton'; missileButton.className = 'touch-button'; gameContainer.appendChild(missileButton); let joystickActive = false; let joystickStartX, joystickStartY; joystick.addEventListener('touchstart', (e) => { e.preventDefault(); joystickActive = true; const touch = e.changedTouches[0]; joystickStartX = touch.clientX; joystickStartY = touch.clientY; }, { passive: false }); joystick.addEventListener('touchmove', (e) => { e.preventDefault(); if (!joystickActive) return; const touch = e.changedTouches[0]; const deltaX = touch.clientX - joystickStartX; const deltaY = touch.clientY - joystickStartY; const maxDistance = joystick.offsetWidth / 3; const angle = Math.atan2(deltaY, deltaX); const distance = Math.hypot(deltaX, deltaY); const limitedDistance = Math.min(distance, maxDistance); const stickX = Math.cos(angle) * limitedDistance; const stickY = Math.sin(angle) * limitedDistance; stick.style.transform = `translate(${stickX}px, ${stickY}px)`; touchMoveX = (deltaX / maxDistance); touchMoveY = (deltaY / maxDistance); touchMoveX = Math.max(-1, Math.min(1, touchMoveX)); touchMoveY = Math.max(-1, Math.min(1, touchMoveY)); }, { passive: false }); const resetJoystick = () => { joystickActive = false; stick.style.transform = 'translate(0, 0)'; touchMoveX = 0; touchMoveY = 0; }; joystick.addEventListener('touchend', resetJoystick); joystick.addEventListener('touchcancel', resetJoystick); actionButton.addEventListener('touchstart', (e) => { e.preventDefault(); isShooting = true; }, { passive: false }); actionButton.addEventListener('touchend', () => { isShooting = false; }); missileButton.addEventListener('touchstart', (e) => { e.preventDefault(); launchMissile(); }, { passive: false }); }
    initButton.onclick = initIntro;
});
