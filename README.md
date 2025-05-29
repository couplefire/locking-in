# Locking In - Productivity Extension

A browser extension that helps you stay focused by blocking distracting websites during "grind mode" and allowing free browsing during "chill mode".

## ✨ Recent Updates

### Modern UI Redesign
- **Admin Panel**: Clean, card-based layout with modern typography and visual hierarchy
- **Client Extension**: Minimalistic popup with gradient header and improved user experience
- **Design System**: Consistent color scheme, spacing, and interactive elements
- **Responsive**: Works well on different screen sizes

### Enhanced Functionality
- **Indefinite Grind Mode**: Admins can enable grind mode indefinitely by setting 0 hours
- **Client-Initiated Grind Mode**: Users can lock themselves into grind mode (cannot disable)
- **Visual Indicators**: Clear status displays with emojis and color coding
- **Improved Warnings**: Better UX for understanding the implications of actions

## Features

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
   - Modern browser extension built with Plasmo
   - Sleek popup interface with status display and controls
   - Uses Chrome's declarativeNetRequest API for efficient blocking

3. **Admin Panel** (`/admin`)
   - Modern React-based admin interface with card layout
   - Full control over modes and whitelist
   - Visual status indicators and responsive design

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
- `POST /client-grind` - Enable grind mode as client

## Configuration Structure

```json
{
  "mode": "chill|grind",
  "whitelist": ["example.com", "openai.com"],
  "until": "ISO-8601 timestamp or null",
  "client_initiated": true|false
}
```

## UI Design

### Design Principles
- **Minimalistic**: Clean, uncluttered interfaces
- **Modern**: Contemporary design with subtle shadows and gradients
- **Intuitive**: Clear visual hierarchy and meaningful icons
- **Responsive**: Adaptive layouts for different screen sizes

### Color Scheme
- **Chill Mode**: Green tones (`#059669`) for relaxed state
- **Grind Mode**: Red tones (`#dc2626`) for focused state
- **Neutral**: Gray tones for secondary elements
- **Accents**: Blue (`#3b82f6`) for primary actions

## Security Notes

- Client-initiated grind mode cannot be disabled by the client
- Admin password is required for all admin operations
- Extension automatically syncs with server every 5 seconds 