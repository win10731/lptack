// Supabase Configuration
const SUPABASE_URL = 'https://jqbkvqgcxxotjfxybury.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYmt2cWdjeHhvdGpmeHlidXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTI2NTEsImV4cCI6MjA3OTMyODY1MX0.yvJo9e-QFnE7kJRC1QkwbD9iHw6THQ7TEYDeGCPd3jg';

// Create Supabase client with proper configuration
const supabaseOptions = {
    db: { 
        schema: 'public'
    },
    auth: { 
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    realtime: { 
        params: { eventsPerSecond: 10 }
    }
};

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseOptions);

// Game State
let currentUser = null;
let currentGame = null;
let currentRoom = null;
let gameChannel = null;
let playerSymbol = null;
let isMyTurn = false;
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameStatus = 'waiting';
let friendsList = [];
let friendRequests = [];
let uiVersion = 'enhanced'; // 'current' or 'enhanced'

// DOM Elements
const authScreen = document.getElementById('authScreen');
const gameScreen = document.getElementById('gameScreen');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginFormElement = document.getElementById('loginFormElement');
const signupFormElement = document.getElementById('signupFormElement');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userInitial = document.getElementById('userInitial');
const findGameBtn = document.getElementById('findGameBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const playFriendBtn = document.getElementById('playFriendBtn');
const waitingMessage = document.getElementById('waitingMessage');
const lobby = document.getElementById('lobby');
const gameBoardElement = document.getElementById('gameBoard');
const board = document.getElementById('board');
const gameStatusElement = document.getElementById('gameStatus');
const newGameBtn = document.getElementById('newGameBtn');
const authError = document.getElementById('authError');
const signupError = document.getElementById('signupError');
const roomSection = document.getElementById('roomSection');
const roomCode = document.getElementById('roomCode');
const copyRoomCode = document.getElementById('copyRoomCode');
const joinRoomSection = document.getElementById('joinRoomSection');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomCodeBtn = document.getElementById('joinRoomCodeBtn');
const cancelJoinRoomBtn = document.getElementById('cancelJoinRoomBtn');
const friendsBtn = document.getElementById('friendsBtn');
const themeToggle = document.getElementById('themeToggle');
const friendsModal = document.getElementById('friendsModal');
const closeFriendsModal = document.getElementById('closeFriendsModal');
const themeModal = document.getElementById('themeModal');
const closeThemeModal = document.getElementById('closeThemeModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadTheme();
    setupBobTrigger();
    
    // Load UI version
    const savedUIVersion = localStorage.getItem('uiVersion') || 'enhanced';
    if (savedUIVersion === 'current') {
        revertToCurrentUI();
    } else {
        applyEnhancedUI();
    }
});

// Check if user is already logged in
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
            currentUser = session.user;
            await loadUserProfile();
            showGameScreen();
        } else {
            showAuthScreen();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showAuthScreen();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Auth form switching
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.remove('active');
        signupForm.classList.add('active');
        clearErrors();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.remove('active');
        loginForm.classList.add('active');
        clearErrors();
    });

    // Login
    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await handleLogin(email, password);
    });

    // Signup
    signupFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const username = document.getElementById('signupUsername').value.toLowerCase();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        await handleSignup(name, username, email, password);
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await handleLogout();
    });

    // Game buttons
    findGameBtn.addEventListener('click', async () => {
        await findGame();
    });

    createRoomBtn.addEventListener('click', async () => {
        await createRoom();
    });

    joinRoomBtn.addEventListener('click', () => {
        joinRoomSection.classList.remove('hidden');
        roomSection.classList.add('hidden');
    });

    cancelJoinRoomBtn.addEventListener('click', () => {
        joinRoomSection.classList.add('hidden');
        roomCodeInput.value = '';
    });

    joinRoomCodeBtn.addEventListener('click', async () => {
        const code = roomCodeInput.value.toUpperCase().trim();
        if (code.length === 6) {
            await joinRoomByCode(code);
        } else {
            showError(authError, 'Room code must be 6 characters');
        }
    });

    playFriendBtn.addEventListener('click', () => {
        openFriendsModal();
    });

    copyRoomCode.addEventListener('click', () => {
        navigator.clipboard.writeText(roomCode.textContent);
        copyRoomCode.textContent = '✓';
        setTimeout(() => {
            copyRoomCode.textContent = '📋';
        }, 2000);
    });

    // New Game
    newGameBtn.addEventListener('click', async () => {
        await resetGame();
    });

    // Board cells
    board.addEventListener('click', async (e) => {
        if (e.target.classList.contains('cell') && !e.target.classList.contains('filled')) {
            const index = parseInt(e.target.dataset.index);
            if (isMyTurn && gameStatus === 'playing' && gameBoard[index] === '') {
                await makeMove(index);
            }
        }
    });

    // Friends modal
    friendsBtn.addEventListener('click', openFriendsModal);
    closeFriendsModal.addEventListener('click', () => {
        friendsModal.classList.add('hidden');
    });

    // Theme modal
    themeToggle.addEventListener('click', () => {
        themeModal.classList.remove('hidden');
    });
    closeThemeModal.addEventListener('click', () => {
        themeModal.classList.add('hidden');
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            
            // Map tab names to actual element IDs
            const tabIdMap = {
                'friends': 'friendsTab',
                'add': 'addFriendTab',
                'requests': 'requestsTab'
            };
            
            const tabId = tabIdMap[tab] || `${tab}Tab`;
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
            }
            
            if (tab === 'friends') {
                loadFriends();
            } else if (tab === 'requests') {
                loadFriendRequests();
            }
        });
    });

    // Theme selection
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            setTheme(theme);
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
        });
    });

    // Search friend
    document.getElementById('searchFriendBtn').addEventListener('click', async () => {
        const username = document.getElementById('searchUsername').value.trim();
        if (username) {
            await searchUser(username);
        }
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            showAuthScreen();
            cleanupGame();
        } else if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            loadUserProfile();
            showGameScreen();
        }
    });

    // Close modals on outside click
    friendsModal.addEventListener('click', (e) => {
        if (e.target === friendsModal) {
            friendsModal.classList.add('hidden');
        }
    });

    themeModal.addEventListener('click', (e) => {
        if (e.target === themeModal) {
            themeModal.classList.add('hidden');
        }
    });
}

