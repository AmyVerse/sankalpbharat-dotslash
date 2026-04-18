const express = require("express");
const axios = require("axios");
const { supabase } = require("../supabase");
const router = express.Router();

// --- CONFIGURATION ---
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// GET: Webhook Verification
router.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
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

            // 1. Text Interaction
            if (type === "text") {
                await sendWhatsAppMessage(from, "Hi, thanks for messaging");
            }

            // 2. Location Metadata
            else if (type === "location") {
                const { latitude, longitude } = message.location;
                await sendWhatsAppMessage(
                    from,
                    `ESGAudit has indexed your location: ${latitude}, ${longitude}.`,
                );
            }

            // 3. Media Ingestion
            else if (["video", "audio", "voice", "document", "image"].includes(type)) {
                const mediaData = message[type];
                await sendWhatsAppMessage(from, `Processing your ${type} for cloud archival...`);
                await uploadMediaToCloud(mediaData.id, from, type, mediaData.mime_type);
            }
        }
        return res.sendStatus(200);
    }
    res.sendStatus(404);
});

// --- CLOUD-READY HELPER FUNCTIONS ---

// 1. Send Message via Meta API
async function sendWhatsAppMessage(to, text) {
    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) return;
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
    } catch (error) {
        console.error("❌ Meta Send Error:", error.response?.data || error.message);
    }
}

// 2. Media Upload to Supabase Storage
async function uploadMediaToCloud(mediaId, from, type, mimeType) {
    try {
        const response = await axios({
            method: "GET",
            url: `https://graph.facebook.com/v21.0/${mediaId}`,
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        });

        const fileResponse = await axios({
            method: "GET",
            url: response.data.url,
            responseType: "arraybuffer",
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        });

        const extMap = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "video/mp4": "mp4",
            "audio/ogg": "ogg",
            "application/pdf": "pdf",
        };
        const ext = extMap[mimeType] || "bin";
        const filePath = `${from}/${type}_${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from('whatsapp-media')
            .upload(filePath, fileResponse.data, {
                contentType: mimeType,
                upsert: true
            });

        if (error) throw error;
        await sendWhatsAppMessage(from, `Archive successful.`);

    } catch (error) {
        console.error("❌ Media Archival Error:", error.message);
    }
}


module.exports = router;

