# Copyright (c) 2026, ITQAN LLC and contributors
# For license information, please see license.txt

import frappe
from frappe import _
import json


# ========================================
# Channel API Endpoints
# ========================================

@frappe.whitelist()
def get_channels():
    """Get list of channels accessible to current user"""
    user = frappe.session.user
    
    # Get all channels
    channels = frappe.get_all(
        "Voice Channel",
        fields=["name", "channel_name", "emoji", "is_private", "description"],
        order_by="channel_name asc"
    )
    
    accessible_channels = []
    for channel in channels:
        doc = frappe.get_doc("Voice Channel", channel.name)
        if doc.is_member(user):
            channel["is_admin"] = doc.is_admin(user)
            accessible_channels.append(channel)
    
    return accessible_channels


@frappe.whitelist()
def get_channel_members(channel):
    """Get members of a channel"""
    if not can_access_channel(channel):
        frappe.throw(_("You don't have access to this channel"))
    
    doc = frappe.get_doc("Voice Channel", channel)
    members = []
    
    for member in doc.members:
        user_doc = frappe.get_doc("User", member.user)
        members.append({
            "user": member.user,
            "full_name": user_doc.full_name,
            "user_image": user_doc.user_image,
            "is_admin": member.is_admin
        })
    
    return members


# ========================================
# Timeline API Endpoints
# ========================================

@frappe.whitelist()
def get_timeline(channel, limit=50, offset=0):
    """Get timeline items for a channel"""
    if not can_access_channel(channel):
        frappe.throw(_("You don't have access to this channel"))
    
    items = frappe.get_all(
        "Channel Timeline Item",
        filters={"channel": channel},
        fields=[
            "name", "item_type", "content", "voice_file", "voice_duration",
            "status_emoji", "todo_title", "assigned_user", "due_date",
            "is_completed", "owner", "creation"
        ],
        order_by="creation desc",
        limit_page_length=int(limit),
        start=int(offset)
    )
    
    # Enrich with user info
    for item in items:
        user = frappe.get_doc("User", item.owner)
        item["owner_name"] = user.full_name
        item["owner_image"] = user.user_image
        
        if item.assigned_user:
            assigned = frappe.get_doc("User", item.assigned_user)
            item["assigned_name"] = assigned.full_name
    
    return items


@frappe.whitelist()
def create_text_note(channel, content, status_emoji=None):
    """Create a text note in a channel"""
    if not can_access_channel(channel):
        frappe.throw(_("You don't have access to this channel"))
    
    doc = frappe.get_doc({
        "doctype": "Channel Timeline Item",
        "channel": channel,
        "item_type": "Text Note",
        "content": content,
        "status_emoji": status_emoji
    })
    doc.insert()
    frappe.db.commit()
    
    return {"name": doc.name, "message": "Text note created successfully"}


@frappe.whitelist()
def create_voice_note(channel, voice_file, voice_duration=0, status_emoji=None):
    """Create a voice note in a channel"""
    if not can_access_channel(channel):
        frappe.throw(_("You don't have access to this channel"))
    
    doc = frappe.get_doc({
        "doctype": "Channel Timeline Item",
        "channel": channel,
        "item_type": "Voice Note",
        "voice_file": voice_file,
        "voice_duration": float(voice_duration) if voice_duration else 0,
        "status_emoji": status_emoji
    })
    doc.insert()
    frappe.db.commit()
    
    return {"name": doc.name, "message": "Voice note created successfully"}


@frappe.whitelist()
def create_todo(channel, todo_title, assigned_user=None, due_date=None, status_emoji=None):
    """Create a todo in a channel"""
    if not can_access_channel(channel):
        frappe.throw(_("You don't have access to this channel"))
    
    doc = frappe.get_doc({
        "doctype": "Channel Timeline Item",
        "channel": channel,
        "item_type": "Todo",
        "todo_title": todo_title,
        "assigned_user": assigned_user,
        "due_date": due_date,
        "status_emoji": status_emoji
    })
    doc.insert()
    frappe.db.commit()
    
    return {"name": doc.name, "message": "Todo created successfully"}


