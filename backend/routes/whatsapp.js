const express = require("express");
const axios = require("axios");
const fs = require("fs");
const router = express.Router();

// --- CONFIGURATION ---
// These will be picked up from backend/.env
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// GET: Webhook Verification
router.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook Verified Successfully!");
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});

// POST: Receiving Messages
router.post("/webhook", async (req, res) => {
    const body = req.body;
    if (body.object === "whatsapp_business_account") {
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (message) {
            const from = message.from;
            const type = message.type;

            // 1. Text
            if (type === "text") {
                console.log(`📩 Text: ${message.text.body}`);
            }

            // 2. Location
            else if (type === "location") {
                const { latitude, longitude, name, address } = message.location;
                console.log(
                    `📍 Location: ${name || "User"} is at ${latitude}, ${longitude}`,
                );
                await sendWhatsAppMessage(
                    from,
                    `I see you are at ${latitude}, ${longitude}!`,
                );
            }

            // 3. Media Types
            else if (
                ["video", "audio", "voice", "document", "image"].includes(type)
            ) {
                const mediaData = message[type];
                const mediaId = mediaData.id;
                const mimeType = mediaData.mime_type;

                console.log(`📁 Received ${type} (ID: ${mediaId})`);
                await sendWhatsAppMessage(from, `Downloading your ${type}...`);

                // Pass the type and mimeType to our download function
                await downloadMedia(mediaId, from, type, mimeType);
            }
        }
        return res.sendStatus(200);
    }
    res.sendStatus(404);
});

// --- HELPER FUNCTIONS ---

// 1. Send Message Function
async function sendWhatsAppMessage(to, text) {
    try {
        await axios({
            method: "POST",
            url: `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            data: {
                messaging_product: "whatsapp",
                to: to,
                type: "text",
                text: { body: text },
            },
        });
        console.log("📤 Reply sent.");
    } catch (error) {
        console.error("❌ Send Error:", error.response?.data || error.message);
    }
}

// 2. Download Media Function
async function downloadMedia(mediaId, from, type, mimeType) {
    try {
        // A. Get Download URL
        const response = await axios({
            method: "GET",
            url: `https://graph.facebook.com/v21.0/${mediaId}`,
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        });

        // B. Download the file
        const fileResponse = await axios({
            method: "GET",
            url: response.data.url,
            responseType: "arraybuffer",
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        });

        // C. Determine extension
        const extMap = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "video/mp4": "mp4",
            "audio/ogg": "ogg",
            "application/pdf": "pdf",
        };
        const ext = extMap[mimeType] || "bin";
        const fileName = `media_${type}_${Date.now()}.${ext}`;

        fs.writeFileSync(fileName, fileResponse.data);
        console.log(`✅ Saved: ${fileName}`);
        await sendWhatsAppMessage(from, `Saved your ${type} as ${fileName}`);
    } catch (error) {
        console.error("❌ Media Download Error:", error.message);
    }
}

module.exports = router;
