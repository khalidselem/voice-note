# Voice Note - Team Communication with Voice Channels

A modern Frappe application for team communication with voice notes, text notes, and todos organized in channels with a beautiful timeline UI.

## Features

### 🎤 Voice Notes
- Direct voice recording in the browser using MediaRecorder API
- Click to start, click to stop
- Auto-upload to server
- Voice player in timeline

### 📝 Text Notes
- Rich text messaging
- Markdown support
- Real-time timeline updates

### ✅ Todos
- Create todos with title, assignee, and due date
- Check/uncheck completion
- Visual completion status in timeline

### 📢 Channels
- Create public or private channels
- Add members with admin roles
- Channel-based permissions
- Emoji icons for channels

### 🎨 Modern UI
- Dark theme with glassmorphism effects
- Smooth animations
- Mobile responsive design
- Slack/WhatsApp-style timeline

### 🔒 Permissions
- Private channels visible only to members
- Admin-only channel management
- Owner or admin can delete items

## Installation

```bash
# Navigate to your bench
cd ~/frappe-bench

# Get the app
bench get-app /path/to/voice-note/voice_note

# Install on your site
bench --site your-site install-app voice_note

# Run migrations
bench --site your-site migrate

# Build assets
bench build --app voice_note

# Restart
bench restart
```

## Usage

1. Navigate to `/app/voice-channel-ui` in your Frappe site
2. Create a channel using the "+" button in the sidebar
3. Select a channel to view its timeline
4. Use the input toggles to switch between:
   - 🎤 Voice Note (default) - Click the round button to record
   - 📝 Text Note - Type and send messages
   - ✅ Todo - Add tasks with due dates

## DocTypes

### Voice Channel
| Field | Type | Description |
|-------|------|-------------|
| channel_name | Data | Unique channel name |
| emoji | Data | Channel icon emoji |
| description | Small Text | Channel description |
| is_private | Check | Private channel flag |
| members | Table | Channel members |

### Channel Timeline Item
| Field | Type | Description |
|-------|------|-------------|
| channel | Link | Parent channel |
| item_type | Select | Voice Note / Text Note / Todo |
| content | Text Editor | Text content |
| voice_file | Attach | Voice recording file |
| voice_duration | Float | Recording duration (seconds) |
| status_emoji | Data | Status emoji reaction |
| todo_title | Data | Todo item title |
| assigned_user | Link | Todo assignee |
| due_date | Date | Todo due date |
| is_completed | Check | Todo completion status |

## API Endpoints

All endpoints require authentication and channel membership.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `get_channels` | GET | List accessible channels |
| `get_timeline` | GET | Get channel timeline items |
| `create_text_note` | POST | Create text note |
| `create_voice_note` | POST | Create voice note |
| `create_todo` | POST | Create todo item |
| `toggle_todo` | POST | Toggle todo completion |
| `update_status_emoji` | POST | Update item emoji |
| `delete_timeline_item` | DELETE | Delete timeline item |

## Browser Requirements

- Modern browser with MediaRecorder API support
- Microphone permission for voice recording
- Chrome, Firefox, Safari, Edge (latest versions)

## License

MIT

## Author

Voice Note Team
