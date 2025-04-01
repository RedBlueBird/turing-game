-- Rooms table to store game rooms
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expired_at TIMESTAMP,
  room_state ENUM('waiting', 'in_progress', 'completed') DEFAULT 'waiting',
  room_round INT DEFAULT 0,
  round_start_time TIMESTAMP,
  has_eliminated BOOLEAN DEFAULT FALSE,
  room_code VARCHAR(4) NOT NULL,
  max_players INT DEFAULT 8,
  questions_per_round INT DEFAULT 1,
  time_per_round INT DEFAULT 45,
  time_per_vote INT DEFAULT 30,
  theme VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  mimic_role VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Undergraduate student',
  host_id INT DEFAULT 0,
  ai_id INT DEFAULT -1
);

-- Players table to store players in rooms
CREATE TABLE players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  fake_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Placeholder',
  real_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  join_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  leave_time TIMESTAMP,
  is_ai BOOLEAN DEFAULT FALSE,
  is_lost BOOLEAN DEFAULT FALSE,
  votes INT DEFAULT 0,
  voted_player_id INT DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Questions table for storing questions by theme
CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  theme VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  content VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  liked INT DEFAULT 0,
  disliked INT DEFAULT 0,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room questions to select questions in rooms
CREATE TABLE room_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  room_round INT NOT NULL,
  question_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Player answers for each question
CREATE TABLE player_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  question_id INT NOT NULL,
  content VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  liked INT DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Player feedbacks
CREATE TABLE feedbacks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
);