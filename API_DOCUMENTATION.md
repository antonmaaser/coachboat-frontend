# API Documentation for Coachboat Planner

This document provides an overview of the API endpoints, their functions, and requirements.

## Base URL
The API is served relative to the base URL (e.g., `https://api.coachboat-planer.de` or `http://localhost:3000`).

## Authentication
All endpoints require authentication using a JSON Web Token (JWT).
- **Header**: `Authorization: Bearer <token>`
- The token validates the user's identity and status level.

## Data Format
The API follows a structure similar to the **JSON:API** standard.
- **Requests**: Data should be wrapped in a `data` object with an `attributes` object containing the fields.
- **Responses**: Successful responses return a `data` object (array or single object). Errors return an `errors` array.

---

## Endpoints

### 1. Users (`/users`)

#### GET `/users`
Retrieves a list of users.
- **Permissions**:
  - `status < 2`: Retrieves **all** users.
  - `status >= 2`: Retrieves **only the requesting user's** data.
- **Response**: Array of user objects.

#### GET `/users/:id`
Retrieves a specific user by ID.
- **Response**: Single user object.

#### POST `/users`
Creates a new user.
- **Permissions**: "admin" only.
- **Request Body**:
  ```json
  {
    "data": {
      "attributes": {
        "name": "Doe",
        "first-name": "John",
        "email": "john.doe@example.com"
      }
    }
  }
  ```
- **Description**: Checks if the user exists. If not, sends an activation email with a token.

#### PATCH `/users/:id`
Updates an existing user.
- **Permissions**: User status >= 3.
- **Request Body** (optional fields):
  ```json
  {
    "data": {
      "attributes": {
        "name": "NewName",
        "first-name": "NewFirst",
        "email": "new@example.com",
        "password": "newPassword",
        "status": 1
      }
    }
  }
  ```

#### DELETE `/users/:id`
Deletes a user.
- **Permissions**: User status >= 3.
- **Requirement**: The user's status must be deactivated (checked in logic, though specific logic implies checking `res.user.status` directly).

---

### 2. Events (`/events`)

#### GET `/events`
Retrieves a list of events.
- **Query Parameters**:
  - `filter[year]`: Filter by year (default: current year).
  - `filter[month]`: Filter by month (default: current month).
- **Response**: Array of event objects for the specified month.

#### GET `/events/:id`
Retrieves a specific event by ID.

#### POST `/events`
Creates a new event.
- **Request Body**:
  ```json
  {
    "data": {
      "attributes": {
        "title": "Training",
        "date": "2023-10-27",
        "start-date": "YYYY-MM-DDTHH:mm:ss.sssZ",
        "end-date": "YYYY-MM-DDTHH:mm:ss.sssZ",
        "resource": "resource_id" (optional, defaults to first available)
      }
    }
  }
  ```
- **Logic**: Checks for time conflicts with other events on the same resource.

#### PATCH `/events/:id`
Updates an existing event.
- **Permissions**: Creator of the event OR user status >= 3.
- **Request Body**: Similar to POST.
- **Logic**: Checks for time conflicts excluding the current event.

#### DELETE `/events/:id`
Deletes an event.
- **Permissions**: Creator of the event OR user status >= 3.

---

### 3. Resources (`/resources`)

#### GET `/resources`
Retrieves all resources that are not hidden (`isHidden = false`).

#### GET `/resources/:id`
Retrieves a specific resource.

#### POST `/resources`
Creates a new resource.
- **Permissions**: User status >= 3.
- **Request Body**:
  ```json
  {
    "data": {
      "attributes": {
        "title": "Boat A",
        "description": "Description of boat"
      }
    }
  }
  ```
- **Default**: `isReady` is set to `true` upon creation.

#### PATCH `/resources/:id`
Updates an existing resource.
- **Permissions**: User status >= 3.
- **Request Body**:
  ```json
  {
    "data": {
      "attributes": {
        "title": "...",
        "description": "...",
        "is-ready": boolean
      }
    }
  }
  ```

#### DELETE `/resources/:id`
Soft deletes a resource by setting `isHidden = true`.
- **Permissions**: User status >= 3.

---

## User Status Levels (Inferred)
Based on the code:
- **0**: Active User (Standard)
- **1, 2**: (Intermediate levels, context implies 'Geringfügige Qualifikation' / minor qualification at higher numbers or strictness logic varies)
- **3+**: Moderator/Admin privileges (can edit resources, delete users/events).
- **"admin"**: Can create users.