// Authentication Functions
async function handleLogin(email, password) {
    clearErrors();
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        currentUser = data.user;
        await loadUserProfile();
        showGameScreen();
    } catch (error) {
        showError(authError, error.message || 'Login failed');
    }
}

async function handleSignup(name, username, email, password) {
    clearErrors();
    
    // Validate username
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        showError(signupError, 'Username must be 3-20 characters, letters, numbers, and underscores only');
        return;
    }

    try {
        // Check if username exists
        const { data: existingUser, error: usernameCheckError } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle();

        if (usernameCheckError && usernameCheckError.code !== 'PGRST116') {
            console.error('Username check error:', usernameCheckError);
        }

        if (existingUser) {
            showError(signupError, 'Username already taken');
            return;
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name,
                    username: username
                }
            }
        });

        if (error) throw error;

        // Create user profile
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    name: name,
                    username: username,
                    email: email,
                    theme: 'dark'
                });

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Still show success if auth worked
            }

            showError(signupError, 'Account created! Please sign in.', 'success');
            setTimeout(() => {
                signupForm.classList.remove('active');
                loginForm.classList.add('active');
            }, 2000);
        }
    } catch (error) {
        showError(signupError, error.message || 'Signup failed');
    }
}

async function handleLogout() {
    cleanupGame();
    await supabase.auth.signOut();
    showAuthScreen();
}

async function loadUserProfile() {
    if (!currentUser) return;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('name, username, theme')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Profile load error:', error);
            // Fallback to email if profile doesn't exist
            if (userName) {
                userName.textContent = currentUser.email;
            }
            if (userInitial) {
                userInitial.textContent = currentUser.email.charAt(0).toUpperCase();
            }
            return;
        }

        if (data && userName && userInitial) {
            userName.textContent = data.name || data.username || currentUser.email;
            userInitial.textContent = (data.name || data.username || currentUser.email).charAt(0).toUpperCase();
            
            if (data.theme) {
                setTheme(data.theme);
            }
        } else if (userName && userInitial) {
            userName.textContent = currentUser.email;
            userInitial.textContent = currentUser.email.charAt(0).toUpperCase();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        if (userName) {
            userName.textContent = currentUser.email;
        }
        if (userInitial) {
            userInitial.textContent = currentUser.email.charAt(0).toUpperCase();
        }
    }
}

// Screen Management
function showAuthScreen() {
    authScreen.classList.add('active');
    gameScreen.classList.remove('active');
}

function showGameScreen() {
    authScreen.classList.remove('active');
    gameScreen.classList.add('active');
    resetGame();
    loadFriends();
}

function clearErrors() {
    authError.classList.remove('show');
    signupError.classList.remove('show');
    authError.textContent = '';
    signupError.textContent = '';
}

function showError(element, message, type = 'error') {
    if (!element) {
        console.error('Error element not found:', message);
        return;
    }
    element.textContent = message;
    element.classList.add('show');
    if (type === 'success') {
        element.style.background = 'rgba(52, 199, 89, 0.2)';
        element.style.borderColor = 'rgba(52, 199, 89, 0.3)';
        element.style.color = '#34C759';
    } else {
        element.style.background = 'rgba(255, 59, 48, 0.2)';
        element.style.borderColor = 'rgba(255, 59, 48, 0.3)';
        element.style.color = '#FF3B30';
    }
}

