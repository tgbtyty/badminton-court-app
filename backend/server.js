const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://134.209.64.243',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());  // This line is crucial for parsing JSON bodies
app.use(express.urlencoded({ extended: true }));  // For parsing application/x-www-form-urlencoded

// ... rest of the server.js file remains the same

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

function startServer() {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log('Address in use, retrying...');
      setTimeout(() => {
        server.close();
        startServer();
      }, 1000);
    } else {
      console.error('Server error:', e);
    }
  });
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err);
  } else {
    console.log('Connected to the database');
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, firstName, lastName } = req.body;

    // Check if user already exists
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (username, password, first_name, last_name, user_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [username, hashedPassword, firstName, lastName, 'admin']
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    console.log('Login request body:', req.body);  // Debug log
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    console.log('Login attempt for username:', username);

    // Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      console.log('User not found:', username);
      return res.status(400).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password for user:', username);
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Generate JWT
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Login successful for user:', username);
    res.json({ message: 'Logged in successfully', token, userType: user.user_type });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});


// ... (existing routes)

// Queue players for a court
app.post('/api/courts/:id/queue', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { playerCredentials } = req.body;

    const court = await pool.query('SELECT * FROM courts WHERE id = $1', [id]);
    if (court.rows.length === 0) {
      return res.status(404).json({ message: 'Court not found' });
    }

    // Verify player credentials and check if they're already active
    const validatedPlayers = [];
    for (const cred of playerCredentials) {
      const user = await pool.query('SELECT * FROM users WHERE username = $1', [cred.username]);
      if (user.rows.length === 0) {
        return res.status(400).json({ message: `Player not found: ${cred.username}` });
      }

      const validPassword = await bcrypt.compare(cred.password, user.rows[0].password);
      if (!validPassword) {
        return res.status(400).json({ message: `Invalid password for player: ${cred.username}` });
      }

      if (await isPlayerActive(user.rows[0].id)) {
        return res.status(400).json({ message: `Player ${cred.username} is already on a court or in a queue` });
      }

      validatedPlayers.push(user.rows[0].id);
    }

    const activePlayers = await pool.query('SELECT * FROM active_players WHERE court_id = $1', [id]);
    const remainingTime = await getRemainingTime(id);

    // Check if we can merge the new players onto the court
    if (activePlayers.rows.length + validatedPlayers.length <= 4 && (remainingTime === null || remainingTime > 10 * 60)) {
      // Merge players onto the court
      for (const playerId of validatedPlayers) {
        await pool.query(
          'INSERT INTO active_players (court_id, user_id) VALUES ($1, $2)',
          [id, playerId]
        );
      }
      // Start the timer only if it wasn't already running
      if (remainingTime === null) {
        await pool.query('UPDATE courts SET timer_start = NOW() WHERE id = $1', [id]);
      }
    } else {
      // Add players to the waiting queue
      for (const playerId of validatedPlayers) {
        await pool.query(
          'INSERT INTO waiting_players (court_id, user_id) VALUES ($1, $2)',
          [id, playerId]
        );
      }
    }

    res.json({ message: 'Players added successfully' });
  } catch (error) {
    console.error('Error adding players:', error);
    res.status(500).json({ message: 'Error adding players' });
  }
});

// Helper function to get remaining time for a court
async function getRemainingTime(courtId) {
  const court = await pool.query('SELECT timer_start FROM courts WHERE id = $1', [courtId]);
  if (court.rows[0].timer_start) {
    const elapsedTime = Date.now() - new Date(court.rows[0].timer_start).getTime();
    return Math.max(0, 15 * 60 - Math.floor(elapsedTime / 1000));
  }
  return null;
}

// Helper function to check if a player is already on a court or in a queue
async function isPlayerActive(userId) {
  const activePlayer = await pool.query('SELECT * FROM active_players WHERE user_id = $1', [userId]);
  const waitingPlayer = await pool.query('SELECT * FROM waiting_players WHERE user_id = $1', [userId]);
  return activePlayer.rows.length > 0 || waitingPlayer.rows.length > 0;
}

// Helper function to move players from waiting to active
async function movePlayersToActiveCourt(courtId) {
  const activePlayers = await pool.query('SELECT * FROM active_players WHERE court_id = $1', [courtId]);
  const availableSlots = 4 - activePlayers.rows.length;

  if (availableSlots > 0) {
    const waitingPlayers = await pool.query(
      'SELECT * FROM waiting_players WHERE court_id = $1 ORDER BY joined_at LIMIT $2',
      [courtId, availableSlots]
    );

    for (const player of waitingPlayers.rows) {
      await pool.query(
        'INSERT INTO active_players (court_id, user_id) VALUES ($1, $2)',
        [courtId, player.user_id]
      );
      await pool.query('DELETE FROM waiting_players WHERE id = $1', [player.id]);
    }

    // Manage the court timer after moving players
    await manageCourtTimer(courtId);
  }
}

