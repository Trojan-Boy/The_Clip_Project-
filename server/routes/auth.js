const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// This is a placeholder for a user database. In a real application,
// you would connect to a database like MongoDB, PostgreSQL, etc.
const users = [
    { id: 1, username: 'user1', passwordHash: '$2a$10$iI0T744O05XWnF/205n.V.F.4JzF2Q.T1/1.T./1R.T.' }, // password: password123
    { id: 2, username: 'user2', passwordHash: '$2a$10$iI0T744O05XWnF/205n.V.F.4JzF2Q.T/1.T./1R.T.' }  // password: password123
];

const SECRET_KEY = process.env.JWT_SECRET || 'supersecretjwtkey'; // Store in environment variable in production

// POST /auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // 1. Validate input
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    // 2. Find user by username
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Compare provided password with stored hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. Generate JWT
    const token = jwt.sign(
        { id: user.id, username: user.username },
        SECRET_KEY,
        { expiresIn: '1h' } // Token expires in 1 hour
    );

    // 5. Return JWT
    res.status(200).json({ token });
});

module.exports = router; 
