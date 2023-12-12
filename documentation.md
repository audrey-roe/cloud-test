**Login User**

**POST /api/login**

Authenticates a user and returns a JSON Web Token.

**Request Body:**
*email* [*required]
The user's email address.

*password* [*required]
The user's password.

**Returns:** The user object and a JSON Web Token upon successful authentication. 

**Example Request:**
```json
{
    "email" : "example@example.com",
    "password" : "examplePassword123"
}
```

**Example Response:**
```json
{
    "user": {
        "id": 1,
        "name": "John Doe",
        "email": "example@example.com",
        "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNTk4OTM3MzQ3fQ.1U8pV1uR6T6y8Uv3Vd_YhGwPzvFpXuKoxT7wB_vGvBg"
}
```

**createUserHandler**

**POST /api/user**

Creates a new user with the given data, and returns a JWT token.

**Request Body:** 
  name [*required]
  The user's full name.
  
  email [*required]
  The user's email address.
  
  is_admin
  Whether the user is an admin or not (defaults to false).

**Returns:** A 201 response containing the user object and the JWT token.

**Example Request:**
'''json
{
  "name": "John Doe",
  "email": "john@example.com",
  "is_admin": true
}
'''

**Example Response:**
'''json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "is_admin": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
}
'''

'''
**deleteUserHandler**   

**DELETE /api/user**

Delete user from the database.

**Request Body:** 
    email* 
    Email address of the user to be deleted.

**Returns:** Status code of 200 (success) or 500 (error) with an associated message.

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

Revoke an active session.

**Request Body (if POST):** 
  userId [*required] 
  The user's unique identifier.

**Returns:** Status code 200 or an error message.

**Example Request:**
'''json
{
  "userId": 1
}
'''

**Example Response:**
'''json
{
  "message": "Session revoked successfully."
}
'''

**getFileHandler**

**GET /api/file/download/:fileId** 

Retrieve the file with the given ID from the database and S3.

**Request Body (if POST):** 

None

**Returns:** The file in a downloadable format.

**Example Request:**
'''json
{
  "fileId": "exampleFileId"
}
'''

**Example Response:**
'''json
{
  "fileName": "exampleFileName.jpg",
  "mediaType": "image/jpg",
  "fileBuffer": "exampleFileBuffer"
}
'''

**streamFileController** 

**GET /api/file/stream** 

Retrieve a stream of a file from S3.

**Request Body:**
  key [*required]
  The key of the file to be streamed.

**Returns:** A stream of the requested file.

**Example Request:**
'''json
{
  "key": "example.txt"
}
'''

**Example Response:**
'''json
{
  "stream": "stream of example.txt"
}
'''

**uploadFileHandler**

**PUT /api/file/upload** 

Accepts an incoming file upload and stores the details in the database.

**Request Body (if POST):** 
    file [*required]
    The file to be uploaded.

**Returns:** A status code of 201 with the file ID, file name, and a message confirming success.

**Example Request:**
'''json
{
  "file": "example.jpg"
}
'''

**Example Response:**
'''json
{
    "message": "File uploaded successfully",
    "fileId": "19f2d9e8-f75d-4c33-91ed-c9f36a117d7f",
    "fileName": "example.jpg"
}
'''

'''
**Create Folder**

**POST /api/create-folder** 

Create a new folder.

**Request Body:** 
  *name* [*required]
  The name for the new folder.
  *parentFolderId*
  The ID of the parent folder. If the parentFolderId is not specified, the default base folder will be used.

**Returns:** The newly created folder object.

**Example Request:**
'''json
{
  "name": "New Folder",
  "parentFolderId": 2
}
'''

**Example Response:**
'''json
{
  "id": 9,
  "name": "New Folder",
  "parentFolderId": 2,
  "userId": 3
}
'''

**Mark and Delete Unsafe File** 

**POST [Endpoint URL]** 

Marks a file as unsafe and deletes it. 

**Request Body:** 
*file.id* [*required] 
The ID of the file to be marked and deleted. 

**Returns:** A message indicating if the file was successfully marked and deleted. 

**Example Request:**
'''json
{
  "file": {
    "id": 4
  }
}
'''

**Example Response:**
'''json
{
  "message": "File marked as unsafe and deleted successfully."
}
'''

**getFileHistoryController**

**GET /api/file-history/:fileId**

Retrieve the history of changes for a given file.

**Returns:** An array of changes for the specified file.

**Example Request:**
'''json
{
    "fileId":123
}
'''

**Example Response:**
'''json
{
    "history": [
        {
            "id": 1,
            "file_id": 123,
            "change_type": "modified",
            "change_date": "2020-01-15T14:52:34.000Z",
            "change_by": "John Doe"
        },
        {
            "id": 2,
            "file_id": 123,
            "change_type": "created",
            "change_date": "2020-01-13T12:45:22.000Z",
            "change_by": "Jane Doe"
        }
    ]
}
'''