// Get court details including current players and queue
app.get('/api/courts', authenticateToken, async (req, res) => {
  try {
    const courtsResult = await pool.query('SELECT * FROM courts');
    const now = new Date();
    
    const courts = await Promise.all(courtsResult.rows.map(async (court) => {
      // Get locks
      const locksResult = await pool.query(
        'SELECT * FROM scheduled_locks WHERE court_id = $1 ORDER BY start_time',
        [court.id]
      );
      
      // Get active players
      const activePlayers = await pool.query(
        'SELECT users.id, users.first_name, users.last_name FROM active_players JOIN users ON active_players.user_id = users.id WHERE court_id = $1',
        [court.id]
      );
      
      // Get waiting players (grouped)
      const waitingPlayersResult = await pool.query(
        'SELECT users.id, users.first_name, users.last_name, waiting_players.joined_at FROM waiting_players JOIN users ON waiting_players.user_id = users.id WHERE court_id = $1 ORDER BY waiting_players.joined_at',
        [court.id]
      );

      // Group waiting players
      const waitingGroups = groupWaitingPlayers(waitingPlayersResult.rows);

      // Find current and future locks
      const currentLock = locksResult.rows.find(lock => 
        new Date(lock.start_time) <= now && new Date(lock.end_time) > now
      );
      const futureLocks = locksResult.rows.filter(lock => new Date(lock.start_time) > now);

      // Calculate remaining time for active players
      let remainingTime = calculateRemainingTime(court, activePlayers.rows);

      return {
        ...court,
        locks: locksResult.rows,
        active_players: activePlayers.rows,
        waiting_groups: waitingGroups,
        current_lock: currentLock || null,
        future_locks: futureLocks,
        remaining_time: remainingTime
      };
    }));

    res.json(courts);
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({ message: 'Error fetching courts', error: error.message });
  }
});



// Helper function to start or reset the timer for a court
async function manageCourtTimer(courtId) {
  const activePlayers = await pool.query('SELECT * FROM active_players WHERE court_id = $1', [courtId]);
  if (activePlayers.rows.length > 0) {
    // Start or reset the timer if there are active players
    await pool.query('UPDATE courts SET timer_start = NOW() WHERE id = $1', [courtId]);
  } else {
    // Clear the timer if there are no active players
    await pool.query('UPDATE courts SET timer_start = NULL WHERE id = $1', [courtId]);
  }
}


// Function to check and rotate players when the timer ends
async function checkAndRotatePlayers() {
  const courts = await pool.query('SELECT * FROM courts WHERE timer_start IS NOT NULL');
  for (const court of courts.rows) {
    const remainingTime = await getRemainingTime(court.id);
    if (remainingTime === 0) {
      await rotatePlayers(court.id);
    }
  }
}

async function rotatePlayers(courtId) {
  // Remove current active players
  await pool.query('DELETE FROM active_players WHERE court_id = $1', [courtId]);
  
  // Move waiting players to active
  await movePlayersToActiveCourt(courtId);

  // Manage the court timer after rotation
  await manageCourtTimer(courtId);
}

// Run the check every minute
setInterval(checkAndRotatePlayers, 6000);

// Get all courts (with locks and player counts)
app.get('/api/courts', authenticateToken, async (req, res) => {
  try {
    const courtsResult = await pool.query('SELECT * FROM courts');
    const now = new Date();
    
    const courts = await Promise.all(courtsResult.rows.map(async (court) => {
      // Get locks
      const locksResult = await pool.query(
        'SELECT * FROM scheduled_locks WHERE court_id = $1 ORDER BY start_time',
        [court.id]
      );
      
      // Get active players
      const activePlayers = await pool.query(
        'SELECT users.id, users.first_name, users.last_name FROM active_players JOIN users ON active_players.user_id = users.id WHERE court_id = $1',
        [court.id]
      );
      
      // Get waiting players (grouped)
      const waitingPlayersResult = await pool.query(
        'SELECT users.id, users.first_name, users.last_name, waiting_players.joined_at FROM waiting_players JOIN users ON waiting_players.user_id = users.id WHERE court_id = $1 ORDER BY waiting_players.joined_at',
        [court.id]
      );

      // Group waiting players
      const waitingGroups = groupWaitingPlayers(waitingPlayersResult.rows);

      // Find current and future locks
      const currentLock = locksResult.rows.find(lock => 
        new Date(lock.start_time) <= now && new Date(lock.end_time) > now
      );
      const futureLocks = locksResult.rows.filter(lock => new Date(lock.start_time) > now);

      // Calculate remaining time for active players
      let remainingTime = calculateRemainingTime(court, activePlayers.rows);

      return {
        ...court,
        locks: locksResult.rows,
        active_players: activePlayers.rows,
        active_player_count: activePlayers.rows.length,
        waiting_groups: waitingGroups,
        waiting_player_count: waitingPlayersResult.rows.length,
        is_locked: !!currentLock,
        current_lock: currentLock || null,
        future_locks: futureLocks,
        remaining_time: remainingTime
      };
    }));

    res.json(courts);
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({ message: 'Error fetching courts', error: error.message });
  }
});

