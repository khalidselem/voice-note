app_name = "voice_note"
app_title = "Voice Note"
app_publisher = "ITQAN LLC"
app_description = "Voice Channel - Team communication with voice notes, text notes, and todos"
app_email = "info@itqan-kw.net"
app_license = "MIT"
app_version = "1.0.0"

# Required Apps
required_apps = ["frappe"]

# Includes in <head>
# ------------------

app_include_css = "/assets/voice_note/css/voice_channel.css"
app_include_js = "/assets/voice_note/js/voice_recorder.js"

# Document Events
# ---------------

doc_events = {
    "Voice Channel": {
        "validate": "voice_note.voice_channel.api.voice.validate_channel_access",
    },
    "Channel Timeline Item": {
        "before_insert": "voice_note.voice_channel.api.voice.set_timeline_item_owner",
        "validate": "voice_note.voice_channel.api.voice.validate_timeline_item_access",
    }
}

# Permission Query Conditions
# ---------------------------

permission_query_conditions = {
    "Channel Timeline Item": "voice_note.voice_channel.api.voice.get_timeline_item_permission_query",
}

has_permission = {
    "Channel Timeline Item": "voice_note.voice_channel.api.voice.has_timeline_item_permission",
}

# Fixtures
# --------

fixtures = []

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Desk Pages
# ----------

# portal_menu_items = [
# 	{"title": "Voice Channels", "route": "/voice-channel-ui", "role": "System Manager"}
# ]

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"daily": [
# 		"voice_note.tasks.daily"
# 	],
# }
