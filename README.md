# Locking In - Productivity Extension

A browser extension that helps you stay focused by blocking distracting websites during "grind mode" and allowing free browsing during "chill mode".

## New Features

### 1. Indefinite Grind Mode
- Admins can now enable grind mode indefinitely by setting 0 hours
- When indefinite, grind mode continues until manually disabled by admin
- Both admin panel and server support this feature

### 2. Client-Initiated Grind Mode
- Clients can now enable grind mode themselves when in chill mode
- Clients can choose:
  - Timed grind mode (specify hours > 0)
  - Indefinite grind mode (specify 0 hours)
- **Important**: Once a client enables grind mode, they CANNOT disable it themselves
- Only the admin can override client-initiated grind mode

## Architecture

### Components

1. **Server** (`/server`)
   - Flask-based API server
   - Manages configuration and mode switching
   - New endpoint `/client-grind` for client-initiated grind mode

2. **Client Extension** (`/client`)
   - Browser extension built with Plasmo
   - Shows current mode and allows clients to enable grind mode
   - Uses Chrome's declarativeNetRequest API for efficient blocking

3. **Admin Panel** (`/admin`)
   - React-based admin interface
   - Full control over modes and whitelist
   - Can override any mode settings

## Setup

### Server
```bash
cd server
pip install -r requirements.txt
# Create a .env file with:
# SECRET=your_admin_password
python server.py
```

### Client Extension
```bash
cd client
npm install
npm run dev  # For development
npm run build  # For production
```

### Admin Panel
```bash
cd admin
npm install
npm start
```

## API Endpoints

- `GET /config` - Get current configuration
- `POST /config` - Update configuration (admin only)
- `POST /client-grind` - Enable grind mode as client (new!)

## Configuration Structure

```json
{
  "mode": "chill|grind",
  "whitelist": ["example.com", "openai.com"],
  "until": "ISO-8601 timestamp or null",
  "client_initiated": true|false
}
```

## Testing

Run the test script to verify the new functionality:
```bash
python test_grind_mode.py
```

## Security Notes

- Client-initiated grind mode cannot be disabled by the client
- Admin password is required for all admin operations
- Extension automatically syncs with server every 5 seconds 