// Helper function to group waiting players
function groupWaitingPlayers(players) {
  const waitingGroups = [];
  let currentGroup = [];
  let currentJoinedAt = null;
  for (const player of players) {
    if (!currentJoinedAt || Math.abs(player.joined_at - currentJoinedAt) < 1000) {
      currentGroup.push(player);
    } else {
      waitingGroups.push(currentGroup);
      currentGroup = [player];
    }
    currentJoinedAt = player.joined_at;
  }
  if (currentGroup.length > 0) {
    waitingGroups.push(currentGroup);
  }
  return waitingGroups;
}

// Helper function to calculate remaining time
function calculateRemainingTime(court, activePlayers) {
  const now = new Date();
  if (activePlayers.length > 0 && court.timer_start) {
    const timerStart = new Date(court.timer_start);
    const elapsedTime = now - timerStart;
    return Math.max(0, 15 * 60 * 1000 - elapsedTime); // 15 minutes in milliseconds
  }
  return null;
}

// Function to check and update court lock status
async function checkAndUpdateCourtLocks() {
  try {
    const now = new Date();
    const courtsResult = await pool.query('SELECT * FROM courts');
    
    for (const court of courtsResult.rows) {
      const locksResult = await pool.query('SELECT * FROM scheduled_locks WHERE court_id = $1', [court.id]);
      
      const currentLock = locksResult.rows.find(lock => 
        new Date(lock.start_time) <= now && new Date(lock.end_time) > now
      );

      const shouldBeLocked = !!currentLock;

      if (court.is_locked !== shouldBeLocked) {
        await pool.query('UPDATE courts SET is_locked = $1 WHERE id = $2', [shouldBeLocked, court.id]);
        console.log(`Updated court ${court.id} lock status to ${shouldBeLocked}`);
      }
    }
  } catch (error) {
    console.error('Error updating court lock status:', error);
  }
}

// Run the check every minute
setInterval(checkAndUpdateCourtLocks, 60000);

// Add a court
app.post('/api/courts', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query('INSERT INTO courts (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding court:', error);
    res.status(500).json({ message: 'Error adding court' });
  }
});

// Remove a court
app.delete('/api/courts/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // First, delete all scheduled locks for this court
    await client.query('DELETE FROM scheduled_locks WHERE court_id = $1', [id]);

    // Then, delete the court
    const result = await client.query('DELETE FROM courts WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Court not found' });
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Court removed successfully', court: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing court:', error);
    res.status(500).json({ message: 'Error removing court', error: error.message });
  } finally {
    client.release();
  }
});

// Lock a court
// Lock a court
app.post('/api/courts/:id/lock', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { startTime, endTime, reason } = req.body;

    console.log('Received lock request:', { id, startTime, endTime, reason });

    if (!startTime || !endTime || !reason) {
      throw new Error('Missing required fields');
    }

    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      throw new Error('Invalid date/time format');
    }

    // Insert the lock into scheduled_locks
    const lockResult = await client.query(
      'INSERT INTO scheduled_locks (court_id, start_time, end_time, reason) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, startDateTime, endDateTime, reason]
    );

    // We no longer update the court's is_locked status here
    // The checkAndUpdateCourtLocks function will handle this

    await client.query('COMMIT');

    console.log('Lock successfully created:', lockResult.rows[0]);

    res.json(lockResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error locking court:', error);
    res.status(500).json({ message: 'Error locking court', error: error.message });
  } finally {
    client.release();
  }
});