// Matchmaking poll interval
let matchmakingPollInterval = null;

function startMatchmakingPoll(gameId) {
    // Clear any existing poll
    if (matchmakingPollInterval) {
        clearInterval(matchmakingPollInterval);
    }
    
    let pollCount = 0;
    const maxPolls = 60; // Poll for 60 seconds max
    
    matchmakingPollInterval = setInterval(async () => {
        pollCount++;
        
        if (pollCount > maxPolls) {
            clearInterval(matchmakingPollInterval);
            matchmakingPollInterval = null;
            showToast('Matchmaking timeout. Please try again.', 'error');
            if (findGameBtn) findGameBtn.disabled = false;
            if (waitingMessage) waitingMessage.classList.add('hidden');
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('games')
                .select('*')
                .eq('id', gameId)
                .maybeSingle();
            
            if (error) {
                console.error('Poll error:', error);
                return;
            }
            
            if (data && data.player2_id && data.status === 'playing') {
                clearInterval(matchmakingPollInterval);
                matchmakingPollInterval = null;
                currentGame = data;
                updateGameUI();
                showToast('Opponent joined! Game starting...', 'success');
            }
        } catch (error) {
            console.error('Error polling game:', error);
        }
    }, 1000); // Poll every second
}

function stopMatchmakingPoll() {
    if (matchmakingPollInterval) {
        clearInterval(matchmakingPollInterval);
        matchmakingPollInterval = null;
    }
}

// Game Functions
async function findGame() {
    if (!findGameBtn || !currentUser) return;
    
    findGameBtn.disabled = true;
    if (waitingMessage) {
        waitingMessage.classList.remove('hidden');
    }
    showToast('Searching for opponent...', 'info');

    try {
        // Check for existing waiting games (exclude your own)
        const { data: waitingGames, error: findError } = await supabase
            .from('games')
            .select('id, player1_id, player2_id, status, board, current_turn, winner')
            .eq('status', 'waiting')
            .neq('player1_id', currentUser.id)
            .is('player2_id', null)
            .limit(1)
            .maybeSingle();

        if (findError) {
            console.error('Error finding games:', findError);
            // Continue to create game even if query fails
        }

        if (waitingGames && !findError) {
            showToast('Opponent found! Joining...', 'success');
            await joinGame(waitingGames.id);
        } else {
            showToast('Creating game... Waiting for opponent...', 'info');
            await createGame();
        }
    } catch (error) {
        console.error('Find game error:', error);
        showToast('Error finding match. Please try again.', 'error');
        if (findGameBtn) {
            findGameBtn.disabled = false;
        }
        if (waitingMessage) {
            waitingMessage.classList.add('hidden');
        }
        stopMatchmakingPoll();
    }
}

async function createGame() {
    try {
        const { data, error } = await supabase
            .from('games')
            .insert({
                player1_id: currentUser.id,
                player2_id: null,
                status: 'waiting',
                board: ['', '', '', '', '', '', '', '', ''],
                current_turn: 'player1',
                winner: null
            })
            .select('*')
            .single();

        if (error) {
            console.error('Error creating game:', error);
            showToast('Failed to create game. Please try again.', 'error');
            if (findGameBtn) findGameBtn.disabled = false;
            if (waitingMessage) waitingMessage.classList.add('hidden');
            return;
        }

        if (!data) {
            showToast('Failed to create game', 'error');
            if (findGameBtn) findGameBtn.disabled = false;
            if (waitingMessage) waitingMessage.classList.add('hidden');
            return;
        }

        currentGame = data;
        playerSymbol = 'X';
        subscribeToGame(data.id);
        
        // Also poll for opponent joining as backup
        startMatchmakingPoll(data.id);
    } catch (error) {
        console.error('Error creating game:', error);
        showToast('An error occurred while creating the game', 'error');
        if (findGameBtn) findGameBtn.disabled = false;
        if (waitingMessage) waitingMessage.classList.add('hidden');
    }
}

