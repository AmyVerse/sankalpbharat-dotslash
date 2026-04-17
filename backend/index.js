require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
    res.json({ message: 'Express server is running and ready for Supabase!' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
