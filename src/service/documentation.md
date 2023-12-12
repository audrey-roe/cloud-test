**Login User Handler**

**POST /api/login** 

This endpoint authenticates the user's credentials and generates a JSON web token.

**Request Body:** 
          email [*required]
          The user's email address.
          
          password [*required]
          The user's password.

**Returns:** 
A 201 status code with the user's data, and a JSON web token.

**Example Request:**
'''json
{
    "email": "example@example.com",
    "password": "examplePassword"
}
'''

**Example Response:**
'''json
{
    "user": {
        "id": 1,
        "name": "John Doe",
        "email": "example@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNTg5NjY3NjIxLCJleHAiOjE1ODk2Njc5MjF9.G_AjdU-Fhf7qja6d3fWs7f91yhSJX-hM0hxQjPkf9yQ"
}
'''

**createUserHandler**

**POST /api/user** 

Endpoint to create a user.

**Request Body:**
  username [*required]
  The username of the user.

  email [*required]
  The email of the user.

  password [*required]
  The password of the user.

  is_admin
  Boolean field to indicate whether the user is an admin or not.

**Returns:** User data, JWT token.

**Example Request:**
'''json
{
  "username": "username123",
  "email": "user@example.com",
  "password": "password123",
  "is_admin": true
}
'''

**Example Response:**
'''json
{
  "user": {
    "id": 1,
    "username": "username123",
    "email": "user@example.com",
    "is_admin": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZXhwIjoxNjI1MjUwMjQ1LCJpYXQiOjE2MjUyNDY2NDV9.Cn8_R8Ypg2ePuB_1vzIpC9yYQDf7AOy2KJxj1T6T6wk"
}
'''

'''
**deleteUserHandler**

**DELETE /api/user**

Delete a user by email address.

**Request Body:** 
*email* [*required]
The email address to delete.

**Returns:** A success or error message.

**Example Request:**
'''json
{
  "email": "example@example.com"
}
'''

**Example Response:**
'''json
{
  "message": "User deleted successfully"
}
'''

**Revoke Session**

**POST /api/revokeSession**

Revoke session of the logged-in user.

**Request Body:**
No Request Body

**Returns:** 200 status code with success message or 400/404/500 status code with corresponding message.

**Example Request:**
No Request Body

**Example Response:**
'''json
{
    "message": "Session revoked successfully."
}
'''

**[uploadFileHandler]**

**PUT /api/file/upload** 

Upload a file to S3 storage and store details in the database.

**Request Body:** 
* required
  file: File to be uploaded.

**Returns:** A 201 status code and a response body containing the fileId and fileName of the uploaded file.

**Example Request:**
'''json
{
  "file": "examplefile.txt"
}
'''

**Example Response:**
'''json
{
  "message": "File uploaded successfully",
  "fileId": 1,
  "fileName": "examplefile.txt"
}
'''

**[getFileHandler]**

**GET [/api/file/download/:fileId]**

Retrieves the file with the specified ID from the database and sends it as a download.

**Request Body (if POST):** None.

**Returns:** The file with the given ID as a download.

**Example Request:**

None.

**Example Response:**
The file with the given ID as a download.

**streamFileController**

**GET /api/file/stream**

Provides a streaming download of a file from the user's workspace.

**Request Body (if POST):** 
        key [*required]
        The name of the file to be streamed.

**Returns:** A streaming download of the specified file.

**Example Request:**
'''json
{
  "key": "test.txt"
}
'''

**Example Response:**
'''json
{
  "stream": "<streaming download>"
}
'''

'''
**Create Folder**

**POST /api/create-folder**

Create a new folder.

**Request Body:** 
*name* [*required]
The name of the folder.

*parentFolderId*
The ID of the parent folder. Defaults to the base folder if not specified.

**Returns:** The newly created folder object.

**Example Request:**
'''json
{
  "name": "Example Folder",
  "parentFolderId": 4
}
'''

**Example Response:**
'''json
{
  "id": 7,
  "name": "Example Folder",
  "parentFolderId": 4
}
'''