async function joinGame(gameId) {
    try {
        stopMatchmakingPoll(); // Stop any polling
        
        const { data, error } = await supabase
            .from('games')
            .update({
                player2_id: currentUser.id,
                status: 'playing',
                current_turn: 'player1'
            })
            .eq('id', gameId)
            .select('*')
            .single();

        if (error) {
            console.error('Error joining game:', error);
            showToast('Failed to join game. It may have been taken.', 'error');
            if (findGameBtn) findGameBtn.disabled = false;
            if (waitingMessage) waitingMessage.classList.add('hidden');
            return;
        }

        if (!data) {
            showToast('Game not found or already started', 'error');
            if (findGameBtn) findGameBtn.disabled = false;
            if (waitingMessage) waitingMessage.classList.add('hidden');
            return;
        }

        currentGame = data;
        playerSymbol = 'O';
        subscribeToGame(gameId);
        
        // Small delay to ensure UI updates
        setTimeout(() => {
            updateGameUI();
        }, 300);
    } catch (error) {
        console.error('Error joining game:', error);
        showToast('An error occurred while joining the game', 'error');
        if (findGameBtn) findGameBtn.disabled = false;
        if (waitingMessage) waitingMessage.classList.add('hidden');
        stopMatchmakingPoll();
    }
}

// Room Functions
async function createRoom() {
    showToast('Creating room...', 'info');
    
    try {
        const roomCodeValue = generateRoomCode();
        
        const { data, error } = await supabase
            .from('rooms')
            .insert({
                code: roomCodeValue,
                host_id: currentUser.id,
                player1_id: currentUser.id,
                player2_id: null,
                status: 'waiting',
                board: ['', '', '', '', '', '', '', '', ''],
                current_turn: 'player1',
                winner: null
            })
            .select('*')
            .single();

        if (error) {
            console.error('Error creating room:', error);
            // Try again with maybeSingle if single fails
            const { data: retryData, error: retryError } = await supabase
                .from('rooms')
                .select('*')
                .eq('code', roomCodeValue)
                .maybeSingle();
            
            if (retryError || !retryData) {
                showToast('Failed to create room. Please try again.', 'error');
                return;
            }
            
            currentRoom = retryData;
            currentGame = retryData;
        } else if (data) {
            currentRoom = data;
            currentGame = data;
        } else {
            showToast('Failed to create room', 'error');
            return;
        }

        playerSymbol = 'X';
        
        if (roomCode) {
            roomCode.textContent = roomCodeValue;
        }
        if (roomSection) {
            roomSection.classList.remove('hidden');
        }
        if (joinRoomSection) {
            joinRoomSection.classList.add('hidden');
        }
        
        showToast(`Room created! Code: ${roomCodeValue}`, 'success');
        subscribeToRoom(currentRoom.id);
    } catch (error) {
        console.error('Error creating room:', error);
        showToast('An error occurred while creating the room', 'error');
    }
}

async function joinRoomByCode(code) {
    if (!code || code.trim().length !== 6) {
        showToast('Please enter a valid 6-character room code', 'error');
        return;
    }

    showToast('Joining room...', 'info');
    
    try {
        // Try with explicit select first
        let room = null;
        let findError = null;
        
        // Try with select * first (simpler, less likely to cause 406)
        const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('code', code.toUpperCase().trim())
            .eq('status', 'waiting')
            .maybeSingle();
        
        room = roomData;
        findError = roomError;
        
        // If that fails with 406, try with minimal columns
        if (findError && (findError.code === '406' || findError.message?.includes('406'))) {
            const { data: retryData, error: retryError } = await supabase
                .from('rooms')
                .select('id, player1_id, player2_id, status')
                .eq('code', code.toUpperCase().trim())
                .eq('status', 'waiting')
                .maybeSingle();
            
            if (!retryError && retryData) {
                // Fetch full data separately
                const { data: fullData } = await supabase
                    .from('rooms')
                    .select('*')
                    .eq('id', retryData.id)
                    .maybeSingle();
                
                if (fullData) {
                    room = fullData;
                    findError = null;
                }
            }
        }

        if (findError) {
            console.error('Error finding room:', findError);
            showToast('Failed to find room. Please check the code.', 'error');
            return;
        }

        if (!room) {
            showToast('Room not found or already started', 'error');
            return;
        }

        if (room.player2_id) {
            showToast('Room is full', 'error');
            return;
        }

        if (room.player1_id === currentUser.id) {
            showToast('You cannot join your own room', 'error');
            return;
        }

        // Try update with explicit columns
        let updateError = null;
        let updateData = null;
        
        // Try update with select * first
        const { data: updateResult, error: updateErr } = await supabase
            .from('rooms')
            .update({
                player2_id: currentUser.id,
                status: 'playing',
                current_turn: 'player1'
            })
            .eq('id', room.id)
            .select('*')
            .maybeSingle();

        updateData = updateResult;
        updateError = updateErr;

        // If that fails with 406, try without select and fetch separately
        if (updateError && (updateError.code === '406' || updateError.message?.includes('406') || updateError.code === 'PGRST116')) {
            // First update without select
            const { error: updateOnlyError } = await supabase
                .from('rooms')
                .update({
                    player2_id: currentUser.id,
                    status: 'playing',
                    current_turn: 'player1'
                })
                .eq('id', room.id);

            if (!updateOnlyError) {
                // Then fetch the updated room with select *
                const { data: fetchedRoom, error: fetchError } = await supabase
                    .from('rooms')
                    .select('*')
                    .eq('id', room.id)
                    .maybeSingle();

                if (!fetchError && fetchedRoom) {
                    updateData = fetchedRoom;
                    updateError = null;
                } else if (fetchError && (fetchError.code === '406' || fetchError.message?.includes('406'))) {
                    // If fetch also fails, construct data from what we know
                    updateData = {
                        ...room,
                        player2_id: currentUser.id,
                        status: 'playing',
                        current_turn: 'player1'
                    };
                    updateError = null;
                }
            }
        }

        if (updateError) {
            console.error('Error updating room:', updateError);
            showToast('Failed to join room. Please try again.', 'error');
            return;
        }

        if (!updateData) {
            showToast('Failed to join room', 'error');
            return;
        }

        currentRoom = updateData;
        currentGame = updateData;
        playerSymbol = 'O';
        
        if (updateData.id) {
            subscribeToRoom(updateData.id);
        }
        
        if (joinRoomSection) {
            joinRoomSection.classList.add('hidden');
        }
        if (roomCodeInput) {
            roomCodeInput.value = '';
        }
        
        showToast('Successfully joined room! Game starting...', 'success');
        
        // Small delay to ensure UI updates
        setTimeout(() => {
            updateGameUI();
        }, 500);
    } catch (error) {
        console.error('Error joining room:', error);
        showToast('An error occurred while joining the room', 'error');
    }
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function subscribeToRoom(roomId) {
    if (gameChannel) {
        supabase.removeChannel(gameChannel);
    }

    gameChannel = supabase
        .channel(`room:${roomId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`
        }, async (payload) => {
            try {
                await handleGameUpdate(payload);
            } catch (error) {
                console.error('Error handling room update:', error);
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Subscribed to room:', roomId);
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Channel error for room:', roomId);
            }
        });
}

