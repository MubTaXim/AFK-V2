const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const mcData = require('minecraft-data')('1.20.1'); // Minecraft version

const connectionDelay = 10000; // 10 seconds
const reconnectDelay = 30000; // 30 seconds delay before reconnecting
const logFrequency = 10000; // Log significant events every 10 seconds

let lastLogTime = Date.now(); // Initialize lastLogTime
let botInstances = {}; // Store bot instances

// Function to create and set up a bot
function createBot(botName) {
  const bot = mineflayer.createBot({
    host: '23.ip.gl.ply.gg', // Your server IP
    port: 14683, // Your server port
    username: botName, // Bot username
    onlineMode: false // Set to false if the server is cracked
  });

  bot.loadPlugin(pathfinder);
  botInstances[botName] = bot; // Store the bot instance
  setupBot(bot, botName);
}

// Function to set up bot behaviors
function setupBot(bot, botName) {
  bot.once('spawn', () => {
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    log(`${botName} has spawned and is ready!`);

    // Main loop to check time and perform actions
    setInterval(() => {
      checkTimeAndAct(bot, botName);
    }, 1000); // Check every second

    // Random movement and looking at entities intervals
    setInterval(() => {
      if (!bot.sleeping && bot.health > 0) {
        moveToRandomLocation(bot);
      }
    }, Math.random() * 5000 + 5000); // Random interval between 5 and 10 seconds

    setInterval(() => {
      if (!bot.sleeping && bot.health > 0) {
        const entity = findNearestEntity(bot);
        if (entity) {
          botLookAt(bot, entity);
        }
      }
    }, 5000); // Every 5 seconds

    // Monitor bot's health and hunger
    setInterval(() => {
      if (bot.health < 10) {
        log(`${botName} health is low! Moving to a safe area...`);
        moveToSafeArea(bot);
      }
      if (bot.food < 5) {
        log(`${botName} hunger is low! Moving to find food...`);
        // Implement a method to find food if desired
      }
    }, 10000); // Check every 10 seconds
  });

  // Handle bot errors
  bot.on('error', err => {
    log(`${botName} error: ${err}`);
    attemptReconnect(bot, botName);
  });

  bot.on('kicked', reason => {
    log(`${botName} kicked: ${reason}`);
    attemptReconnect(bot, botName);
  });

  bot.on('end', () => {
    log(`${botName} disconnected. Attempting to reconnect...`);
    attemptReconnect(bot, botName);
  });
}

// Function to attempt reconnection
function attemptReconnect(bot, botName) {
  if (bot.reconnecting) return; // Prevent multiple reconnect attempts
  bot.reconnecting = true; // Set reconnecting flag

  log(`Attempting to reconnect ${botName} in ${reconnectDelay / 1000} seconds...`);

  setTimeout(() => {
    bot.quit(); // Quit the bot first

    // Create a new bot instance after a delay
    setTimeout(() => {
      log(`Creating new instance for ${botName}...`);
      createBot(botName); // Create a new bot instance
    }, reconnectDelay); // Delay before creating a new bot instance
  }, 1000); // Wait 1 second before quitting

  // Reset the reconnecting flag after a reconnect delay
  setTimeout(() => {
    bot.reconnecting = false;
  }, reconnectDelay + 1000); // Reset after the reconnect delay
}

// Function to check time and act
function checkTimeAndAct(bot, botName) {
  const timeOfDay = bot.time.timeOfDay; // Use bot.time to get time of day in ticks

  // Log the time of day for debugging
  const currentTime = Date.now();
  if (currentTime - lastLogTime > logFrequency) {
    log(`Current time of day for ${botName}: ${timeOfDay}`);
    lastLogTime = currentTime; // Update lastLogTime
  }

  // If it's night (time of day is between 12541 and 23458)
  if (timeOfDay >= 12541 && timeOfDay <= 23458) {
    log(`${botName} is running away from monsters at night.`);
    runAway(bot);
  }
}

// Function to move the bot to a random location
function moveToRandomLocation(bot) {
  const x = bot.entity.position.x + (Math.random() * 20 - 10); // Random X within 20 blocks
  const z = bot.entity.position.z + (Math.random() * 20 - 10); // Random Z within 20 blocks
  const y = bot.entity.position.y; // Same Y level to avoid falling

  const goal = new goals.GoalNear(x, y, z, 1); // Move near the random location
  bot.pathfinder.setGoal(goal);
}

// Function to make the bot run away from monsters
function runAway(bot) {
  const randomX = bot.entity.position.x + (Math.random() * 20 - 10); // Random X within 20 blocks
  const randomZ = bot.entity.position.z + (Math.random() * 20 - 10); // Random Z within 20 blocks
  const goal = new goals.GoalNear(randomX, bot.entity.position.y, randomZ, 1); // Move to the new random location

  bot.pathfinder.setGoal(goal);
}

// Function to make the bot look at an entity
function botLookAt(bot, entity) {
  const pos = entity.position.offset(0, entity.height, 0); // Offset to look at head height
  bot.lookAt(pos, true, () => {
    log(`${bot.username} looking at ${entity.type} at position: ${pos}`);
  });
}

// Helper function to find the nearest entity (player or mob)
function findNearestEntity(bot) {
  const entities = Object.values(bot.entities);
  const validEntities = entities.filter(e => e.type === 'player' || e.type === 'mob'); // Only consider players and mobs

  if (validEntities.length === 0) return null; // No entities to look at
  validEntities.sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position)); // Sort by distance
  return validEntities[0]; // Return the closest entity
}

// Function to move to a safe area when health is low
function moveToSafeArea(bot) {
  const goal = new goals.GoalNear(bot.entity.position.x, bot.entity.position.y, bot.entity.position.z + 10, 1); // Move away from danger
  bot.pathfinder.setGoal(goal);
}

// Custom logging function
function log(message) {
  console.clear(); // Clear the console for a cleaner output
  console.log(`[${new Date().toISOString()}] ${message}`); // Add timestamp to logs
}

// Create both bots
createBot("Eren");
setTimeout(() => {
  createBot("Mikasa");
}, connectionDelay); // Delay to prevent connection throttling
