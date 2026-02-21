import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, Entity, EntityType, InputState, AIResponse } from '../types';
import { 
  GRAVITY, FRICTION, WALK_SPEED, RUN_SPEED, WALK_ACCEL, RUN_ACCEL, JUMP_FORCE, 
  PLAYER_WIDTH, PLAYER_HEIGHT, COLORS,
  THROW_FORCE_X, THROW_FORCE_Y, VARIANT_COLORS, VARIANT_NAMES,
  ASSET_URLS,
  LEVELS, WASTE_EMOJIS, CANVAS_HEIGHT
} from '../constants';
import { Overlay } from './Overlay';
import { inspectObject } from '../services/geminiService';

const COYOTE_FRAMES = 8;
const JUMP_BUFFER_FRAMES = 8;

const checkCollision = (r1: Entity, r2: Entity): boolean => {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
};

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<Record<string, HTMLImageElement>>({});
  const [aiState, setAiState] = useState<AIResponse>({ text: '', loading: false, visible: false });
  const [gameState, setGameState] = useState<{
      level: number, 
      levelComplete: boolean, 
      gameComplete: boolean, 
      gameOver: boolean,
      zoneProgress: number[] 
  }>({
      level: 1,
      levelComplete: false,
      gameComplete: false,
      gameOver: false,
      zoneProgress: [0, 0, 0, 0]
  });

  // Load Assets
  useEffect(() => {
      const load = (key: string, url: string) => {
          const img = new Image();
          img.src = url;
          assetsRef.current[key] = img;
      };

      Object.entries(ASSET_URLS.backgrounds).forEach(([k, v]) => load(k, v));
      Object.entries(ASSET_URLS.platforms).forEach(([k, v]) => load(k, v));
      Object.entries(ASSET_URLS.objects).forEach(([k, v]) => load(k, v));
  }, []);

  // Game State Ref

  // Game State Ref
  const stateRef = useRef<GameState>({
    player: {
      id: 'player', type: EntityType.PLAYER, x: 0, y: 0, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, 
      color: COLORS.player, vx: 0, vy: 0, facing: 1, isGrounded: false 
    },
    camera: { x: 0, y: 0 },
    platforms: [],
    boxes: [],
    goals: [],
    npcs: [],
    signs: [],
    score: 0,
    level: 1,
    levelComplete: false,
    gameComplete: false,
    gameOver: false,
    zoneProgress: [0, 0, 0, 0]
  });

  const inputRef = useRef<InputState>({
    left: false, right: false, up: false, down: false, run: false, interact: false, talk: false, inspect: false
  });

  const lastInputRef = useRef<InputState>({ ...inputRef.current });
  const interactLogicRef = useRef({ pressTime: 0, consumed: false });
  const jumpLogicRef = useRef({ 
      coyoteTimer: 0, 
      jumpBufferTimer: 0,
      jumpRequest: false 
  });

  // Function to Load a Level
  const loadLevel = useCallback((levelIndex: number) => {
    if (levelIndex < 0 || levelIndex >= LEVELS.length) return;

    const config = LEVELS[levelIndex];
    const state = stateRef.current;
    
    // Reset Player
    state.player.x = config.playerStart.x;
    state.player.y = config.playerStart.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.heldBy = undefined;
    state.player.isGrounded = false;

    // Load Level Entities
    state.platforms = [...config.platforms];
    state.goals = [...config.goals];
    state.boxes = config.boxes.map((b, i) => {
        const variant = b.variant;
        const emojis = WASTE_EMOJIS[variant];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        return {
            id: `b-${levelIndex}-${i}`,
            type: EntityType.BOX,
            variant: variant,
            x: b.x,
            y: b.y,
            w: 40,
            h: 40,
            color: VARIANT_COLORS[variant],
            content: emoji,
            vx: 0, 
            vy: 0,
            facing: 0,
            isGrounded: false
        };
    });

    // Load NPCs
    state.npcs = (config.npcs || []).map((n, i) => ({
        id: `npc-${levelIndex}-${i}`,
        type: EntityType.NPC,
        x: n.x,
        y: n.y,
        w: 40,
        h: 60,
        color: COLORS.npc,
        vx: 0,
        vy: 0,
        facing: 1,
        isGrounded: true
    }));

    // Load Signs
    state.signs = (config.signs || []).map((s, i) => ({
        id: `sign-${levelIndex}-${i}`,
        type: EntityType.SIGN,
        x: s.x,
        y: s.y,
        w: 40,
        h: 40,
        color: COLORS.sign,
        content: s.text,
        vx: 0,
        vy: 0,
        facing: 1,
        isGrounded: true
    }));

    const boxesPerType = [0, 0, 0, 0];
    config.boxes.forEach(b => boxesPerType[b.variant]++);
    state.zoneProgress = boxesPerType;

    state.level = levelIndex + 1;
    state.levelComplete = false;
    state.gameComplete = false;
    state.gameOver = false;

    // Reset Jump Logic
    jumpLogicRef.current.coyoteTimer = 0;
    jumpLogicRef.current.jumpBufferTimer = 0;
    jumpLogicRef.current.jumpRequest = false;

    setGameState({
        level: levelIndex + 1,
        levelComplete: false,
        gameComplete: false,
        gameOver: false,
        zoneProgress: boxesPerType
    });
  }, []);

  const handleNextLevel = useCallback(() => {
      const nextLevelIndex = stateRef.current.level; 
      if (nextLevelIndex < LEVELS.length) {
          loadLevel(nextLevelIndex);
      } else {
          stateRef.current.gameComplete = true;
          setGameState(prev => ({ ...prev, gameComplete: true }));
      }
  }, [loadLevel]);

  const handleReset = useCallback(() => {
      // Reload current level
      loadLevel(stateRef.current.level - 1);
  }, [loadLevel]);

  // Initial Load
  useEffect(() => {
    loadLevel(0);
  }, [loadLevel]);

  const handleInspect = useCallback(async () => {
    const { player, boxes } = stateRef.current;
    
    let closestBox: Entity | null = null;
    let minDist = 150; 

    const targetBox = boxes.find(b => b.heldBy === player.id);
    if (targetBox) {
        closestBox = targetBox;
    } else {
        boxes.forEach(box => {
            const dx = (box.x + box.w/2) - (player.x + player.w/2);
            const dy = (box.y + box.h/2) - (player.y + player.h/2);
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist) {
                minDist = dist;
                closestBox = box;
            }
        });
    }

    if (!closestBox) {
        setAiState({ visible: true, loading: false, text: "ไม่พบขยะในบริเวณใกล้เคียง" });
        return;
    }

    const variant = closestBox.variant || 0;
    let title = "ตรวจสอบขยะ";
    let description = "";

    switch (variant) {
        case 0: // Hazardous (Red)
            title = "ขยะสีแดงหรือขยะอันตราย";
            description = " -  ขยะที่มีองค์ประกอบปนเปื้อนวัตถุมีพิษ วัตถุไวไฟ หรือติดเชื้อ ซึ่งอาจส่งผลต่อคน สัตว์ และสิ่งแวดล้อม\nตัวอย่าง: ถ่านไฟฉาย, หลอดไฟ, แบตเตอรี เป็นต้น";
            break;
        case 1: // General (Blue)
            title = "ขยะสีฟ้าหรือขยะทั่วไป";
            description = " - คือขยะที่ไม่คุ้มค่าในการนำกลับมาใช้ใหม่ หรือย่อยสลายยาก\nตัวอย่าง: ซองขนม, ถุงพลาสติกเปื้อนอาหาร, กล่องโฟม เป็นต้น";
            break;
        case 2: // Organic (Green)
            title = "ขยะสีเขียวหรือขยะอินทรีย์";
            description = "  - คือขยะที่เน่าเสียและย่อยสลายได้ง่ายตามธรรมชาติ มีความชื้นสูง\nตัวอย่าง: เศษอาหาร, เปลือกผลไม้, เศษผัก เป็นต้น";
            break;
        case 3: // Recycle (Yellow)
            title = "ขยะสีเหลืองหรือขยะรีไซเคิล";
            description = " -  ขยะเหลือใช้ที่ยังมีประโยชน์ สามารถนำกลับมาแปรรูปใช้ใหม่ได้ (Recycle)\nตัวอย่าง: ขวดแก้ว, กระดาษ, กระป๋องเครื่องดื่ม, เศษโลหะ เป็นต้น";
            break;
    }
    
    setAiState({ visible: true, loading: false, text: description, title: title });

  }, []);

  const handleNPCInteraction = useCallback((npc: Entity) => {
      const dialogue = "การแยกขยะง่ายนิดเดียวลูก จำไว้ว่าสีเหลืองคือรีไซเคิล สีเขียวคือเศษอาหาร สีน้ำเงินคือขยะทั่วไป และสีแดงคือของอันตรายอย่างถ่านไฟฉายนะจ๊ะ ถ้าพวกเราช่วยกันคัดแยกก่อนทิ้ง หมู่บ้านของเราก็จะสะอาดและน่าอยู่ไปอีกนานเลยล่ะลูก";
      setAiState({ visible: true, loading: false, text: dialogue, title: "Village Headman" });
  }, []);

  // Update Logic
  const update = useCallback(() => {
    const state = stateRef.current;
    if (state.levelComplete || state.gameComplete || state.gameOver) return;

    const input = inputRef.current;
    const lastInput = lastInputRef.current;
    const jumpLogic = jumpLogicRef.current;
    const { player, platforms, boxes, goals, npcs, signs } = state;

    // --- GAME OVER CHECK ---
    if (player.y > CANVAS_HEIGHT + 200) {
        state.gameOver = true;
        setGameState(prev => ({ ...prev, gameOver: true }));
        return;
    }

    // --- PLAYER PHYSICS ---
    // Calculate Speed based on Run Input (Down Arrow or Shift)
    const isRunning = input.down || input.run;
    const currentAccel = isRunning ? RUN_ACCEL : WALK_ACCEL;
    const currentMaxSpeed = isRunning ? RUN_SPEED : WALK_SPEED;

    if (input.left) {
        player.vx -= currentAccel;
        player.facing = -1;
    }
    if (input.right) {
        player.vx += currentAccel;
        player.facing = 1;
    }

    // Apply friction (less in air for better control)
    const currentFriction = player.isGrounded ? FRICTION : 0.95;
    player.vx *= currentFriction;
    
    if (player.vx > currentMaxSpeed) player.vx = currentMaxSpeed;
    if (player.vx < -currentMaxSpeed) player.vx = -currentMaxSpeed;

    player.vy += GRAVITY;

    // --- JUMPING LOGIC (Enhanced) ---
    if (player.isGrounded) {
        jumpLogic.coyoteTimer = COYOTE_FRAMES;
    } else {
        if (jumpLogic.coyoteTimer > 0) jumpLogic.coyoteTimer--;
    }

    if (jumpLogic.jumpRequest) {
        jumpLogic.jumpBufferTimer = JUMP_BUFFER_FRAMES;
        jumpLogic.jumpRequest = false; 
    } else {
        if (jumpLogic.jumpBufferTimer > 0) jumpLogic.jumpBufferTimer--;
    }

    if (jumpLogic.jumpBufferTimer > 0 && jumpLogic.coyoteTimer > 0) {
        player.vy = JUMP_FORCE;
        player.isGrounded = false;
        jumpLogic.coyoteTimer = 0; 
        jumpLogic.jumpBufferTimer = 0; 
    }

    if (!input.up && player.vy < -3) {
        player.vy = -3;
    }

    // --- NPC PHYSICS ---
    npcs.forEach(npc => {
        npc.vy += GRAVITY;
        npc.y += npc.vy;
        npc.isGrounded = false;

        for (const plat of platforms) {
            if (checkCollision(npc, plat)) {
                if (npc.vy > 0) {
                    npc.y = plat.y - npc.h;
                    npc.isGrounded = true;
                    npc.vy = 0;
                } else if (npc.vy < 0) {
                    npc.y = plat.y + plat.h;
                    npc.vy = 0;
                }
            }
        }
    });

    // --- MOVEMENT INTEGRATION ---
    player.x += player.vx;
    
    // Collisions X
    const activeBoxes = boxes.filter(b => b.heldBy !== player.id);
    const playerObstacles = [...platforms, ...activeBoxes];

    for (const obstacle of playerObstacles) {
      if (checkCollision(player, obstacle)) {
        if (player.vx > 0) player.x = obstacle.x - player.w;
        else if (player.vx < 0) player.x = obstacle.x + obstacle.w;
        player.vx = 0;
      }
    }

    player.y += player.vy;
    player.isGrounded = false;

    // Collisions Y
    for (const obstacle of playerObstacles) {
      if (checkCollision(player, obstacle)) {
        if (player.vy > 0) {
          player.y = obstacle.y - player.h;
          player.isGrounded = true;
          player.vy = 0;
        } else if (player.vy < 0) {
          player.y = obstacle.y + obstacle.h;
          player.vy = 0; 
        }
      }
    }

    // --- INTERACTION LOGIC ---
    const now = Date.now();
    const isInteracting = input.interact;
    const wasInteracting = lastInput.interact;
    const isTalking = input.talk;
    const wasTalking = lastInput.talk;
    const heldBox = boxes.find(b => b.heldBy === player.id);

    // TALK / READ (F)
    if (isTalking && !wasTalking) {
        // Check NPC Interaction
        const nearbyNPC = npcs.find(n => {
            const dx = (n.x + n.w/2) - (player.x + player.w/2);
            const dy = (n.y + n.h/2) - (player.y + player.h/2);
            return Math.sqrt(dx*dx + dy*dy) < 80;
        });

        // Check Sign Interaction
        const nearbySign = signs.find(s => {
            const dx = (s.x + s.w/2) - (player.x + player.w/2);
            const dy = (s.y + s.h/2) - (player.y + player.h/2);
            return Math.sqrt(dx*dx + dy*dy) < 80;
        });

        if (nearbyNPC) {
            handleNPCInteraction(nearbyNPC);
        } else if (nearbySign) {
            setAiState({ 
                visible: true, 
                loading: false, 
                text: nearbySign.content || "...", 
                title: "Did you know?" 
            });
        }
    }

    // GRAB / THROW (E)
    if (isInteracting && !wasInteracting) {
        interactLogicRef.current.pressTime = now;
        interactLogicRef.current.consumed = false;

        if (!heldBox) {
            const reach = 60;
            const boxToGrab = boxes.find(b => {
                const cx = b.x + b.w/2;
                const cy = b.y + b.h/2;
                const px = player.x + player.w/2;
                const py = player.y + player.h/2;
                return Math.sqrt((cx-px)**2 + (cy-py)**2) < reach;
            });

            if (boxToGrab) {
                boxToGrab.heldBy = player.id;
                interactLogicRef.current.consumed = true;
            }
        }
    }

    if (!isInteracting && wasInteracting) {
        if (heldBox && !interactLogicRef.current.consumed) {
            const duration = now - interactLogicRef.current.pressTime;
            heldBox.heldBy = undefined;
            
            let placeX = player.x + (player.w/2) - (heldBox.w/2);
            placeX += player.facing * (player.w/2 + heldBox.w/2 + 5);
            const placeY = player.y + player.h - heldBox.h;

            if (duration < 250) {
                // Place
                heldBox.vx = 0;
                heldBox.vy = 0;
                heldBox.x = placeX;
                heldBox.y = placeY;

                const testBox = { ...heldBox, x: placeX, y: placeY };
                const hasCollision = platforms.some(p => checkCollision(testBox, p));
                if (hasCollision) {
                    heldBox.x = player.x + (player.w - heldBox.w) / 2;
                    heldBox.y = player.y + player.h - heldBox.h;
                }
            } else {
                // Throw
                heldBox.vx = player.vx + (player.facing * THROW_FORCE_X);
                heldBox.vy = THROW_FORCE_Y;
                heldBox.x = placeX;
                heldBox.y = player.y - 10;
            }
        }
    }

    if (input.inspect && !lastInput.inspect) {
        handleInspect();
    }

    // --- BOX LOGIC & PROGRESS ---
    const boxesToRemove: string[] = [];
    const remainingCount = [0, 0, 0, 0];

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];

      if (box.heldBy === player.id) {
        box.vx = 0;
        box.vy = 0;
        box.x = player.x + (player.w - box.w) / 2;
        box.y = player.y - box.h;
      } else {
        box.vy += GRAVITY;
        box.vx *= 0.9;
        
        box.x += box.vx;
        for (const plat of platforms) {
          if (checkCollision(box, plat)) {
            if (box.vx > 0) box.x = plat.x - box.w;
            else if (box.vx < 0) box.x = plat.x + plat.w;
            box.vx *= -0.5;
          }
        }
        for (let j = 0; j < boxes.length; j++) {
            if (i === j) continue;
            const other = boxes[j];
            if (other.heldBy) continue; 
            if (checkCollision(box, other)) {
                if (box.vx > 0) box.x = other.x - box.w;
                else if (box.vx < 0) box.x = other.x + other.w;
                box.vx *= -0.5;
            }
        }

        box.y += box.vy;
        for (const plat of platforms) {
          if (checkCollision(box, plat)) {
            if (box.vy > 0) {
              box.y = plat.y - box.h;
              box.vy = 0;
            } else if (box.vy < 0) {
              box.y = plat.y + plat.h;
              box.vy = 0;
            }
          }
        }
        for (let j = 0; j < boxes.length; j++) {
            if (i === j) continue;
            const other = boxes[j];
            if (other.heldBy) continue; 
            if (checkCollision(box, other)) {
                if (box.vy > 0) {
                    box.y = other.y - box.h;
                    box.vy = 0;
                    box.vx *= 0.9;
                } else if (box.vy < 0) {
                    box.y = other.y + other.h;
                    box.vy = 0;
                }
            }
        }
      }

      if (box.variant !== undefined) {
         const matchingGoal = goals.find(g => g.variant === box.variant && checkCollision(box, g));
         if (matchingGoal && !box.heldBy) {
             boxesToRemove.push(box.id);
         } else {
             remainingCount[box.variant]++;
         }
      }
    }

    if (boxesToRemove.length > 0) {
        state.boxes = state.boxes.filter(b => !boxesToRemove.includes(b.id));
        // Only update UI if boxes were removed (progress changed)
        setGameState(prev => ({ 
            ...prev, 
            zoneProgress: remainingCount 
        }));
    }

    state.zoneProgress = remainingCount;
    const allSorted = remainingCount.every(c => c === 0);

    if (allSorted && !state.levelComplete) {
        state.levelComplete = true;
        setGameState(prev => ({ 
            ...prev, 
            levelComplete: true, 
            zoneProgress: remainingCount 
        }));
    }

    const targetCamX = player.x + player.w / 2 - window.innerWidth / 2;
    state.camera.x += (targetCamX - state.camera.x) * 0.1; 

    lastInputRef.current = { ...input };

  }, [handleInspect, handleNPCInteraction]);

  // Render Logic
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { player, platforms, boxes, camera, goals, npcs, signs } = stateRef.current;
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // --- VILLAGE BACKGROUND ---
    const bgKey = `level${stateRef.current.level}`;
    const bgImg = assetsRef.current[bgKey];
    
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        gradient.addColorStop(0, '#87CEEB'); // Sky Blue
        gradient.addColorStop(1, '#E0F7FA'); // Light Cyan
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    ctx.save();
    // Parallax Mountains (Only if no BG image, or maybe overlay?)
    if (!bgImg || !bgImg.complete || bgImg.naturalWidth === 0) {
        ctx.translate(-camera.x * 0.2, 0);
        ctx.fillStyle = '#94a3b8'; // Slate 400
        ctx.beginPath();
        ctx.moveTo(0, 800);
        ctx.lineTo(200, 400);
        ctx.lineTo(500, 700);
        ctx.lineTo(800, 300);
        ctx.lineTo(1200, 800);
        ctx.fill();
        
        ctx.fillStyle = '#64748b'; // Slate 500
        ctx.beginPath();
        ctx.moveTo(600, 800);
        ctx.lineTo(900, 500);
        ctx.lineTo(1300, 800);
        ctx.fill();
        ctx.restore(); // Restore from parallax
    } else {
        ctx.restore(); // Just restore the save() from before parallax
    }

    // Village Houses (Background Layer)
    ctx.save();
    ctx.translate(-camera.x * 0.5, 0);

    // Only draw procedural houses if no BG image
    if (!bgImg || !bgImg.complete || bgImg.naturalWidth === 0) {
        // Green Hills (Moved to same layer as houses)
        ctx.fillStyle = '#86efac'; // Light Green
        ctx.beginPath();
        ctx.moveTo(-200, 800);
        ctx.bezierCurveTo(200, 600, 600, 750, 1000, 650);
        ctx.bezierCurveTo(1400, 550, 1800, 700, 2200, 800);
        ctx.lineTo(2200, 800);
        ctx.lineTo(-200, 800);
        ctx.fill();

        ctx.fillStyle = '#4ade80'; // Green
        ctx.beginPath();
        ctx.moveTo(-100, 800);
        ctx.bezierCurveTo(300, 700, 700, 600, 1200, 750);
        ctx.bezierCurveTo(1600, 850, 2000, 650, 2500, 800);
        ctx.lineTo(2500, 800);
        ctx.lineTo(-100, 800);
        ctx.fill();
        
        // Draw simple Thai style houses on stilts
        const drawHouse = (x: number, y: number) => {
            // Stilts
            ctx.fillStyle = '#78350f'; // Wood
            ctx.fillRect(x + 10, y + 60, 10, 40);
            ctx.fillRect(x + 80, y + 60, 10, 40);
            
            // Main body
            ctx.fillStyle = '#b45309'; // Lighter Wood
            ctx.fillRect(x, y, 100, 60);
            
            // Roof
            ctx.fillStyle = '#7f1d1d'; // Reddish Roof
            ctx.beginPath();
            ctx.moveTo(x - 10, y);
            ctx.lineTo(x + 50, y - 40);
            ctx.lineTo(x + 110, y);
            ctx.fill();

            // Window
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(x + 30, y + 20, 40, 20);
        };

        // Draw a few houses repeating
        for (let i = -1; i < 5; i++) {
            drawHouse(i * 600 + 200, 450);
            drawHouse(i * 600 + 500, 480);
        }
        
        // Trees
        const drawTree = (x: number, y: number) => {
            ctx.fillStyle = '#5D4037'; // Trunk
            ctx.fillRect(x + 15, y + 50, 20, 50);
            
            ctx.fillStyle = '#2E7D32'; // Leaves
            ctx.beginPath();
            ctx.arc(x + 25, y + 50, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 5, y + 30, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 45, y + 30, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 25, y + 10, 30, 0, Math.PI * 2);
            ctx.fill();
        };

        for (let i = -1; i < 5; i++) {
            drawTree(i * 400 + 100, 500);
        }
    }

    ctx.restore();

    ctx.save();
    ctx.translate(-camera.x, 0);

    // Draw Goals
    goals.forEach(g => {
        ctx.fillStyle = g.color;
        ctx.fillRect(g.x, g.y + 20, g.w, g.h - 20);
        
        ctx.fillStyle = g.color.replace('0.2)', '0.6)');
        ctx.fillRect(g.x - 5, g.y, g.w + 10, 20); 

        ctx.font = '30px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icon = WASTE_EMOJIS[g.variant || 0][0];
        ctx.fillText(icon, g.x + g.w/2, g.y + g.h/2 + 10);
        
        ctx.fillStyle = g.color.replace('0.2)', '1)');
        ctx.font = 'bold 14px sans-serif';
        const name = VARIANT_NAMES[g.variant || 0];
        ctx.fillText(`${name} ZONE`, g.x + g.w/2, g.y - 15);
    });

    // Draw Platforms
    platforms.forEach(p => {
      // Skip drawing invisible walls (boundaries)
      if (p.id.startsWith('w')) return;

      const grassImg = assetsRef.current['grass'];
      if (grassImg && grassImg.complete && grassImg.naturalWidth > 0) {
          const pattern = ctx.createPattern(grassImg, 'repeat');
          if (pattern) {
              ctx.save();
              ctx.fillStyle = pattern;
              ctx.translate(p.x, p.y); // Align pattern
              ctx.fillRect(0, 0, p.w, p.h);
              ctx.restore();
          } else {
              // Fallback
              ctx.fillStyle = '#78350f';
              ctx.fillRect(p.x, p.y, p.w, p.h);
          }
      } else {
          // Soil Body
          ctx.fillStyle = '#78350f'; // Brown soil
          ctx.fillRect(p.x, p.y, p.w, p.h);
          
          // Grass Top
          ctx.fillStyle = '#4ade80'; // Green grass
          ctx.fillRect(p.x, p.y, p.w, 15); // Thicker grass layer
          
          // Grass overhang details
          ctx.fillStyle = '#4ade80';
          for(let i = 0; i < p.w; i += 20) {
              ctx.beginPath();
              ctx.arc(p.x + i + 10, p.y + 15, 8, 0, Math.PI);
              ctx.fill();
          }
      }

      // Border
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    });

    // Draw NPCs
    npcs.forEach(n => {
        // Draw NPC Body
        ctx.fillStyle = n.color;
        ctx.fillRect(n.x, n.y, n.w, n.h);

        // Draw Head
        ctx.fillStyle = '#fca5a5'; // Skin tone
        ctx.fillRect(n.x + 5, n.y - 15, 30, 20);

        // Draw Hat (Village Headman Hat)
        ctx.fillStyle = '#854d0e'; // Brown Hat
        ctx.beginPath();
        ctx.moveTo(n.x - 5, n.y - 10);
        ctx.lineTo(n.x + 45, n.y - 10);
        ctx.lineTo(n.x + 20, n.y - 30);
        ctx.fill();

        // Draw "!" if player is close
        const dist = Math.sqrt((player.x - n.x)**2 + (player.y - n.y)**2);
        if (dist < 150) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('!', n.x + n.w/2, n.y - 40);
        }
    });

    // Draw Signs
    signs.forEach(s => {
        // Post
        ctx.fillStyle = '#5c3a21'; // Dark Wood
        ctx.fillRect(s.x + 15, s.y + 20, 10, 20);
        
        // Board
        ctx.fillStyle = s.color; // Wood
        ctx.fillRect(s.x, s.y, s.w, 25);
        
        // Border
        ctx.strokeStyle = '#3f2613';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x, s.y, s.w, 25);

        // Text lines simulation
        ctx.fillStyle = '#3f2613';
        ctx.fillRect(s.x + 5, s.y + 8, 30, 2);
        ctx.fillRect(s.x + 5, s.y + 15, 20, 2);

        // Draw "?" if player is close
        const dist = Math.sqrt((player.x - s.x)**2 + (player.y - s.y)**2);
        if (dist < 100) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('?', s.x + s.w/2, s.y - 20);
        }
    });

    // Draw Boxes
    boxes.forEach(b => {
      const crateImg = assetsRef.current['crate'];
      if (crateImg && crateImg.complete && crateImg.naturalWidth > 0) {
          ctx.drawImage(crateImg, b.x, b.y, b.w, b.h);
          
          // Tint with variant color
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.restore();

          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x, b.y, b.w, b.h);

          if (b.heldBy) {
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 3;
              ctx.strokeRect(b.x, b.y, b.w, b.h);
          }
      } else {
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w, b.h, 8);
          ctx.fill();
          
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 2;
          ctx.stroke();

          if (b.heldBy) {
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 3;
              ctx.stroke();
          }
      }

      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000'; 
      if (b.content) {
          ctx.fillText(b.content, b.x + b.w/2, b.y + b.h/2);
      }
    });

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
    
    ctx.fillStyle = 'white';
    const eyeOffsetX = player.facing === 1 ? 25 : 5;
    ctx.fillRect(player.x + eyeOffsetX, player.y + 10, 10, 10);
    
    // Speed lines if running
    if ((inputRef.current.down || inputRef.current.run) && Math.abs(player.vx) > 3) {
         ctx.strokeStyle = 'rgba(255,255,255,0.5)';
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.moveTo(player.x - 10 * player.facing, player.y + 10);
         ctx.lineTo(player.x - 30 * player.facing, player.y + 10);
         ctx.moveTo(player.x - 10 * player.facing, player.y + 40);
         ctx.lineTo(player.x - 25 * player.facing, player.y + 40);
         ctx.stroke();
    }

    const holding = boxes.some(b => b.heldBy === player.id);
    if (holding) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(player.x + player.w/2 - 10, player.y + 20);
        ctx.lineTo(player.x + player.w/2 - 10, player.y - 5);
        ctx.moveTo(player.x + player.w/2 + 10, player.y + 20);
        ctx.lineTo(player.x + player.w/2 + 10, player.y - 5);
        ctx.stroke();
    }
    
    if (inputRef.current.interact && holding && !interactLogicRef.current.consumed) {
        const pressDuration = Date.now() - interactLogicRef.current.pressTime;
        const progress = Math.min(pressDuration / 250, 1);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(player.x, player.y - 15, player.w, 5);
        
        ctx.fillStyle = progress >= 1 ? '#ef4444' : '#fbbf24'; 
        ctx.fillRect(player.x, player.y - 15, player.w * progress, 5);
    }

    ctx.restore();

  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const loop = () => {
      update();
      draw(ctx);
      animationFrameId = window.requestAnimationFrame(loop);
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    loop();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [draw, update]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA': inputRef.current.left = true; break;
        case 'ArrowRight':
        case 'KeyD': inputRef.current.right = true; break;
        case 'ArrowUp':
        case 'Space': 
            inputRef.current.up = true; 
            jumpLogicRef.current.jumpRequest = true;
            break;
        case 'ArrowDown':
        case 'KeyS': inputRef.current.down = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': inputRef.current.run = true; break;
        case 'KeyE': inputRef.current.interact = true; break;
        case 'KeyF': inputRef.current.talk = true; break;
        case 'KeyI': inputRef.current.inspect = true; break;
        case 'KeyR': handleReset(); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA': inputRef.current.left = false; break;
        case 'ArrowRight':
        case 'KeyD': inputRef.current.right = false; break;
        case 'ArrowUp':
        case 'Space': inputRef.current.up = false; break;
        case 'ArrowDown':
        case 'KeyS': inputRef.current.down = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': inputRef.current.run = false; break;
        case 'KeyE': inputRef.current.interact = false; break;
        case 'KeyF': inputRef.current.talk = false; break;
        case 'KeyI': inputRef.current.inspect = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleReset]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">
      <canvas ref={canvasRef} className="w-full h-full" />
      <Overlay 
        aiState={aiState} 
        level={gameState.level}
        maxLevels={LEVELS.length}
        zoneProgress={gameState.zoneProgress}
        levelComplete={gameState.levelComplete}
        gameComplete={gameState.gameComplete}
        gameOver={gameState.gameOver}
        onCloseAI={() => setAiState(prev => ({ ...prev, visible: false }))} 
        onNextLevel={handleNextLevel}
        onReset={handleReset}
      />
    </div>
  );
};