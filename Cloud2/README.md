
# Cloud Backup System API - Cloudguardian

A robust cloud backup system that serves as a platform for users to backup, manage, and stream their files.

## Features

### Simple Mode

1. **User Account Creation**
   - Email address
   - Password
   - Full name
   
2. **File Management**
   - Upload files up to 200mb
   - Download uploaded files
   - Create folders to organize files

### Hard Mode

3. **Admin User Type**
   - Manage the content uploaded by users
   - Mark pictures and videos as unsafe
   - Unsafe files are automatically deleted

4. **Media Streaming**
   - Users can stream videos and audio files

### Ultra Mode

5. **File Compression** (Work in progress)
   - NOTE: Attempted implementation but faced some package issues. Will be resumed post-review.

6. **File History**
   - Keep a history of all file versions

### Bonus Features

7. **Security**
   - Revokable session management

8. **Admin Review System**
   - Multiple admin reviews are required before a file is marked for deletion

## Tools & Stack

- NodeJs with TypeScript & Express
- PostgreSQL for data management
- Redis for caching
- Docker for containerization
- Postman for API documentation
- S3 for file storage
- Unit tests for ensuring the functionality

## How to Use

1. Clone this repository.
   
   ```bash
   git clone [https://github.com/audrey-roe/cloud-test.git]
   ```

2. Navigate to the directory.

   ```bash
   cd [Cloud2]
   ```

3. Install dependencies.

   ```bash
   npm install
   ```

4. Run the application.

   ```bash
   npm start
   ```

## Documentation

API endpoints are well-documented in a Postman collection. [Link to Postman collection](https://elements.getpostman.com/redirect?entityId=28927032-a52342a9-b2d1-4710-9c37-7f012f2c9924&entityType=collection)

## Live Demo

The API is hosted live at [Hosted API URL](https://cloudguardian-4450b82af050.herokuapp.com)

## Project Status

Completed features as part of the "Backend Engineer Test". All features under "Simple Mode" have been successfully implemented. For a list of additional tasks undertaken beyond Simple Mode, refer to the attached document.

## Contribution

Feel free to fork this project and raise a PR for any enhancements.

---

**Note:** You would replace placeholders such as `[your-repo-url]`, `[your-repo-name]`, and other placeholder URLs with the actual URLs or values relevant to your project.