// Remove a lock
app.delete('/api/courts/:courtId/lock/:lockId', authenticateToken, async (req, res) => {
  try {
    const { courtId, lockId } = req.params;
    
    // Remove the lock
    const result = await pool.query(
      'DELETE FROM scheduled_locks WHERE id = $1 AND court_id = $2 RETURNING *',
      [lockId, courtId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lock not found' });
    }

    // Check if there are any remaining locks for this court
    const remainingLocks = await pool.query(
      'SELECT * FROM scheduled_locks WHERE court_id = $1',
      [courtId]
    );

    // If no locks remain, update the court's is_locked status
    if (remainingLocks.rows.length === 0) {
      await pool.query('UPDATE courts SET is_locked = false WHERE id = $1', [courtId]);
    }

    res.json({ message: 'Lock removed successfully' });
  } catch (error) {
    console.error('Error removing lock:', error);
    res.status(500).json({ message: 'Error removing lock', error: error.message });
  }
});

// Unlock a court
app.post('/api/courts/:id/unlock', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE courts SET is_locked = false, unlock_time = null WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Court not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error unlocking court:', error);
    res.status(500).json({ message: 'Error unlocking court' });
  }
});

const zodiacAnimals = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];

// Register a player
app.post('/api/register-player', async (req, res) => {
  try {
    const { firstName, lastName, packageUses } = req.body;

    // Generate username
    let username = firstName.toLowerCase();
    let suffix = 1;
    while (true) {
      const existingUser = await pool.query('SELECT * FROM users WHERE username = $1 AND user_type = $2', [username, 'player']);
      if (existingUser.rows.length === 0) break;
      username = `${firstName.toLowerCase()}${++suffix}`;
    }

    // Generate temporary password (now lowercase)
    const tempPassword = zodiacAnimals[Math.floor(Math.random() * zodiacAnimals.length)];

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    console.log('Original temp password:', tempPassword);
    console.log('Hashed password:', hashedPassword);

    // Insert new player
    const result = await pool.query(
      'INSERT INTO users (username, password, first_name, last_name, user_type, temp_password, package_uses) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, temp_password',
      [username, hashedPassword, firstName, lastName, 'player', tempPassword, packageUses]
    );

    res.status(201).json({ 
      message: 'Player registered successfully',
      username: result.rows[0].username,
      tempPassword: result.rows[0].temp_password
    });
  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({ message: 'Error registering player', error: error.message });
  }
});


// Modify the get all players route to include notes
app.get('/api/players', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, first_name, last_name, temp_password, use_drop_in_package, package_uses, created_at, is_marked, is_flagged, note FROM users WHERE user_type = $1', ['player']);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ message: 'Error fetching players' });
  }
});

// Remove players from a court or queue
app.post('/api/courts/:id/remove', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { playerCredentials } = req.body;

    for (const cred of playerCredentials) {
      const user = await pool.query('SELECT * FROM users WHERE username = $1', [cred.username]);
      if (user.rows.length === 0) {
        return res.status(400).json({ message: `Player not found: ${cred.username}` });
      }

      const validPassword = await bcrypt.compare(cred.password, user.rows[0].password);
      if (!validPassword) {
        return res.status(400).json({ message: `Invalid password for player: ${cred.username}` });
      }

      // Remove from active players
      await pool.query('DELETE FROM active_players WHERE court_id = $1 AND user_id = $2', [id, user.rows[0].id]);

      // Remove from waiting players
      await pool.query('DELETE FROM waiting_players WHERE court_id = $1 AND user_id = $2', [id, user.rows[0].id]);
    }

    // Manage the court timer after removing players
    await manageCourtTimer(id);

    // Move players from waiting to active if necessary
    await movePlayersToActiveCourt(id);

    res.json({ message: 'Players removed successfully' });
  } catch (error) {
    console.error('Error removing players:', error);
    res.status(500).json({ message: 'Error removing players' });
  }
});

// Register multiple players
app.post('/api/register-players', async (req, res) => {
  try {
    const { players, useDropInPackage, packageUses } = req.body;

    const registeredPlayers = [];
    let packageHolderId = null;

    for (let i = 0; i < players.length; i++) {
      const { firstName, lastName } = players[i];

      // Generate username
      let username = firstName.toLowerCase();
      let suffix = 1;
      while (true) {
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1 AND user_type = $2', [username, 'player']);
        if (existingUser.rows.length === 0) break;
        username = `${firstName.toLowerCase()}${++suffix}`;
      }

      // Generate temporary password (now lowercase)
      const tempPassword = zodiacAnimals[Math.floor(Math.random() * zodiacAnimals.length)];

      // Hash the temporary password
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Insert new player
      const result = await pool.query(
        'INSERT INTO users (username, password, first_name, last_name, user_type, temp_password, package_uses, package_holder_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, temp_password',
        [username, hashedPassword, firstName, lastName, 'player', tempPassword, i === 0 && useDropInPackage ? packageUses : 0, packageHolderId]
      );

      if (i === 0 && useDropInPackage) {
        packageHolderId = result.rows[0].id;
        // Update the first player to be their own package holder
        await pool.query('UPDATE users SET package_holder_id = $1 WHERE id = $1', [packageHolderId]);
      }

      registeredPlayers.push({
        username: result.rows[0].username,
        tempPassword: result.rows[0].temp_password
      });
    }

    res.status(201).json({ 
      message: 'Players registered successfully',
      players: registeredPlayers
    });
  } catch (error) {
    console.error('Error registering players:', error);
    res.status(500).json({ message: 'Error registering players', error: error.message });
  }
});