@frappe.whitelist()
def toggle_todo(item_name):
    """Toggle todo completion status"""
    doc = frappe.get_doc("Channel Timeline Item", item_name)
    
    if not can_access_channel(doc.channel):
        frappe.throw(_("You don't have access to this channel"))
    
    if doc.item_type != "Todo":
        frappe.throw(_("This item is not a todo"))
    
    doc.is_completed = not doc.is_completed
    doc.save()
    frappe.db.commit()
    
    return {"is_completed": doc.is_completed}


@frappe.whitelist()
def update_status_emoji(item_name, emoji):
    """Update status emoji for a timeline item"""
    doc = frappe.get_doc("Channel Timeline Item", item_name)
    
    if not can_access_channel(doc.channel):
        frappe.throw(_("You don't have access to this channel"))
    
    doc.status_emoji = emoji
    doc.save()
    frappe.db.commit()
    
    return {"status_emoji": doc.status_emoji}


@frappe.whitelist()
def delete_timeline_item(item_name):
    """Delete a timeline item (admin or owner only)"""
    doc = frappe.get_doc("Channel Timeline Item", item_name)
    channel_doc = frappe.get_doc("Voice Channel", doc.channel)
    
    # Check if user is admin or owner
    user = frappe.session.user
    if not (channel_doc.is_admin(user) or doc.owner == user):
        frappe.throw(_("You can only delete your own items or be a channel admin"))
    
    frappe.delete_doc("Channel Timeline Item", item_name)
    frappe.db.commit()
    
    return {"message": "Item deleted successfully"}


@frappe.whitelist()
def upload_voice_file():
    """Handle voice file upload"""
    if "file" not in frappe.request.files:
        frappe.throw(_("No file uploaded"))
    
    file = frappe.request.files["file"]
    channel = frappe.form_dict.get("channel")
    duration = frappe.form_dict.get("duration", 0)
    
    if not can_access_channel(channel):
        frappe.throw(_("You don't have access to this channel"))
    
    # Save the file
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": file.filename,
        "is_private": 1,
        "content": file.read()
    })
    file_doc.save()
    
    # Create the voice note
    doc = frappe.get_doc({
        "doctype": "Channel Timeline Item",
        "channel": channel,
        "item_type": "Voice Note",
        "voice_file": file_doc.file_url,
        "voice_duration": float(duration) if duration else 0
    })
    doc.insert()
    frappe.db.commit()
    
    return {
        "name": doc.name,
        "file_url": file_doc.file_url,
        "message": "Voice note uploaded successfully"
    }


# ========================================
# Permission Helpers
# ========================================

def can_access_channel(channel):
    """Check if current user can access a channel"""
    try:
        doc = frappe.get_doc("Voice Channel", channel)
        return doc.is_member(frappe.session.user)
    except Exception:
        return False


# ========================================
# Document Event Hooks (called from hooks.py)
# ========================================

def validate_channel_access(doc, method):
    """Validate access when saving a channel"""
    pass  # Additional validation can be added here


def set_timeline_item_owner(doc, method):
    """Set owner for timeline item before insert"""
    if not doc.owner:
        doc.owner = frappe.session.user


def validate_timeline_item_access(doc, method):
    """Validate access when saving a timeline item"""
    if not can_access_channel(doc.channel):
        frappe.throw(_("You don't have access to this channel"))


def get_timeline_item_permission_query(user):
    """Permission query for timeline items - filter by channel membership"""
    if "System Manager" in frappe.get_roles(user):
        return ""
    
    # Get channels user has access to
    accessible_channels = []
    channels = frappe.get_all("Voice Channel", fields=["name", "is_private"])
    
    for channel in channels:
        if not channel.is_private:
            accessible_channels.append(channel.name)
        else:
            # Check if user is a member
            members = frappe.get_all(
                "Channel Member",
                filters={"parent": channel.name, "user": user},
                limit=1
            )
            if members:
                accessible_channels.append(channel.name)
    
    if not accessible_channels:
        return "1=0"  # Return no results
    
    channel_list = ", ".join([f"'{c}'" for c in accessible_channels])
    return f"`tabChannel Timeline Item`.channel IN ({channel_list})"


def has_timeline_item_permission(doc, ptype, user):
    """Check if user has permission for a specific timeline item"""
    if "System Manager" in frappe.get_roles(user):
        return True
    
    try:
        channel_doc = frappe.get_doc("Voice Channel", doc.channel)
        return channel_doc.is_member(user)
    except Exception:
        return False