function subscribeToGame(gameId) {
    if (gameChannel) {
        supabase.removeChannel(gameChannel);
    }

    gameChannel = supabase
        .channel(`game:${gameId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${gameId}`
        }, async (payload) => {
            await handleGameUpdate(payload);
        })
        .subscribe();

    // Check for player2 joining
    const checkInterval = setInterval(async () => {
        if (currentGame && currentGame.status === 'waiting') {
            try {
                const { data } = await supabase
                    .from('games')
                    .select('*')
                    .eq('id', gameId)
                    .maybeSingle();

                if (data && data.player2_id) {
                    currentGame = data;
                    if (data.player1_id === currentUser.id) {
                        playerSymbol = 'X';
                    } else {
                        playerSymbol = 'O';
                    }
                    updateGameUI();
                    clearInterval(checkInterval);
                }
            } catch (error) {
                console.error('Error checking game:', error);
            }
        } else {
            clearInterval(checkInterval);
        }
    }, 1000);
}

async function handleGameUpdate(payload) {
    try {
        if (!payload || !payload.new) {
            // If payload doesn't have new data, fetch it directly
            if (currentGame && currentGame.id) {
                const tableName = currentRoom ? 'rooms' : 'games';
                
                // Try with select * first
                let { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq('id', currentGame.id)
                    .maybeSingle();
                
                // If 406 error, try minimal select
                if (error && (error.code === '406' || error.message?.includes('406'))) {
                    const { data: minimalData, error: minimalError } = await supabase
                        .from(tableName)
                        .select('id, player1_id, player2_id, status, board, current_turn, winner')
                        .eq('id', currentGame.id)
                        .maybeSingle();
                    
                    if (!minimalError && minimalData) {
                        // Merge with existing data
                        data = { ...currentGame, ...minimalData };
                        error = null;
                    }
                }
                
                if (error) {
                    console.error('Error fetching game update:', error);
                    return;
                }
                
                if (data) {
                    currentGame = data;
                    if (currentRoom) {
                        currentRoom = data;
                    }
                } else {
                    return;
                }
            } else {
                return;
            }
        } else {
            currentGame = payload.new;
            if (currentRoom) {
                currentRoom = payload.new;
            }
        }
        
        gameBoard = currentGame.board || ['', '', '', '', '', '', '', '', ''];
        
        if (currentGame.status === 'playing') {
            updateGameUI();
            checkTurn();
        } else if (currentGame.status === 'finished') {
            updateGameUI();
            showGameResult();
        } else if (currentGame.status === 'waiting' && currentGame.player2_id) {
            updateGameUI();
            showToast('Opponent joined! Game starting...', 'success');
        }
    } catch (error) {
        console.error('Error in handleGameUpdate:', error);
    }
}

async function makeMove(index) {
    if (gameBoard[index] !== '' || !isMyTurn || gameStatus !== 'playing') {
        return;
    }

    gameBoard[index] = playerSymbol;

    const currentTurn = currentGame.current_turn === 'player1' ? 'player2' : 'player1';
    const winner = checkWinner(gameBoard);
    const isDraw = !winner && gameBoard.every(cell => cell !== '');
    
    const status = winner || isDraw ? 'finished' : 'playing';

    const tableName = currentRoom ? 'rooms' : 'games';
    
    try {
        const { error } = await supabase
            .from(tableName)
            .update({
                board: gameBoard,
                current_turn: currentTurn,
                status: status,
                winner: winner
            })
            .eq('id', currentGame.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error making move:', error);
        gameBoard[index] = '';
    }
}

function checkTurn() {
    if (!currentGame) return;

    const isPlayer1 = currentGame.player1_id === currentUser.id;
    const currentTurnIsPlayer1 = currentGame.current_turn === 'player1';
    
    isMyTurn = (isPlayer1 && currentTurnIsPlayer1) || (!isPlayer1 && !currentTurnIsPlayer1);
    
    const player1Turn = document.getElementById('player1Turn');
    const player2Turn = document.getElementById('player2Turn');
    
    if (isPlayer1) {
        player1Turn.textContent = isMyTurn ? 'Your Turn' : 'Waiting';
        player1Turn.classList.toggle('active', isMyTurn);
        player2Turn.textContent = !isMyTurn ? 'Your Turn' : 'Waiting';
        player2Turn.classList.toggle('active', !isMyTurn);
    } else {
        player1Turn.textContent = !isMyTurn ? 'Your Turn' : 'Waiting';
        player1Turn.classList.toggle('active', !isMyTurn);
        player2Turn.textContent = isMyTurn ? 'Your Turn' : 'Waiting';
        player2Turn.classList.toggle('active', isMyTurn);
    }
}

function checkWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    return null;
}

function updateGameUI() {
    if (!currentGame) return;

    updatePlayerNames();
    
    gameBoard = currentGame.board || ['', '', '', '', '', '', '', '', ''];
    const cells = board.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.textContent = gameBoard[index];
        cell.classList.remove('x', 'o', 'filled');
        if (gameBoard[index]) {
            cell.classList.add(gameBoard[index].toLowerCase(), 'filled');
        }
    });

    if (currentGame.status === 'playing') {
        gameStatus = 'playing';
        gameStatusElement.textContent = '';
        checkTurn();
    } else if (currentGame.status === 'waiting') {
        gameStatus = 'waiting';
        gameStatusElement.textContent = 'Waiting for opponent...';
    }

    if (currentGame.status === 'waiting') {
        if (lobby) lobby.classList.remove('hidden');
        if (gameBoardElement) gameBoardElement.classList.add('hidden');
        if (roomSection && currentRoom) {
            roomSection.classList.remove('hidden');
        }
    } else {
        if (lobby) lobby.classList.add('hidden');
        if (gameBoardElement) gameBoardElement.classList.remove('hidden');
        if (waitingMessage) waitingMessage.classList.add('hidden');
        if (findGameBtn) findGameBtn.disabled = false;
        if (roomSection) roomSection.classList.add('hidden');
        if (joinRoomSection) joinRoomSection.classList.add('hidden');
    }
}

