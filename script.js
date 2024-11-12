document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();
            if (result.success) {
                window.location.href = 'main.html'; // Redirect to main page on success
            } else {
                alert('Login failed');
            }
        });
    }

    // Registration form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();
            if (result.success) {
                window.location.href = 'login.html'; // Redirect to login page on success
            } else {
                alert('Registration failed');
            }
        });
    }

    // Main page functionalities
    const createRoomBtn = document.getElementById('createRoom');
    const joinRoomBtn = document.getElementById('joinRoom');
    const sendMessageBtn = document.getElementById('sendMessage');
    const roomIdInput = document.getElementById('roomIdInput');
    const chatArea = document.getElementById('chatArea');
    const messageInput = document.getElementById('messageInput');

    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            const roomId = prompt('Enter a room ID:');
            if (roomId) {
                socket.emit('createRoom', roomId);
                roomIdInput.value = roomId;
                window.location.href = 'editor.html'; // Redirect to editor page
            }
        });
    }

    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => {
            const roomId = roomIdInput.value;
            if (roomId) {
                socket.emit('joinRoom', roomId);
                window.location.href = 'editor.html'; // Redirect to editor page
            }
        });
    }

    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', () => {
            const roomId = roomIdInput.value;
            const message = messageInput.value;
            if (roomId && message) {
                socket.emit('sendMessage', roomId, message);
                messageInput.value = '';
            }
        });
    }

    // Handle incoming chat messages
    socket.on('updateChat', (chat) => {
        chatArea.value = chat.join('\n');
    });

    // Editor page functionalities
    if (document.getElementById('editor')) {
        const editor = ace.edit("editor");
        editor.setTheme("ace/theme/monokai");
        editor.session.setMode("ace/mode/javascript");

        // Load existing code from the server
        const roomId = roomIdInput ? roomIdInput.value : null;
        if (roomId) {
            socket.emit('joinRoom', roomId);
        }

        editor.session.on('change', () => {
            const code = editor.getValue();
            if (roomId) {
                socket.emit('updateCode', roomId, code);
            }
        });

        socket.on('updateCode', (code) => {
            editor.setValue(code, -1);
        });

        // Save code to file
        const saveButton = document.getElementById('saveCode');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                const code = editor.getValue();
                const blob = new Blob([code], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'code.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
        }

        // Handle programming language selection
        const languageSelector = document.getElementById('languageSelector');
        if (languageSelector) {
            languageSelector.addEventListener('change', () => {
                const language = languageSelector.value;
                editor.session.setMode(`ace/mode/${language}`);
            });
        }
    }
});
