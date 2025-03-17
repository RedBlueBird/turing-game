-- Rooms table to store game rooms
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expired_at TIMESTAMP,
  room_state ENUM('waiting', 'in_progress', 'completed') DEFAULT 'waiting',
  room_code VARCHAR(4) NOT NULL,
  max_players INT NOT NULL,
  questions_per_round INT NOT NULL,
  time_per_round INT NOT NULL,
  time_per_vote INT NOT NULL,
  theme VARCHAR(50) NOT NULL,
  host_id INT DEFAULT 0
);

-- Players table to store players in rooms
CREATE TABLE players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  fake_name VARCHAR(50) DEFAULT 'Placeholder',
  real_name VARCHAR(50) NOT NULL,
  join_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  leave_time TIMESTAMP,
  is_ai BOOLEAN DEFAULT FALSE,
  is_lost BOOLEAN DEFAULT FALSE,
  score INT DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Questions table for storing questions by theme
CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  round INT NOT NULL,
  theme VARCHAR(50) NOT NULL,
  content VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Player answers for each question
CREATE TABLE player_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  question_id INT NOT NULL,
  content VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);