async function updatePlayerNames() {
    if (!currentGame) return;

    try {
        const player1NameEl = document.getElementById('player1Name');
        const player1InitialEl = document.getElementById('player1Initial');
        const player2NameEl = document.getElementById('player2Name');
        const player2InitialEl = document.getElementById('player2Initial');

        if (!player1NameEl || !player1InitialEl) return;

        const { data: player1Data } = await supabase
            .from('profiles')
            .select('name, username')
            .eq('id', currentGame.player1_id)
            .maybeSingle();

        const player1Name = player1Data?.name || player1Data?.username || 'Player 1';
        player1NameEl.textContent = player1Name;
        player1InitialEl.textContent = player1Name.charAt(0).toUpperCase();

        if (currentGame.player2_id) {
            if (!player2NameEl || !player2InitialEl) return;

            const { data: player2Data } = await supabase
                .from('profiles')
                .select('name, username')
                .eq('id', currentGame.player2_id)
                .maybeSingle();

            const player2Name = player2Data?.name || player2Data?.username || 'Player 2';
            player2NameEl.textContent = player2Name;
            player2InitialEl.textContent = player2Name.charAt(0).toUpperCase();
        } else {
            if (player2NameEl && player2InitialEl) {
                player2NameEl.textContent = 'Waiting...';
                player2InitialEl.textContent = '?';
            }
        }
    } catch (error) {
        console.error('Error updating player names:', error);
    }
}

