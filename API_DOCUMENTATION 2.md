# Coachboat Auth API Documentation

This document outlines the API endpoints, functions, and requirements for the authentication service.

## Base URL
Local Development: `http://localhost:3001` (or port specified in environment)

## Endpoints

### 1. User Activation
**Endpoint**: `/activate`
**Method**: `POST`
**Description**: Activates a newly created user account by setting their password and updating their status.

#### Request Body
The request expects a JSON object with the following structure:
```json
{
  "data": {
    "attributes": {
      "id": "JWT_ACTIVATION_TOKEN",
      "password": "NEW_PASSWORD",
      "rePassword": "CONFIRM_PASSWORD"
    }
  }
}
```

#### Requirements
- `id`: Must be a valid JWT signed with `ACTIVATE_TOKEN_SECRET`. The token payload must contain the user's `id`.
- `password`: Must be at least 6 characters long.
- `rePassword`: Must exactly match `password`.
- User status in database must be `0` (inactive) prior to activation.

#### Responses
- **200 OK**: `{ "success": true }`
- **400 Bad Request**: 
  - Passwords do not match.
  - Password is too short (< 6 chars).
- **403 Forbidden**: 
  - Token verification failed.
  - User not found.
  - User already activated.
- **500 Internal Server Error**: Database or server error.

---

### 2. Logout
**Endpoint**: `/logout`
**Method**: `DELETE`
**Description**: Invalidates a refresh token by removing it from the database on the server side.

#### Request Body
```json
{
  "token": "REFRESH_TOKEN_TO_INVALIDATE"
}
```

#### Requirements
- `token`: The refresh token string that needs to be invalidated.

#### Responses
- **204 No Content**: Token successfully deleted (or operation completed).
- **500 Internal Server Error**: Database or server error.

---

### 3. Token Management (Login & Refresh)
**Endpoint**: `/token`
**Method**: `POST`
**Description**: Handles user authentication (login) and token refreshing.

#### Variant A: Login (Password Grant)
Used to exchange user credentials for access and refresh tokens.

**Request Body**:
```json
{
  "grant_type": "password",
  "username": "USER_EMAIL",
  "password": "USER_PASSWORD"
}
```

**Requirements**:
- `grant_type`: Must be `"password"`.
- `username`: A valid registered email address.
- `password`: The correct password for the account.

#### Variant B: Refresh Token
Used to get a new access token using a valid refresh token.

**Request Body**:
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "VALID_REFRESH_TOKEN"
}
```

**Requirements**:
- `grant_type`: Must be `"refresh_token"`.
- `refresh_token`: A valid, non-expired refresh token that exists in the `refresh_tokens` database table.

#### Responses (Common)
- **200 OK**:
  ```json
  {
    "user_id": "USER_DB_ID",
    "access_token": "JWT_ACCESS_TOKEN",
    "refresh_token": "JWT_REFRESH_TOKEN",
    "token_type": "bearer",
    "expires_in": 300
  }
  ```
  *(Note: `expires_in` is in seconds, typically 5 minutes)*

- **400 Bad Request**: Invalid grant type or invalid credentials (password mismatch/user not found).
- **401 Unauthorized**: Missing refresh token in request.
- **403 Forbidden**: Invalid or expired refresh token.
- **500 Internal Server Error**: Server or database error.

## Database Extensions
The server requires a MySQL connection with the following environment variables:
- `DB_HOST`, `DB_USER`, `DB_PW`, `DB_DB`

It interacts with the following tables: 
- `users`: expects columns `_id`, `email`, `password`, `status`, `name`, `firstName`.
- `refresh_tokens`: expects columns `refresh_token`, `issuedFor`.

## Authentication Secrets
The server relies on the following environment variables for JWT signing/verification:
- `ACTIVATE_TOKEN_SECRET`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
