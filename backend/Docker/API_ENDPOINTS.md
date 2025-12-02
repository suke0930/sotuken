# FRP Auth System - API Endpoints Documentation

**Version:** 2.0.0 (Arctic Migration)  
**Last Updated:** 2025-12-02

---

## 📋 Overview

This document describes all API endpoints for the FRP Authentication System after migrating from Auth.js to Arctic. All endpoints are accessed through Nginx reverse proxy on port `8080`.

---

## 🌐 Nginx Routing Configuration

### Base URL
- **Development:** `http://localhost:8080`
- **Production:** `https://your-domain.com`

### Routing Rules

| Path | Target Container | Internal Port | Description |
|------|-----------------|---------------|-------------|
| `/api/*` | `asset-server` | 3000 | Asset server APIs |
| `/ws/*` | `asset-server` | 3000 | WebSocket connections |
| `/health` | `asset-server` | 3000 | Asset server health check |
| `/auth/*` | `frp-authjs` | 3000 | **NEW:** Arctic auth endpoints |
| `/api/frp/*` | `frp-authjs` | 3000 | **NEW:** FRP-specific APIs |

**Note:** Nginx rewrites `/api/frp/` to `/api/` when proxying to `frp-authjs`.

---

## 🔐 Authentication Flow (Arctic)

### Step 1: Get Authentication URL

**Endpoint:** `GET /auth/api/auth/url`  
**Nginx Route:** `http://localhost:8080/auth/api/auth/url`  
**Target:** `frp-authjs:3000/api/auth/url`

**Response:**
```json
{
  "url": "https://discord.com/api/oauth2/authorize?client_id=...",
  "state": "a1b2c3d4e5f6...",
  "message": "Open this URL in a browser to authenticate with Discord"
}
```

### Step 2: User Authenticates (Browser)

User opens the `url` in a browser and authorizes the Discord application. Discord redirects to:

```
http://localhost:8080/api/auth/callback?code=AUTHORIZATION_CODE&state=STATE
```

### Step 3: Exchange Code for JWT

**Endpoint:** `POST /auth/api/auth/token`  
**Nginx Route:** `http://localhost:8080/auth/api/auth/token`  
**Target:** `frp-authjs:3000/api/auth/token`

**Request Body:**
```json
{
  "code": "AUTHORIZATION_CODE",
  "state": "STATE_FROM_STEP1",
  "fingerprint": "client-fingerprint-hash"
}
```

**Response:**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-12-03T10:00:00Z",
  "discordUser": {
    "id": "123456789012345678",
    "username": "ExampleUser",
    "avatar": "a1b2c3d4e5f6",
    "discriminator": "1234"
  }
}
```

---

## 🔑 JWT Verification

### Verify JWT Token

**Endpoint:** `POST /api/frp/verify-jwt`  
**Nginx Route:** `http://localhost:8080/api/frp/verify-jwt`  
**Target:** `frp-authjs:3000/api/verify-jwt`

**Request Body:**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "fingerprint": "client-fingerprint-hash"
}
```

**Response (Success):**
```json
{
  "valid": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "discordId": "123456789012345678",
  "expiresAt": "2025-12-03T10:00:00Z"
}
```

**Response (Failure):**
```json
{
  "valid": false,
  "reason": "Token expired" | "Invalid signature" | "Fingerprint mismatch"
}
```

---

## 🏥 Health Checks

### Asset Server Health

**Endpoint:** `GET /health`  
**Nginx Route:** `http://localhost:8080/health`  
**Target:** `asset-server:3000/health`

### FRP Auth Server Health

**Endpoint:** `GET /auth/health`  
**Nginx Route:** `http://localhost:8080/auth/health`  
**Target:** `frp-authjs:3000/health`

**Response:**
```json
{
  "status": "ok",
  "service": "FRP Arctic Auth Server",
  "timestamp": "2025-12-02T10:00:00Z"
}
```

---

## 🔄 Migration from Auth.js

### Deprecated Endpoints (Auth.js)

| Old Endpoint | Status | Replacement |
|--------------|--------|-------------|
| `/auth/signin` | ❌ Removed | `GET /auth/api/auth/url` |
| `/auth/signout` | ❌ Removed | N/A (JWT-based, stateless) |
| `/auth/callback/discord` | ❌ Removed | Client handles callback |
| `POST /api/exchange-code` | ❌ Removed | `POST /auth/api/auth/token` |

### New Endpoints (Arctic)

| New Endpoint | Method | Description |
|--------------|--------|-------------|
| `/auth/api/auth/url` | GET | Get Discord OAuth2 authorization URL |
| `/auth/api/auth/token` | POST | Exchange authorization code for JWT |
| `/api/frp/verify-jwt` | POST | Verify JWT token (unchanged) |

---

## 🧪 Testing with Postman/curl

### Example 1: Get Auth URL

```bash
curl http://localhost:8080/auth/api/auth/url
```

### Example 2: Exchange Code for JWT

```bash
curl -X POST http://localhost:8080/auth/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "YOUR_AUTH_CODE",
    "state": "STATE_FROM_STEP1",
    "fingerprint": "test-fingerprint-123"
  }'
```

### Example 3: Verify JWT

```bash
curl -X POST http://localhost:8080/api/frp/verify-jwt \
  -H "Content-Type: application/json" \
  -d '{
    "jwt": "YOUR_JWT_TOKEN",
    "fingerprint": "test-fingerprint-123"
  }'
```

---

## 🔧 Frontend Middleware Integration

### Example: TypeScript Client

```typescript
import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

// Step 1: Get auth URL
const { data } = await axios.get(`${BASE_URL}/auth/api/auth/url`);
console.log('Open this URL:', data.url);

// Step 2: User authenticates in browser and returns with code

// Step 3: Exchange code for JWT
const tokenResponse = await axios.post(`${BASE_URL}/auth/api/auth/token`, {
  code: authorizationCode,
  state: data.state,
  fingerprint: generateFingerprint(), // Client-side fingerprint
});

const jwt = tokenResponse.data.jwt;

// Step 4: Verify JWT (optional)
const verifyResponse = await axios.post(`${BASE_URL}/api/frp/verify-jwt`, {
  jwt,
  fingerprint: generateFingerprint(),
});

console.log('Discord ID:', verifyResponse.data.discordId);
```

---

## 🐳 Docker Network Internal URLs

For container-to-container communication:

| Service | Internal URL | External Port |
|---------|--------------|---------------|
| nginx | `nginx:80` | `8080:80` |
| frp-authjs | `frp-authjs:3000` | Internal only |
| frp-server | `frp-server:7000` | `7000:7000` |
| frp-authz | `frp-authz:3001` | Internal only |
| asset-server | `asset-server:3000` | Internal only |

---

## ⚠️ Important Notes

1. **CSRF Protection:** Always validate the `state` parameter
2. **Fingerprint Consistency:** Use the same fingerprint for auth and verification
3. **JWT Storage:** Store JWTs securely (in-memory preferred, avoid localStorage)
4. **Discord Redirect URI:** Must match exactly in Discord Developer Portal
5. **Nginx Rewrites:** `/api/frp/` is rewritten to `/api/` for `frp-authjs`

---

## 📚 References

- [Arctic Documentation](https://arctic.js.org/)
- [Discord OAuth2 Guide](https://discord.com/developers/docs/topics/oauth2)
- [Design Document: 設計書案2.md](../設計書案2.md)
- [Middleware Integration Guide](./MIDDLEWARE_INTEGRATION.md)