function showGameResult() {
    if (!currentGame) return;

    const winner = currentGame.winner;
    const isPlayer1 = currentGame.player1_id === currentUser.id;
    const mySymbol = isPlayer1 ? 'X' : 'O';

    if (winner === mySymbol) {
        gameStatusElement.textContent = '🎉 You Win!';
        gameStatusElement.classList.add('winner');
    } else if (winner) {
        gameStatusElement.textContent = '😔 You Lose!';
        gameStatusElement.classList.remove('winner');
    } else {
        gameStatusElement.textContent = '🤝 It\'s a Draw!';
        gameStatusElement.classList.add('draw');
    }

    newGameBtn.classList.remove('hidden');
    gameStatus = 'finished';
}

async function resetGame() {
    cleanupGame();
    stopMatchmakingPoll(); // Stop any matchmaking polls
    
    if (lobby) lobby.classList.remove('hidden');
    if (gameBoardElement) gameBoardElement.classList.add('hidden');
    if (waitingMessage) waitingMessage.classList.add('hidden');
    if (newGameBtn) newGameBtn.classList.add('hidden');
    if (roomSection) roomSection.classList.add('hidden');
    if (joinRoomSection) joinRoomSection.classList.add('hidden');
    if (gameStatusElement) {
        gameStatusElement.textContent = '';
        gameStatusElement.classList.remove('winner', 'draw');
    }
    if (findGameBtn) findGameBtn.disabled = false;
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    
    if (board) {
        const cells = board.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('x', 'o', 'filled');
        });
    }
}

function cleanupGame() {
    if (gameChannel) {
        supabase.removeChannel(gameChannel);
        gameChannel = null;
    }
    currentGame = null;
    currentRoom = null;
    playerSymbol = null;
    isMyTurn = false;
    gameStatus = 'waiting';
}

// Friends Functions
async function loadFriends() {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .select('*')
            .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
            .eq('status', 'accepted');

        if (error) throw error;

        // Fetch profile data for each friend
        const friendsWithProfiles = await Promise.all(
            (data || []).map(async (friendship) => {
                const friendId = friendship.user1_id === currentUser.id 
                    ? friendship.user2_id 
                    : friendship.user1_id;
                
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, name, username')
                    .eq('id', friendId)
                    .maybeSingle();

                return {
                    ...friendship,
                    friend: profile || { id: friendId, name: null, username: null }
                };
            })
        );

        friendsList = friendsWithProfiles;
        displayFriends();
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

function displayFriends() {
    const friendsListEl = document.getElementById('friendsList');
    friendsListEl.innerHTML = '';

    if (friendsList.length === 0) {
        friendsListEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No friends yet</p>';
        return;
    }

    friendsList.forEach(friendship => {
        const friend = friendship.friend;
        const friendName = friend.name || friend.username || 'Unknown';
        const friendInitial = friendName.charAt(0).toUpperCase();

        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        friendItem.innerHTML = `
            <div class="friend-info">
                <div class="friend-avatar">${friendInitial}</div>
                <div>
                    <div style="font-weight: 600;">${friendName}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">@${friend.username || 'unknown'}</div>
                </div>
            </div>
            <div class="friend-actions">
                <button class="btn-primary btn-small" onclick="playWithFriend('${friend.id}')">Play</button>
            </div>
        `;
        friendsListEl.appendChild(friendItem);
    });
}

async function playWithFriend(friendId) {
    friendsModal.classList.add('hidden');
    
    try {
        const { data, error } = await supabase
            .from('games')
            .insert({
                player1_id: currentUser.id,
                player2_id: friendId,
                status: 'playing',
                board: ['', '', '', '', '', '', '', '', ''],
                current_turn: 'player1',
                winner: null
            })
            .select()
            .single();

        if (error) throw error;

        currentGame = data;
        playerSymbol = 'X';
        subscribeToGame(data.id);
        updateGameUI();
    } catch (error) {
        console.error('Error creating game with friend:', error);
        showError(authError, 'Failed to start game');
    }
}

async function loadFriendRequests() {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .select('*')
            .eq('user2_id', currentUser.id)
            .eq('status', 'pending');

        if (error) throw error;

        // Fetch profile data for each requester
        const requestsWithProfiles = await Promise.all(
            (data || []).map(async (friendship) => {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, name, username')
                    .eq('id', friendship.user1_id)
                    .maybeSingle();

                return {
                    ...friendship,
                    user1: profile || { id: friendship.user1_id, name: null, username: null }
                };
            })
        );

        friendRequests = requestsWithProfiles;
        displayFriendRequests();
    } catch (error) {
        console.error('Error loading friend requests:', error);
    }
}

