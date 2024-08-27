const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://134.209.64.243',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

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
    const { username, password } = req.body;

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

// Get all courts
app.get('/api/courts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courts');
    res.json(result.rows);
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
    const { firstName, lastName } = req.body;
    
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
    
    // Insert new player
    const result = await pool.query(
      'INSERT INTO users (username, password, first_name, last_name, user_type, temp_password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, temp_password',
      [username, 'temp', firstName, lastName, 'player', tempPassword]
    );
    
    res.status(201).json({ 
      message: 'Player registered successfully',
      username: result.rows[0].username,
      tempPassword: result.rows[0].temp_password
    });
  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({ message: 'Error registering player' });
  }
});

// Get all players
app.get('/api/players', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, first_name, last_name, temp_password FROM users WHERE user_type = $1', ['player']);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ message: 'Error fetching players' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
