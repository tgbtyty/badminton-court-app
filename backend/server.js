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

    // Verify player credentials and check if they're already queued
    const validatedPlayers = [];
    for (const cred of playerCredentials) {
      const user = await pool.query('SELECT * FROM users WHERE username = $1', [cred.username]);
      if (user.rows.length === 0) {
        return res.status(400).json({ message: `Player not found: ${cred.username}` });
      }
      
      console.log('Stored hashed password:', user.rows[0].password);
      console.log('Provided password:', cred.password);
      const validPassword = await bcrypt.compare(cred.password, user.rows[0].password);
      console.log('Password comparison result:', validPassword);

      if (!validPassword) {
        return res.status(400).json({ message: `Invalid password for player: ${cred.username}` });
      }
      
      const alreadyQueued = await pool.query(
        'SELECT * FROM waiting_players WHERE user_id = $1',
        [user.rows[0].id]
      );
      if (alreadyQueued.rows.length > 0) {
        return res.status(400).json({ message: `Player ${cred.username} is already queued` });
      }
      
      validatedPlayers.push(user.rows[0].id);
    }

    // Add players to the waiting queue
    for (const playerId of validatedPlayers) {
      await pool.query(
        'INSERT INTO waiting_players (court_id, user_id) VALUES ($1, $2)',
        [id, playerId]
      );
    }

    // Check if the court is empty and move players if necessary
    const activePlayers = await pool.query('SELECT * FROM active_players WHERE court_id = $1', [id]);
    if (activePlayers.rows.length === 0) {
      await movePlayersToActiveCourt(id);
    }

    res.json({ message: 'Players queued successfully' });
  } catch (error) {
    console.error('Error queueing players:', error);
    res.status(500).json({ message: 'Error queueing players', error: error.message });
  }
});

// Helper function to move players from waiting to active
async function movePlayersToActiveCourt(courtId) {
  const waitingPlayers = await pool.query(
    'SELECT * FROM waiting_players WHERE court_id = $1 ORDER BY joined_at LIMIT 4',
    [courtId]
  );

  for (const player of waitingPlayers.rows) {
    await pool.query(
      'INSERT INTO active_players (court_id, user_id) VALUES ($1, $2)',
      [courtId, player.user_id]
    );
    await pool.query('DELETE FROM waiting_players WHERE id = $1', [player.id]);
  }

  // Start the timer for the court
  await pool.query('UPDATE courts SET timer_start = NOW() WHERE id = $1', [courtId]);
}

// Get court details including current players and queue
app.get('/api/courts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const court = await pool.query('SELECT * FROM courts WHERE id = $1', [id]);
    if (court.rows.length === 0) {
      return res.status(404).json({ message: 'Court not found' });
    }

    const activePlayers = await pool.query(
      'SELECT u.id, u.first_name, u.last_name FROM active_players ap JOIN users u ON ap.user_id = u.id WHERE ap.court_id = $1',
      [id]
    );

    const waitingPlayers = await pool.query(
      'SELECT u.id, u.first_name, u.last_name FROM waiting_players wp JOIN users u ON wp.user_id = u.id WHERE wp.court_id = $1 ORDER BY wp.joined_at',
      [id]
    );

    // Group waiting players
    const waitingGroups = [];
    for (let i = 0; i < waitingPlayers.rows.length; i += 4) {
      waitingGroups.push(waitingPlayers.rows.slice(i, i + 4));
    }

    res.json({
      ...court.rows[0],
      active_players: activePlayers.rows,
      waiting_groups: waitingGroups
    });
  } catch (error) {
    console.error('Error fetching court details:', error);
    res.status(500).json({ message: 'Error fetching court details' });
  }
});



// Function to check and rotate players when the timer ends
async function checkAndRotatePlayers() {
  const courts = await pool.query('SELECT * FROM courts WHERE timer_start IS NOT NULL');
  for (const court of courts.rows) {
    const elapsedTime = Date.now() - new Date(court.timer_start).getTime();
    if (elapsedTime >= 15 * 60 * 1000) { // 15 minutes
      await rotatePlayers(court.id);
    }
  }
}
async function rotatePlayers(courtId) {
  // Remove current active players
  await pool.query('DELETE FROM active_players WHERE court_id = $1', [courtId]);
  
  // Move waiting players to active
  await movePlayersToActiveCourt(courtId);

  // Reset the timer
  await pool.query('UPDATE courts SET timer_start = NOW() WHERE id = $1', [courtId]);
}

// Run the check every minute
setInterval(checkAndRotatePlayers, 60000);


// Get all courts (with basic info)
app.get('/api/courts', authenticateToken, async (req, res) => {
  try {
    const courts = await pool.query('SELECT * FROM courts');
    const courtsWithPlayerCounts = await Promise.all(courts.rows.map(async (court) => {
      const activePlayers = await pool.query('SELECT COUNT(*) FROM active_players WHERE court_id = $1', [court.id]);
      const waitingPlayers = await pool.query('SELECT COUNT(*) FROM waiting_players WHERE court_id = $1', [court.id]);
      return {
        ...court,
        active_player_count: parseInt(activePlayers.rows[0].count),
        waiting_player_count: parseInt(waitingPlayers.rows[0].count)
      };
    }));
    res.json(courtsWithPlayerCounts);
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({ message: 'Error fetching courts' });
  }
});

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
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM courts WHERE id = $1', [id]);
    res.status(200).json({ message: 'Court removed successfully' });
  } catch (error) {
    console.error('Error removing court:', error);
    res.status(500).json({ message: 'Error removing court' });
  }
});

// Lock a court
app.post('/api/courts/:id/lock', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, duration } = req.body;
    const unlockTime = new Date(new Date(startTime).getTime() + duration * 60000);
    const result = await pool.query(
      'UPDATE courts SET is_locked = true, unlock_time = $1 WHERE id = $2 RETURNING *',
      [unlockTime, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error locking court:', error);
    res.status(500).json({ message: 'Error locking court' });
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

const zodiacAnimals = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

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

    // Generate temporary password
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

// Get all players
app.get('/api/players', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, first_name, last_name, temp_password, use_drop_in_package, package_uses, created_at, is_marked, is_flagged FROM users WHERE user_type = $1', ['player']);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ message: 'Error fetching players' });
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


startServer();
