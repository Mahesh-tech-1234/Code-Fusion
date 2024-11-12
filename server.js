const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/codehub', { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Define User schema and model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes to serve HTML files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/main.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'main.html')));

// API endpoints for login and registration
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            res.send({ success: true });
        } else {
            res.send({ success: false });
        }
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.send({ success: true });
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

// WebSocket setup
const rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Handle room creation
    socket.on('createRoom', (roomId) => {
        rooms[roomId] = { users: [], chat: [] };
        socket.join(roomId);
        io.to(roomId).emit('updateChat', rooms[roomId].chat);
    });
    
    // Handle room joining
    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].users.push(socket.id);
            socket.join(roomId);
            io.to(roomId).emit('updateChat', rooms[roomId].chat);
        }
    });
    
    // Handle chat messages
    socket.on('sendMessage', (roomId, message) => {
        if (rooms[roomId]) {
            rooms[roomId].chat.push(message);
            io.to(roomId).emit('updateChat', rooms[roomId].chat);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
        for (const [roomId, room] of Object.entries(rooms)) {
            const index = room.users.indexOf(socket.id);
            if (index !== -1) {
                room.users.splice(index, 1);
                if (room.users.length === 0) {
                    delete rooms[roomId];
                } else {
                    io.to(roomId).emit('updateChat', room.chat);
                }
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
