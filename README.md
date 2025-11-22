# LPTack - Multiplayer Tic-Tac-Toe

A beautiful multiplayer tic-tac-toe game with glassmorphic iOS-style design, built with HTML, CSS, JavaScript, and Supabase.

## Setup Instructions

### 1. Database Setup

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `supabase_setup.sql` to create the necessary tables and policies

### 2. Enable Realtime

1. In your Supabase dashboard, go to Database > Replication
2. Enable replication for both the `games` and `rooms` tables

### 3. Run the Application

Simply open `index.html` in a web browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Features

- ✨ Beautiful glassmorphic iOS-style UI with multiple themes
- 🔐 User authentication with unique usernames
- 🎮 Real-time multiplayer gameplay
- 🏠 Room system - Create and join rooms with codes
- 👥 Friends system - Add friends by username and play together
- 🎨 Theme switcher - Choose from 6 beautiful themes (Dark, Light, Purple, Green, Blue, Orange)
- 📱 Fully responsive design
- ⚡ Instant game updates via Supabase Realtime

## How to Play

### Quick Match
1. Sign up or sign in to create an account (choose a unique username!)
2. Click "Find Match" to start looking for a random opponent
3. Once matched, take turns placing X or O on the board
4. First player to get 3 in a row wins!

### Create a Room
1. Click "Create Room" to generate a room code
2. Share the 6-character code with your friend
3. They can join using "Join Room" and entering the code
4. Start playing once both players are in!

### Play with Friends
1. Click the friends icon (👥) in the header
2. Go to "Add Friend" tab and search for a username
3. Send a friend request
4. Once accepted, you can invite them to play directly from the friends list

### Change Theme
1. Click the theme icon (🎨) in the header
2. Choose from 6 beautiful themes
3. Your preference is saved automatically

Enjoy playing LPTack! 🎉

