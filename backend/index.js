const express = require("express");
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "ESGAudit Backend is live", status: "ok" });
});

app.get("/api", (req, res) => {
  res.send("Hello from Symbiosis AI API");
});

// Setup Swagger Documentation at /api-docs
try {
  const swaggerDocument = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8'));
  
  // CDN options to prevent Vercel blank page errors
  const options = {
    explorer: true,
    customCssUrl: "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css",
    customJs: [
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js",
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js"
    ]
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
  console.log('Swagger UI loaded at /api-docs');
} catch (err) {
  console.log('Ensure you have generated swagger.json using scripts/generateSwagger.js');
}

// Attach generic CRUD routes
const crudRoutes = require("./routes/crudRoutes");
const whatsappRoutes = require("./routes/whatsapp");
app.use("/api", crudRoutes);
app.use("/whatsapp", whatsappRoutes);

// Local Development Server listener
// This runs only on your Mac, Vercel ignores it.
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server running on http://localhost:${PORT}`);
    console.log(`📚 Swagger Docs available at http://localhost:${PORT}/api-docs`);
  });
}

// Export the app for Vercel deployment
module.exports = app;