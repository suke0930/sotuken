# FRP Test Client

Test client for validating the FRP Authentication System with Discord OAuth2, JWT management, and token refresh capabilities.

## Features

- **AuthClient**: Discord OAuth2 authentication, JWT management, token refresh
- **FrpClient**: FRP connection management and configuration generation
- **TestRunner**: Test scenario execution and reporting
- **Utilities**: Fingerprint generation, HTTP client, logging

## Installation

```bash
cd backend/Docker/test-client
npm install
```

## Configuration

Create `.env` file from the template:

```bash
cp .env.example .env
```

Edit `.env` to configure:

```env
AUTH_SERVER_URL=http://localhost:8080
FRP_SERVER_ADDR=localhost
FRP_SERVER_PORT=7000
TEST_TIMEOUT=60000
TEST_LOCAL_PORT=3000
```

## Usage

### Build

```bash
npm run build
```

### Run Demo Client

```bash
npm start
```

This will:
1. Initialize authentication and provide a Discord OAuth2 URL
2. Wait for you to complete authentication in a browser
3. Retrieve and display your session information

### Run Tests

```bash
# All tests
npm test

# Specific test scenario
npm test tests/scenarios/01-auth-flow.test.ts

# Integration tests
npm run test:integration

# Watch mode (for development)
npm run test:watch
```

## Test Scenarios

### Implemented

1. **01-auth-flow.test.ts**: Basic authentication flow validation

### Planned (from design document)

2. **02-frp-connection.test.ts**: FRP connection with JWT authentication
3. **03-token-refresh.test.ts**: Token refresh and rotation
4. **04-session-info.test.ts**: User session information retrieval
5. **05-concurrent-sessions.test.ts**: Maximum session limit enforcement
6. **full-flow.test.ts**: Complete end-to-end integration test

## API Usage Examples

### Authentication

```typescript
import { AuthClient } from "./src/AuthClient.js";
import { generateTestFingerprint } from "./src/utils/fingerprint.js";

const fingerprint = generateTestFingerprint();
const authClient = new AuthClient(fingerprint);

// 1. Initialize authentication
const { tempToken, authUrl } = await authClient.initAuth(fingerprint);
console.log("Open this URL:", authUrl);

// 2. Poll for completion
const result = await authClient.pollAuth(tempToken);
console.log("Authenticated as:", result.discordUser.username);

// 3. Get user info
const userInfo = await authClient.getUserInfo();
console.log("Allowed ports:", userInfo.permissions.allowedPorts);
```

### Token Refresh

```typescript
// Automatic refresh when token is about to expire
const token = await authClient.getValidAccessToken();

// Manual refresh
await authClient.refreshAccessToken();
```

### FRP Connection

```typescript
import { FrpClient } from "./src/FrpClient.js";

const frpClient = new FrpClient();

// Generate config
const configPath = await frpClient.generateFrpcConfig(
  jwt,
  fingerprint,
  3000, // local port
  25565 // remote port
);

// Start FRPC
await frpClient.startFrpc(configPath);
await frpClient.waitForConnection(30000);

// Stop FRPC
await frpClient.stopFrpc();
```

## Architecture

```
test-client/
├── src/
│   ├── AuthClient.ts         # OAuth2 & JWT management
│   ├── FrpClient.ts          # FRP connection management
│   ├── TestRunner.ts         # Test execution & reporting
│   ├── config.ts             # Configuration loader
│   ├── index.ts              # Main entry point
│   └── utils/
│       ├── fingerprint.ts    # Fingerprint generation
│       ├── http.ts           # HTTP client wrapper
│       └── logger.ts         # Colored logging
├── tests/
│   ├── scenarios/            # Individual test scenarios
│   └── integration/          # Integration tests
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Adding New Tests

1. Create test file in `tests/scenarios/` or `tests/integration/`
2. Follow the naming convention: `XX-test-name.test.ts`
3. Use the provided utilities (AuthClient, FrpClient, logger)

Example test structure:

```typescript
describe("Test Name", () => {
  let authClient: AuthClient;
  
  beforeAll(() => {
    const fingerprint = generateTestFingerprint("test-name");
    authClient = new AuthClient(fingerprint);
  });

  it("should perform some action", async () => {
    // Test implementation
  });
});
```

### Logging

```typescript
import { logger } from "./utils/logger.js";

logger.info("Information message");
logger.success("Success message");
logger.warning("Warning message");
logger.error("Error message");
logger.debug("Debug message");

// Test-specific logging
logger.testStart("Test Name");
logger.step(1, "Step Description");
logger.testEnd("Test Name", true);
```

## Troubleshooting

### Authentication Timeout

If authentication times out during polling:
- Increase `maxAttempts` in `pollAuth()` options
- Check that the auth server is running on `localhost:8080`
- Verify Discord OAuth2 credentials in server `.env`

### FRPC Connection Failed

- Ensure FRP server is running
- Check FRP server port (default: 7000)
- Verify JWT token is valid
- Check firewall settings

### Test Failures

- Review test logs for specific error messages
- Verify all services are running (nginx, frp-authjs, frp-server, frp-authz)
- Check network connectivity
- Ensure test user exists in `frp-authz/data/users.json`

## References

- [FRP Authentication System Design](../POLLING_AUTH_DESIGN.md)
- [API Endpoints Documentation](../API_ENDPOINTS.md)
- [Middleware Integration Guide](../MIDDLEWARE_INTEGRATION.md)
