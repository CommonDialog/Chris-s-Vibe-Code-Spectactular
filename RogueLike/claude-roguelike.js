import React, { useState, useEffect, useCallback } from 'react';

const MechaRoguelike = () => {
  // Game state
  const [gameState, setGameState] = useState('menu'); // menu, playing, dead, victory
  const [level, setLevel] = useState(1);
  const [map, setMap] = useState([]);
  const [player, setPlayer] = useState({
    x: 1,
    y: 1,
    pilot: {
      name: 'Rookie',
      experience: 0,
      level: 1,
      health: 100,
      maxHealth: 100
    },
    mecha: {
      weapons: { damage: 10, accuracy: 80, range: 1 },
      armor: { defense: 5, durability: 100, maxDurability: 100 },
      sensors: { range: 1, detection: 70 },
      movement: { speed: 1, fuel: 100, maxFuel: 100 }
    }
  });
  const [enemies, setEnemies] = useState([]);
  const [items, setItems] = useState([]);
  const [gameLog, setGameLog] = useState(['Welcome to Mecha Dungeon Delver!']);
  const [savedGames, setSavedGames] = useState([]);

  // Game constants
  const ENEMY_TYPES = {
    drone: { char: 'd', health: 20, damage: 5, defense: 0, exp: 10, color: '#666' },
    battle: { char: 'B', health: 40, damage: 12, defense: 3, exp: 25, color: '#c44' },
    assault: { char: 'A', health: 60, damage: 18, defense: 5, exp: 40, color: '#a22' },
    boss: { char: 'X', health: 150, damage: 25, defense: 8, exp: 100, color: '#f44' }
  };

  const ITEM_TYPES = {
    repair: { char: '+', name: 'Repair Kit', effect: 'heal', value: 30, color: '#4f4' },
    weapon: { char: '+', name: 'Weapon Upgrade', effect: 'weapon', value: 5, color: '#4f4' },
    armor: { char: '+', name: 'Armor Plating', effect: 'armor', value: 3, color: '#4f4' },
    fuel: { char: '+', name: 'Fuel Cell', effect: 'fuel', value: 50, color: '#4f4' }
  };

  // Initialize game
  const initializeGame = useCallback(() => {
    const mapWidth = Math.min(15 + level - 1, 25);
    const mapHeight = Math.min(10 + Math.floor(level / 2), 18);
    
    // Create empty map
    const newMap = Array(mapHeight).fill().map(() => Array(mapWidth).fill('.'));
    
    // Add walls around border
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        if (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1) {
          newMap[y][x] = '#';
        }
      }
    }
    
    // Add some random walls, but ensure clear path to exit
    for (let i = 0; i < Math.floor(mapWidth * mapHeight * 0.08); i++) {
      const x = Math.floor(Math.random() * (mapWidth - 4)) + 2; // Avoid edges and near start/exit
      const y = Math.floor(Math.random() * (mapHeight - 4)) + 2;
      // Don't place walls that would block the general path from start to exit
      if (!(x === mapWidth - 2 && y === mapHeight - 2) && !(x === 1 && y === 1)) {
        newMap[y][x] = '#';
      }
    }
    
    // Ensure exit area is clear
    const exitX = mapWidth - 2;
    const exitY = mapHeight - 2;
    newMap[exitY][exitX] = '>';
    // Clear area around exit
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const clearX = exitX + dx;
        const clearY = exitY + dy;
        if (clearX > 0 && clearX < mapWidth - 1 && clearY > 0 && clearY < mapHeight - 1) {
          if (newMap[clearY][clearX] === '#') {
            newMap[clearY][clearX] = '.';
          }
        }
      }
    }
    
    // Ensure start area is clear
    for (let dy = 0; dy <= 2; dy++) {
      for (let dx = 0; dx <= 2; dx++) {
        if (1 + dx < mapWidth - 1 && 1 + dy < mapHeight - 1) {
          if (newMap[1 + dy][1 + dx] === '#') {
            newMap[1 + dy][1 + dx] = '.';
          }
        }
      }
    }
    
    setMap(newMap);
    
    // Reset player position and fuel management
    setPlayer(prev => ({ 
      ...prev, 
      x: 1, 
      y: 1,
      mecha: {
        ...prev.mecha,
        movement: {
          ...prev.mecha.movement,
          fuel: level === 1 ? prev.mecha.movement.maxFuel : 
                Math.min(prev.mecha.movement.maxFuel, prev.mecha.movement.fuel + 20)
        }
      }
    }));
    
    // Generate enemies
    const isBossLevel = level % 5 === 0;
    const enemyCount = isBossLevel ? 1 : Math.floor(3 + level * 0.5);
    const newEnemies = [];
    
    for (let i = 0; i < enemyCount; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * (mapWidth - 2)) + 1;
        y = Math.floor(Math.random() * (mapHeight - 2)) + 1;
      } while (newMap[y][x] === '#' || (x === 1 && y === 1) || (x === exitX && y === exitY) || 
               (Math.abs(x - 1) + Math.abs(y - 1) < 3)); // Keep enemies away from start
      
      let enemyType;
      if (isBossLevel) {
        enemyType = 'boss';
      } else if (level >= 15) {
        enemyType = Math.random() < 0.4 ? 'assault' : Math.random() < 0.7 ? 'battle' : 'drone';
      } else if (level >= 8) {
        enemyType = Math.random() < 0.6 ? 'battle' : 'drone';
      } else {
        enemyType = 'drone';
      }
      
      const baseStats = ENEMY_TYPES[enemyType];
      const levelMultiplier = 1 + (level - 1) * 0.1;
      
      newEnemies.push({
        id: i,
        x,
        y,
        type: enemyType,
        health: Math.floor(baseStats.health * levelMultiplier),
        maxHealth: Math.floor(baseStats.health * levelMultiplier),
        damage: Math.floor(baseStats.damage * levelMultiplier),
        defense: Math.floor(baseStats.defense * levelMultiplier),
        exp: Math.floor(baseStats.exp * levelMultiplier),
        encountered: enemyType === 'boss' // Bosses are always revealed
      });
    }
    
    setEnemies(newEnemies);
    
    // Generate items
    const itemCount = Math.floor(2 + level * 0.3);
    const newItems = [];
    
    for (let i = 0; i < itemCount; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * (mapWidth - 2)) + 1;
        y = Math.floor(Math.random() * (mapHeight - 2)) + 1;
      } while (
        newMap[y][x] === '#' || 
        (x === 1 && y === 1) || 
        (x === exitX && y === exitY) ||
        newEnemies.some(e => e.x === x && e.y === y) ||
        newItems.some(item => item.x === x && item.y === y) ||
        (Math.abs(x - 1) + Math.abs(y - 1) < 2) // Keep items away from start
      );
      
      const itemTypes = Object.keys(ITEM_TYPES);
      const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
      
      newItems.push({
        id: i,
        x,
        y,
        type: itemType
      });
    }
    
    setItems(newItems);
    addToLog(`Entered level ${level}${isBossLevel ? ' - BOSS LEVEL!' : ''}`);
  }, [level]);

  // Add message to game log
  const addToLog = (message) => {
    setGameLog(prev => [...prev.slice(-9), message]);
  };

  // Combat system
  const combat = (enemy) => {
    // Mark enemy as encountered
    enemy.encountered = true;
    
    const playerDamage = Math.max(1, player.mecha.weapons.damage - enemy.defense);
    const enemyDamage = Math.max(1, enemy.damage - player.mecha.armor.defense);
    
    // Player attacks first
    const hitChance = Math.random() * 100;
    if (hitChance <= player.mecha.weapons.accuracy) {
      enemy.health -= playerDamage;
      addToLog(`Hit ${enemy.type} for ${playerDamage} damage!`);
      
      if (enemy.health <= 0) {
        addToLog(`Destroyed ${enemy.type}! +${enemy.exp} exp`);
        setPlayer(prev => ({
          ...prev,
          pilot: {
            ...prev.pilot,
            experience: prev.pilot.experience + enemy.exp
          }
        }));
        setEnemies(prev => prev.filter(e => e.id !== enemy.id));
        return;
      }
    } else {
      addToLog(`Missed ${enemy.type}!`);
    }
    
    // Enemy counter-attacks
    setPlayer(prev => {
      const newHealth = Math.max(0, prev.pilot.health - enemyDamage);
      addToLog(`${enemy.type} hits you for ${enemyDamage} damage!`);
      
      if (newHealth <= 0) {
        setGameState('dead');
        addToLog('Your mecha has been destroyed!');
      }
      
      return {
        ...prev,
        pilot: { ...prev.pilot, health: newHealth }
      };
    });
    
    // Update enemy in state
    setEnemies(prev => prev.map(e => e.id === enemy.id ? enemy : e));
  };

  // Handle player movement
  const movePlayer = useCallback((dx, dy) => {
    if (gameState !== 'playing') return;
    
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    // Check bounds
    if (newX < 0 || newX >= map[0]?.length || newY < 0 || newY >= map.length) return;
    
    // Check for walls
    if (map[newY] && map[newY][newX] === '#') return;
    
    // Check for enemies
    const enemy = enemies.find(e => e.x === newX && e.y === newY);
    if (enemy) {
      combat(enemy);
      return;
    }
    
    // Check for items
    const item = items.find(i => i.x === newX && i.y === newY);
    if (item) {
      const itemData = ITEM_TYPES[item.type];
      addToLog(`Found ${itemData.name}!`);
      
      setPlayer(prev => {
        const newPlayer = { ...prev };
        switch (itemData.effect) {
          case 'heal':
            newPlayer.pilot.health = Math.min(prev.pilot.maxHealth, prev.pilot.health + itemData.value);
            break;
          case 'weapon':
            newPlayer.mecha.weapons.damage += itemData.value;
            break;
          case 'armor':
            newPlayer.mecha.armor.defense += itemData.value;
            break;
          case 'fuel':
            newPlayer.mecha.movement.fuel = Math.min(prev.mecha.movement.maxFuel, prev.mecha.movement.fuel + itemData.value);
            break;
        }
        return newPlayer;
      });
      
      setItems(prev => prev.filter(i => i.id !== item.id));
    }
    
    // Check for exit
    if (map[newY] && map[newY][newX] === '>') {
      if (enemies.length === 0) {
        setLevel(prev => prev + 1);
        if (level >= 20) {
          setGameState('victory');
          addToLog('Congratulations! You have completed all 20 levels!');
        } else {
          addToLog('Level cleared! Moving to next level...');
        }
      } else {
        addToLog('Defeat all enemies before advancing!');
      }
      return;
    }
    
    // Consume fuel for movement
    setPlayer(prev => {
      const newFuel = Math.max(0, prev.mecha.movement.fuel - 1);
      if (newFuel === 0) {
        addToLog('Warning: Fuel depleted! Movement will be limited.');
      } else if (newFuel <= 10) {
        addToLog('Warning: Fuel running low!');
      }
      
      return { 
        ...prev, 
        x: newX, 
        y: newY,
        mecha: {
          ...prev.mecha,
          movement: {
            ...prev.mecha.movement,
            fuel: newFuel
          }
        }
      };
    });
  }, [gameState, player.x, player.y, map, enemies, items, level]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          movePlayer(0, -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          movePlayer(0, 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          movePlayer(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePlayer(1, 0);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePlayer]);

  // Initialize level when level changes
  useEffect(() => {
    if (gameState === 'playing') {
      initializeGame();
    }
  }, [level, gameState, initializeGame]);

  // Level up system
  useEffect(() => {
    const expNeeded = player.pilot.level * 100;
    if (player.pilot.experience >= expNeeded) {
      setPlayer(prev => ({
        ...prev,
        pilot: {
          ...prev.pilot,
          level: prev.pilot.level + 1,
          experience: prev.pilot.experience - expNeeded,
          maxHealth: prev.pilot.maxHealth + 20,
          health: prev.pilot.health + 20
        },
        mecha: {
          ...prev.mecha,
          weapons: { ...prev.mecha.weapons, damage: prev.mecha.weapons.damage + 2 },
          armor: { ...prev.mecha.armor, defense: prev.mecha.armor.defense + 1 },
          sensors: { ...prev.mecha.sensors, range: prev.mecha.sensors.range + 1 },
          movement: { 
            ...prev.mecha.movement, 
            maxFuel: prev.mecha.movement.maxFuel + 20,
            fuel: prev.mecha.movement.fuel + 20
          }
        }
      }));
      addToLog('LEVEL UP! Stats improved!');
    }
  }, [player.pilot.experience, player.pilot.level]);

  // Save game (in-memory for this environment)
  const saveGame = () => {
    const saveData = {
      id: Date.now(),
      name: `Save ${savedGames.length + 1}`,
      level,
      player,
      timestamp: new Date().toLocaleString()
    };
    setSavedGames(prev => [...prev, saveData]);
    addToLog('Game saved!');
  };

  // Load game
  const loadGame = (saveData) => {
    setLevel(saveData.level);
    setPlayer(saveData.player);
    setGameState('playing');
    addToLog('Game loaded!');
  };

  // Render map
  const renderMap = () => {
    if (!map.length) return null;
    
    return map.map((row, y) => (
      <div key={y} style={{ display: 'flex', fontFamily: 'monospace', lineHeight: '1' }}>
        {row.map((cell, x) => {
          let char = cell;
          let color = '#888';
          
          // Player
          if (player.x === x && player.y === y) {
            char = '@';
            color = '#4f4';
          }
          // Enemies
          else {
            const enemy = enemies.find(e => e.x === x && e.y === y);
            if (enemy) {
              // Calculate distance from player (Manhattan distance)
              const distance = Math.abs(player.x - x) + Math.abs(player.y - y);
              const inSensorRange = distance <= player.mecha.sensors.range;
              
              if (enemy.encountered || inSensorRange) {
                char = ENEMY_TYPES[enemy.type].char;
                color = ENEMY_TYPES[enemy.type].color;
              } else {
                char = 'e';
                color = '#f44';
              }
            }
            // Items
            else {
              const item = items.find(i => i.x === x && i.y === y);
              if (item) {
                // Calculate distance from player (Manhattan distance)
                const distance = Math.abs(player.x - x) + Math.abs(player.y - y);
                const inSensorRange = distance <= player.mecha.sensors.range;
                
                if (inSensorRange) {
                  // Show actual item type if in sensor range
                  char = ITEM_TYPES[item.type].char;
                  color = ITEM_TYPES[item.type].color;
                } else {
                  // Show generic '+' if out of sensor range
                  char = '+';
                  color = '#4f4';
                }
              }
              // Exit
              else if (cell === '>') {
                color = '#ff0'; // Yellow color for exit
              }
            }
          }
          
          return (
            <span
              key={x}
              style={{
                color,
                backgroundColor: cell === '#' ? '#333' : 'black',
                width: '20px',
                height: '20px',
                display: 'inline-block',
                textAlign: 'center'
              }}
            >
              {char}
            </span>
          );
        })}
      </div>
    ));
  };

  if (gameState === 'menu') {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#111', color: '#fff', minHeight: '100vh' }}>
        <h1 style={{ color: '#4f4' }}>🤖 MECHA DUNGEON DELVER 🤖</h1>
        <p>Pilot your mecha through 20 levels of increasingly dangerous dungeons!</p>
        
        <div style={{ margin: '20px 0' }}>
          <h3>Controls:</h3>
          <p>• Arrow Keys: Move (consumes fuel)</p>
          <p>• Bump into enemies to attack (free)</p>
          <p>• Collect items for upgrades</p>
          <p>• Reach the exit (&gt;) to advance (+20 fuel)</p>
          <p>• Defeat all enemies before advancing</p>
          <p>• Sensors reveal enemy/item types within range</p>
        </div>
        
        <button 
          onClick={() => setGameState('playing')}
          style={{ padding: '10px 20px', fontSize: '16px', margin: '10px' }}
        >
          New Game
        </button>
        
        {savedGames.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>Saved Games:</h3>
            {savedGames.map(save => (
              <div key={save.id} style={{ margin: '5px 0' }}>
                <button onClick={() => loadGame(save)} style={{ margin: '5px', padding: '5px 10px' }}>
                  {save.name} - Level {save.level} - {save.timestamp}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'dead') {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#111', color: '#f44', minHeight: '100vh' }}>
        <h1>MECHA DESTROYED</h1>
        <p>Your pilot has been defeated on level {level}.</p>
        <p>Final Stats:</p>
        <p>Pilot Level: {player.pilot.level}</p>
        <p>Experience: {player.pilot.experience}</p>
        <button onClick={() => setGameState('menu')} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Return to Menu
        </button>
      </div>
    );
  }

  if (gameState === 'victory') {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#111', color: '#4f4', minHeight: '100vh' }}>
        <h1>VICTORY!</h1>
        <p>Congratulations! You have successfully completed all 20 levels!</p>
        <p>Final Stats:</p>
        <p>Pilot Level: {player.pilot.level}</p>
        <p>Experience: {player.pilot.experience}</p>
        <p>Weapon Damage: {player.mecha.weapons.damage}</p>
        <p>Armor Defense: {player.mecha.armor.defense}</p>
        <button onClick={() => setGameState('menu')} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Return to Menu
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#111', color: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Game Map */}
        <div style={{ backgroundColor: 'black', padding: '10px', border: '2px solid #444' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#4f4' }}>Level {level}</h3>
          {renderMap()}
        </div>
        
        {/* Game Info */}
        <div style={{ flex: 1 }}>
          {/* Player Stats */}
          <div style={{ backgroundColor: '#222', padding: '10px', marginBottom: '10px', border: '1px solid #444' }}>
            <h4 style={{ color: '#4f4', margin: '0 0 10px 0' }}>Pilot Status</h4>
            <p>Name: {player.pilot.name}</p>
            <p>Level: {player.pilot.level}</p>
            <p>Health: {player.pilot.health}/{player.pilot.maxHealth}</p>
            <p>Experience: {player.pilot.experience}/{player.pilot.level * 100}</p>
          </div>
          
          {/* Mecha Stats */}
          <div style={{ backgroundColor: '#222', padding: '10px', marginBottom: '10px', border: '1px solid #444' }}>
            <h4 style={{ color: '#44f', margin: '0 0 10px 0' }}>Mecha Systems</h4>
            <p>Weapon Damage: {player.mecha.weapons.damage}</p>
            <p>Weapon Accuracy: {player.mecha.weapons.accuracy}%</p>
            <p>Armor Defense: {player.mecha.armor.defense}</p>
            <p>Sensor Range: {player.mecha.sensors.range}</p>
            
            {/* Fuel Gauge */}
            <div style={{ margin: '10px 0' }}>
              <p style={{ margin: '5px 0' }}>
                Fuel: {player.mecha.movement.fuel}/{player.mecha.movement.maxFuel}
              </p>
              <div style={{
                width: '100%',
                height: '20px',
                backgroundColor: '#333',
                border: '1px solid #666',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(player.mecha.movement.fuel / player.mecha.movement.maxFuel) * 100}%`,
                  height: '100%',
                  backgroundColor: 
                    player.mecha.movement.fuel <= 10 ? '#f44' :
                    player.mecha.movement.fuel <= 40 ? '#ff4' : '#4f4',
                  transition: 'all 0.3s ease'
                }} />
              </div>
            </div>
          </div>
          
          {/* Game Log */}
          <div style={{ backgroundColor: '#222', padding: '10px', marginBottom: '10px', border: '1px solid #444', height: '200px', overflowY: 'auto' }}>
            <h4 style={{ color: '#ff4', margin: '0 0 10px 0' }}>Mission Log</h4>
            {gameLog.map((msg, i) => (
              <p key={i} style={{ margin: '2px 0', fontSize: '12px' }}>{msg}</p>
            ))}
          </div>
          
          {/* Legend */}
          <div style={{ backgroundColor: '#222', padding: '10px', marginBottom: '10px', border: '1px solid #444' }}>
            <h4 style={{ color: '#f84', margin: '0 0 10px 0' }}>Legend</h4>
            <p><span style={{ color: '#4f4' }}>@</span> You</p>
            <p><span style={{ color: '#f44' }}>e</span> Unknown Enemy</p>
            <p><span style={{ color: '#666' }}>d</span> Drone (scanned/encountered)</p>
            <p><span style={{ color: '#c44' }}>B</span> Battle Unit (scanned/encountered)</p>
            <p><span style={{ color: '#a22' }}>A</span> Assault Unit (scanned/encountered)</p>
            <p><span style={{ color: '#f44' }}>X</span> Boss (always visible)</p>
            <p><span style={{ color: '#4f4' }}>+</span> Item (scanned items show type)</p>
            <p># Wall</p>
            <p><span style={{ color: '#ff0' }}>&gt;</span> Exit</p>
            <p style={{ fontSize: '12px', color: '#aaa', marginTop: '10px' }}>
              Sensor Range: {player.mecha.sensors.range} - Reveals enemy/item types within range
            </p>
          </div>
          
          {/* Controls */}
          <div style={{ backgroundColor: '#222', padding: '10px', border: '1px solid #444' }}>
            <h4 style={{ color: '#f4f', margin: '0 0 10px 0' }}>Controls</h4>
            <p>Enemies: {enemies.length}</p>
            <button onClick={saveGame} style={{ padding: '5px 10px', margin: '5px' }}>
              Save Game
            </button>
            <button onClick={() => setGameState('menu')} style={{ padding: '5px 10px', margin: '5px' }}>
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MechaRoguelike;