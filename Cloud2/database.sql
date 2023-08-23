CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE DATABASE jwtdb;

CREATE TABLE users(
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

SELECT * FROM users;

INSERT INTO users (user_name,user_email,user_password) VALUES ('Toke Alabi','test@example.com','Password456!');


--psql -U drey -d postgres
--\c cloud
--\dt
--heroku pg:psql