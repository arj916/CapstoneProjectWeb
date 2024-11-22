const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();


// Create an Express app
const app = express();
app.use(express.json());
app.use(cors());
// app.use(cors({
//     origin: 'http://your-website.com'  // Replace with your website's domain
//   }));

// Create a MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: 'fallCapstone2024!', // Replace with your MySQL password
    database: 'canpower' // Replace with your database name
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database.');
});

// POST route for addCount
app.post('/add-count', (req, res) => {
    const { device_id, num_charging } = req.body;

    // First, try updating the existing device_id
    const updateSql = 'UPDATE device_data SET counter = counter + ? WHERE device_id = ?';
    db.query(updateSql, [num_charging, device_id], (err, result) => {
        if (err) {
            console.error('Failed to update data:', err.stack);
            res.status(500).send('Error updating value.');
            console.log('Error updating value.');
        } else if (result.affectedRows === 0) {
            // No rows were affected, meaning device_id does not exist, so insert a new row
            const insertSql = 'INSERT INTO device_data (device_id, counter) VALUES (?, ?)';
            db.query(insertSql, [device_id, num_charging], (err, result) => {
                if (err) {
                    console.error('Failed to insert data:', err.stack);
                    res.status(500).send('Error inserting new value.');
                    console.log('Error inserting new value.');
                } else {
                    res.send('New device added and value stored.');
                    console.log('New device added and value stored.');
                }
            });
        } else {
            res.send('Value updated successfully.');
            console.log('Value updated successfully.');
        }
    });
});

// POST route for setCount
app.post('/set-count', (req, res) => {
    const { device_id, count } = req.body;

    // First, try updating the existing device_id
    const updateSql = 'UPDATE device_data SET counter = ? WHERE device_id = ?';
    db.query(updateSql, [count, device_id], (err, result) => {
        if (err) {
            console.error('Failed to update data:', err.stack);
            res.status(500).send('Error updating value.');
            console.log('Error updating value.');
        } 
        else {
            res.send('Value updated successfully.');
            console.log('Value updated successfully.');
        }
    });
});

// POST route for addPoints
app.post('/add-points', (req, res) => {
    const { device_id, points } = req.body;

    // First, try updating the existing device_id
    const updateSql = 'UPDATE device_data SET points = points + ? WHERE device_id = ?';
    db.query(updateSql, [points, device_id], (err, result) => {
        if (err) {
            console.error('Failed to update data:', err.stack);
            res.status(500).send('Error updating value.');
            console.log('Error updating value.');
        }
        else {
            res.send('Value updated successfully.');
            console.log('Value updated successfully.');
        }
    });
});

// GET route for updateCount
app.get('/counter/:deviceId', (req, res) => {
    const deviceId = String(req.params.deviceId);
    console.log('Getting count from: ' + deviceId);
    const query = 'SELECT counter FROM device_data WHERE device_id = ?';
    db.query(query, [deviceId], (err, results) => {
        if (err) {
            console.error('Database query failed: ' + err.stack);
            return res.status(500).send('Database error');
        }
        if (results.length > 0) {
            // Send the count to the frontend
            res.json({ counter: results[0].counter });
        } else {
            res.status(404).send('Device not found');
        }
    });
});

// GET route for getPoints
app.get('/points/:deviceId', (req, res) => {
    const deviceId = String(req.params.deviceId);
    console.log('Getting points from: ' + deviceId);
    const query = 'SELECT points FROM device_data WHERE device_id = ?';
    db.query(query, [deviceId], (err, results) => {
        if (err) {
            console.error('Database query failed: ' + err.stack);
            return res.status(500).send('Database error');
        }
        if (results.length > 0) {
            // Send the points to the frontend
            res.json({ points: results[0].points });
        } else {
            res.status(404).send('Device not found');
        }
    });
});

// Start the server
app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
