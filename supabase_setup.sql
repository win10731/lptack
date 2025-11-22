-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add username column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;
    END IF;
END $$;

-- Add theme column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'theme') THEN
        ALTER TABLE profiles ADD COLUMN theme TEXT DEFAULT 'dark';
    END IF;
END $$;

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player1_id UUID REFERENCES auth.users(id) NOT NULL,
    player2_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    board TEXT[] DEFAULT ARRAY['', '', '', '', '', '', '', '', ''],
    current_turn TEXT DEFAULT 'player1' CHECK (current_turn IN ('player1', 'player2')),
    winner TEXT CHECK (winner IN ('X', 'O')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Games policies
DROP POLICY IF EXISTS "Users can view games they are part of" ON games;
CREATE POLICY "Users can view games they are part of"
    ON games FOR SELECT
    USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Users can create games" ON games;
CREATE POLICY "Users can create games"
    ON games FOR INSERT
    WITH CHECK (auth.uid() = player1_id);

DROP POLICY IF EXISTS "Users can update games they are part of" ON games;
CREATE POLICY "Users can update games they are part of"
    ON games FOR UPDATE
    USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Enable realtime for games table (ignore error if already added)
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE games;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    host_id UUID REFERENCES auth.users(id) NOT NULL,
    player1_id UUID REFERENCES auth.users(id),
    player2_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    board TEXT[] DEFAULT ARRAY['', '', '', '', '', '', '', '', ''],
    current_turn TEXT DEFAULT 'player1' CHECK (current_turn IN ('player1', 'player2')),
    winner TEXT CHECK (winner IN ('X', 'O')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create friends table
CREATE TABLE IF NOT EXISTS friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID REFERENCES auth.users(id) NOT NULL,
    user2_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id != user2_id)
);

-- Enable RLS for new tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Rooms policies
DROP POLICY IF EXISTS "Users can view all rooms" ON rooms;
CREATE POLICY "Users can view all rooms"
    ON rooms FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
CREATE POLICY "Users can create rooms"
    ON rooms FOR INSERT
    WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Users can update rooms they are part of" ON rooms;
CREATE POLICY "Users can update rooms they are part of"
    ON rooms FOR UPDATE
    USING (auth.uid() = host_id OR auth.uid() = player1_id OR auth.uid() = player2_id);

-- Friendships policies
DROP POLICY IF EXISTS "Users can view their own friendships" ON friendships;
CREATE POLICY "Users can view their own friendships"
    ON friendships FOR SELECT
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create friend requests" ON friendships;
CREATE POLICY "Users can create friend requests"
    ON friendships FOR INSERT
    WITH CHECK (auth.uid() = user1_id);

DROP POLICY IF EXISTS "Users can update their own friendships" ON friendships;
CREATE POLICY "Users can update their own friendships"
    ON friendships FOR UPDATE
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Enable realtime for rooms (ignore error if already added)
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create trigger for rooms updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

