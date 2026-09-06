const express = require('express');
const cors = require('cors');
const path = require('path'); // Core Node module to handle file paths
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- MOCK DATABASE (In-Memory Arrays for 1-Day Fast Build) ---
let farmers = [];
let queueEntries = [];
let slots = [
    { slot_id: 1, time: "09:00 AM", max_farmers: 2, booked_count: 0, avg_service_time_min: 10 },
    { slot_id: 2, time: "11:00 AM", max_farmers: 2, booked_count: 0, avg_service_time_min: 10 }
];

// --- Serve Frontend Dashboard ---
// This tells our server: "When someone visits the home URL, send them the index.html file!"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- ROUTE 1: Farmer Registration + Mock OTP ---
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
        quantity_kg: parseFloat(quantity_kg),
        otp_verified: false,
        mock_otp: "1234" 
    };
    farmers.push(newFarmer);
    res.status(201).json({
        message: "Registration successful!",
        farmer_id: newFarmer.farmer_id,
        note: "Use OTP '1234' to verify."
    });
});

// --- ROUTE 2: Verify OTP ---
app.post('/api/verify-otp', (req, res) => {
    const { farmer_id, otp } = req.body;
    const farmer = farmers.find(f => f.farmer_id === parseInt(farmer_id));
    if (!farmer) return res.status(404).json({ error: "Farmer not found!" });

    if (otp === "1234") {
        farmer.otp_verified = true;
        return res.json({ message: "OTP Verified!", farmer });
    } else {
        return res.status(400).json({ error: "Invalid OTP!" });
    }
});

// --- ROUTE 3: Book Slot (FIFO Queue Algorithm) ---
app.post('/api/book-slot', (req, res) => {
    const { farmer_id, slot_id } = req.body;
    const slot = slots.find(s => s.slot_id === parseInt(slot_id));
    if (!slot) return res.status(404).json({ error: "Slot not found!" });

    if (slot.booked_count >= slot.max_farmers) {
        return res.status(400).json({ error: "Slot is full! Choose another time." });
    }

    const newPosition = slot.booked_count + 1;
    const newBooking = {
        queue_id: queueEntries.length + 1,
        farmer_id: parseInt(farmer_id),
        slot_id: parseInt(slot_id),
        booking_time: new Date(),
        queue_position: newPosition,
        status: 'booked'
    };

    queueEntries.push(newBooking);
    slot.booked_count += 1;

    const estimatedWait = newPosition * slot.avg_service_time_min;
    res.status(201).json({
        message: "Slot booked successfully!",
        queue_position: newPosition,
        eta_minutes: estimatedWait
    });
});

// --- ROUTE 4: Fetch Live Queue Status for a Farmer ---
app.get('/api/queue-status/:farmerId', (req, res) => {
    const farmerId = parseInt(req.params.farmerId);
    const entry = queueEntries.find(e => e.farmer_id === farmerId);

    if (!entry) {
        return res.status(404).json({ error: "No active queue entry found for this farmer." });
    }

    const slot = slots.find(s => s.slot_id === entry.slot_id);
    const estimatedWait = entry.queue_position * (slot ? slot.avg_service_time_min : 10);

    res.json({
        queue_id: entry.queue_id,
        position: entry.queue_position,
        status: entry.status,
        eta_minutes: estimatedWait
    });
});

// --- ROUTE 5: Update Queue/Procurement Status (Admin Bypass) ---
app.put('/api/update-status/:farmerId', (req, res) => {
    const farmerId = parseInt(req.params.farmerId);
    const { status } = req.body;

    const entry = queueEntries.find(e => e.farmer_id === farmerId);
    if (!entry) return res.status(404).json({ error: "Queue entry not found." });

    entry.status = status;

    if (status === 'completed') {
        queueEntries.forEach(e => {
            if (e.slot_id === entry.slot_id && e.queue_position > entry.queue_position) {
                e.queue_position -= 1;
            }
        });
    }

    res.json({ message: "Status updated successfully!", current_entry: entry });
});

app.listen(PORT, () => {
    console.log(`Server is happily running on port ${PORT}`);
});