// Clear all players
app.delete('/api/players', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE user_type = $1', ['player']);
    res.json({ message: 'All players cleared successfully' });
  } catch (error) {
    console.error('Error clearing all players:', error);
    res.status(500).json({ message: 'Error clearing all players' });
  }
});

// Remove a specific player
app.delete('/api/players/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 AND user_type = $2 RETURNING *', [id, 'player']);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json({ message: 'Player removed successfully' });
  } catch (error) {
    console.error('Error removing player:', error);
    res.status(500).json({ message: 'Error removing player' });
  }
});

// Mark a player
app.put('/api/players/:id/mark', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_marked } = req.body;
    const result = await pool.query(
      'UPDATE users SET is_marked = $1 WHERE id = $2 AND user_type = $3 RETURNING *',
      [is_marked, id, 'player']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking player:', error);
    res.status(500).json({ message: 'Error marking player' });
  }
});

// Flag a player
app.put('/api/players/:id/flag', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_flagged } = req.body;
    const result = await pool.query(
      'UPDATE users SET is_flagged = $1 WHERE id = $2 AND user_type = $3 RETURNING *',
      [is_flagged, id, 'player']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error flagging player:', error);
    res.status(500).json({ message: 'Error flagging player' });
  }
});

// Toggle player mark status
app.post('/api/players/:id/toggle-mark', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE users SET is_marked = NOT is_marked WHERE id = $1 RETURNING is_marked',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json({ is_marked: result.rows[0].is_marked });
  } catch (error) {
    console.error('Error toggling player mark:', error);
    res.status(500).json({ message: 'Error toggling player mark' });
  }
});

// Toggle player flag status
app.post('/api/players/:id/toggle-flag', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE users SET is_flagged = NOT is_flagged WHERE id = $1 RETURNING is_flagged',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json({ is_flagged: result.rows[0].is_flagged });
  } catch (error) {
    console.error('Error toggling player flag:', error);
    res.status(500).json({ message: 'Error toggling player flag' });
  }
});

// Add a new route to update player notes
app.post('/api/players/:id/note', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const result = await pool.query(
      'UPDATE users SET note = $1 WHERE id = $2 AND user_type = $3 RETURNING *',
      [note, id, 'player']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json({ message: 'Note updated successfully' });
  } catch (error) {
    console.error('Error updating player note:', error);
    res.status(500).json({ message: 'Error updating player note' });
  }
});

// Archive all players
app.post('/api/players/archive', authenticateToken, async (req, res) => {
  try {
    const { password, reason } = req.body;
    
    // Verify password
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Get all current players
    const players = await pool.query('SELECT * FROM users WHERE user_type = $1', ['player']);

    // Insert players into archived_players table
    for (const player of players.rows) {
      await pool.query(`
        INSERT INTO archived_players 
        (original_id, username, first_name, last_name, temp_password, use_drop_in_package, 
        package_uses, created_at, is_marked, is_flagged, note, archive_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [player.id, player.username, player.first_name, player.last_name, player.temp_password,
          player.use_drop_in_package, player.package_uses, player.created_at, player.is_marked,
          player.is_flagged, player.note, reason]);
    }

    // Clear all current players
    await pool.query('DELETE FROM users WHERE user_type = $1', ['player']);

    res.json({ message: 'All players archived successfully' });
  } catch (error) {
    console.error('Error archiving players:', error);
    res.status(500).json({ message: 'Error archiving players' });
  }
});

// Get archived players
app.get('/api/players/archived', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM archived_players ORDER BY archived_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching archived players:', error);
    res.status(500).json({ message: 'Error fetching archived players' });
  }
});

// Add this line near the end of your file, before startServer()
setInterval(checkAndUpdateCourtLocks, 5000);

startServer();