function displayFriendRequests() {
    const requestsListEl = document.getElementById('friendRequestsList');
    requestsListEl.innerHTML = '';

    if (friendRequests.length === 0) {
        requestsListEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No pending requests</p>';
        return;
    }

    friendRequests.forEach(friendship => {
        const friend = friendship.user1;
        const friendName = friend.name || friend.username || 'Unknown';
        const friendInitial = friendName.charAt(0).toUpperCase();

        const requestItem = document.createElement('div');
        requestItem.className = 'friend-item';
        requestItem.innerHTML = `
            <div class="friend-info">
                <div class="friend-avatar">${friendInitial}</div>
                <div>
                    <div style="font-weight: 600;">${friendName}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">@${friend.username || 'unknown'}</div>
                </div>
            </div>
            <div class="friend-actions">
                <button class="btn-primary btn-small" onclick="acceptFriendRequest('${friendship.id}')">Accept</button>
                <button class="btn-secondary btn-small" onclick="rejectFriendRequest('${friendship.id}')">Reject</button>
            </div>
        `;
        requestsListEl.appendChild(requestItem);
    });
}

async function acceptFriendRequest(friendshipId) {
    try {
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', friendshipId);

        if (error) throw error;

        loadFriendRequests();
        loadFriends();
    } catch (error) {
        console.error('Error accepting request:', error);
    }
}

async function rejectFriendRequest(friendshipId) {
    try {
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', friendshipId);

        if (error) throw error;

        loadFriendRequests();
    } catch (error) {
        console.error('Error rejecting request:', error);
    }
}

async function searchUser(username) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, username')
            .ilike('username', `%${username}%`)
            .neq('id', currentUser.id)
            .limit(10);

        if (error) throw error;

        if (data.length === 0) {
            searchResults.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No users found</p>';
            return;
        }

        data.forEach(user => {
            const userName = user.name || user.username || 'Unknown';
            const userInitial = userName.charAt(0).toUpperCase();

            const userItem = document.createElement('div');
            userItem.className = 'friend-item';
            userItem.innerHTML = `
                <div class="friend-info">
                    <div class="friend-avatar">${userInitial}</div>
                    <div>
                        <div style="font-weight: 600;">${userName}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">@${user.username || 'unknown'}</div>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="btn-primary btn-small" onclick="sendFriendRequest('${user.id}')">Add</button>
                </div>
            `;
            searchResults.appendChild(userItem);
        });
    } catch (error) {
        console.error('Error searching user:', error);
        searchResults.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Search failed</p>';
    }
}

async function sendFriendRequest(userId) {
    try {
        const { error } = await supabase
            .from('friendships')
            .insert({
                user1_id: currentUser.id,
                user2_id: userId,
                status: 'pending'
            });

        if (error) {
            if (error.code === '23505') {
                showError(authError, 'Friend request already sent');
            } else {
                throw error;
            }
        } else {
            showError(authError, 'Friend request sent!', 'success');
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        showError(authError, 'Failed to send request');
    }
}

function openFriendsModal() {
    if (!friendsModal) return;
    friendsModal.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const friendsTabBtn = document.querySelector('[data-tab="friends"]');
    const friendsTabContent = document.getElementById('friendsTab');
    if (friendsTabBtn) {
        friendsTabBtn.classList.add('active');
    }
    if (friendsTabContent) {
        friendsTabContent.classList.add('active');
    }
    loadFriends();
}

// Theme Functions
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update active theme option
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === theme) {
            option.classList.add('active');
        }
    });

    // Save to profile
    if (currentUser) {
        supabase
            .from('profiles')
            .update({ theme: theme })
            .eq('id', currentUser.id)
            .then(() => {});
    }
}

// Toast Notification Functions
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.classList.remove('hidden');
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

// UI Revert Trigger - Ctrl+Shift+V
function setupBobTrigger() {
    document.addEventListener('keydown', (e) => {
        // Check for Ctrl+Shift+V (or Cmd+Shift+V on Mac)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
            e.preventDefault(); // Prevent default paste behavior
            revertToCurrentUI();
        }
    });
}

function revertToCurrentUI() {
    if (uiVersion === 'current') {
        showToast('UI is already in current version', 'info');
        return;
    }
    
    uiVersion = 'current';
    document.body.classList.add('ui-current');
    document.body.classList.remove('ui-enhanced');
    showToast('UI reverted to current version', 'success');
    localStorage.setItem('uiVersion', 'current');
}

function applyEnhancedUI() {
    if (uiVersion === 'enhanced') return;
    
    uiVersion = 'enhanced';
    document.body.classList.add('ui-enhanced');
    document.body.classList.remove('ui-current');
    localStorage.setItem('uiVersion', 'enhanced');
}

// Make functions globally available
window.playWithFriend = playWithFriend;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.sendFriendRequest = sendFriendRequest;
