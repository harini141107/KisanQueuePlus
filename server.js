const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- MOCK DATABASE (Temporary storage for the 1-day hackathon) ---
let farmers = [];
let queueEntries = [];
let slots = [
    { slot_id: 1, time: "09:00 AM", max_farmers: 2, booked_count: 0 },
    { slot_id: 2, time: "11:00 AM", max_farmers: 2, booked_count: 0 }
];

// Base test route
app.get('/', (req, res) => {
    res.json({ message: "KisanQueue+ Backend API is running!" });
});

// --- PHASE 2: ROUTE 1 — Farmer Registration + Mock OTP ---
app.post('/api/register', (req, res) => {
    const { name, phone, crop_type, quantity_kg } = req.body;

    if (!name || !phone || !crop_type || !quantity_kg) {
        return res.status(400).json({ error: "Please fill all fields!" });
    }

    const newFarmer = {
        farmer_id: farmers.length + 1,
        name,
        phone,
        crop_type,
        quantity_kg,
        otp_verified: false,
        mock_otp: "1234" 
    };

    farmers.push(newFarmer);

    res.status(201).json({
        message: "Registration successful! OTP sent to your phone.",
        farmer_id: newFarmer.farmer_id,
        note: "DEMO MODE: Use OTP '1234' to login."
    });
});

// --- PHASE 2: ROUTE 2 — Verify OTP ---
app.post('/api/verify-otp', (req, res) => {
    const { farmer_id, otp } = req.body;

    // Find the farmer in our temporary list
    const farmer = farmers.find(f => f.farmer_id === parseInt(farmer_id));

    if (!farmer) {
        return res.status(404).json({ error: "Farmer not found!" });
    }

    // Check if the entered OTP matches '1234'
    if (otp === "1234") {
        farmer.otp_verified = true;
        return res.json({ 
            message: "OTP Verified successfully! Welcome to KisanQueue+.",
            farmer: farmer
        });
    } else {
        return res.status(400).json({ error: "Invalid OTP! Please try '1234'." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is happily running on port ${PORT}`);
});
