import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// --- Enhanced CORS Configuration ---
// This explicitly allows requests from your React development server.
const corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));
app.use(express.json());

// --- Main API Route ---
app.post('/api/gemini', async (req, res) => {
    console.log('Received request on /api/gemini'); // For debugging
    const { prompt, jsonSchema } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in .env file');
        return res.status(500).json({ error: 'API key is not configured on the server.' });
    }

    // 💡 FIX: Using the correct model from your original project
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    };

    if (jsonSchema) {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: jsonSchema
        };
    }

    try {
        console.log('Sending request to Gemini API...');
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error("Gemini API Error:", result);
            return res.status(apiResponse.status).json({ error: `API request failed: ${result.error?.message || 'Unknown error'}` });
        }
        
        console.log('Successfully received response from Gemini API.');
        res.json(result);

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

app.listen(port, () => {
    console.log(`✅ Backend server listening at http://localhost:${port}`);
    console.log('Waiting for requests from the frontend...');
});