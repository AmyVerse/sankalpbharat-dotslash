const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");

require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api", (req, res) => {
  res.send("Hello from API");
});

// Export the serverless-wrapped app for Vercel
module.exports = serverless(app);
