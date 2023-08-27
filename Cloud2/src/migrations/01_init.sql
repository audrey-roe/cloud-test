CREATE TABLE users(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
  is_admin BOOLEAN DEFAULT false
);

CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  file_name TEXT,
  file_size BIGINT,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  media_type TEXT,
  data TEXT,
  is_unsafe BOOLEAN DEFAULT false,
  ownerid INTEGER,
  folder_id INTEGER
);

CREATE TABLE admin_file_reviews (
  id SERIAL PRIMARY KEY,
  file_id INTEGER REFERENCES files(id),
  admin_id INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  decision BOOLEAN
);

CREATE TABLE fileHistory (
  id SERIAL PRIMARY KEY,
  fileid INTEGER REFERENCES files(id), 
  action TEXT,
  actiondate DATE DEFAULT CURRENT_DATE
);

CREATE TABLE folders (
  id SERIAL PRIMARY KEY,
  name TEXT,
  owner_id INTEGER,
  parent_folder_id INTEGER
);

INSERT INTO users (user_name,user_email,user_password) VALUES ('Audrey','audrey@test.com','Password456!');
INSERT INTO folders (name, owner_id, parent_folder_id) VALUES ('User folder', 1, NULL);
