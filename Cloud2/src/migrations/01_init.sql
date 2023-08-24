CREATE TABLE users(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  file_name TEXT,
  file_size BIGINT,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  media_type TEXT,
  data TEXT,
  is_unsafe BOOLEAN DEFAULT false,
  is_pending_deletion BOOLEAN DEFAULT false,
  ownerid INTEGER
);
CREATE TABLE fileHistory (
  id SERIAL PRIMARY KEY,
  fileid INTEGER REFERENCES files(id), 
  action TEXT,
  actiondate DATE DEFAULT CURRENT_DATE,
);
CREATE TABLE folders (
  id SERIAL PRIMARY KEY,
  name TEXT,
  owner_id INTEGER,
  parent_folder_id INTEGER
);
