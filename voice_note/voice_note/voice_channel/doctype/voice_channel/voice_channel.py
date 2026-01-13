# Copyright (c) 2026, Voice Note Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VoiceChannel(Document):
    def validate(self):
        self.validate_members()
    
    def validate_members(self):
        """Ensure no duplicate members"""
        users = []
        for member in self.members:
            if member.user in users:
                frappe.throw(f"User {member.user} is already a member of this channel")
            users.append(member.user)
    
    def is_member(self, user=None):
        """Check if user is a member of this channel"""
        if not user:
            user = frappe.session.user
        
        # System Manager always has access
        if "System Manager" in frappe.get_roles(user):
            return True
        
        # Public channels are accessible to all
        if not self.is_private:
            return True
        
        # Check membership for private channels
        for member in self.members:
            if member.user == user:
                return True
        
        return False
    
    def is_admin(self, user=None):
        """Check if user is an admin of this channel"""
        if not user:
            user = frappe.session.user
        
        # System Manager is always admin
        if "System Manager" in frappe.get_roles(user):
            return True
        
        for member in self.members:
            if member.user == user and member.is_admin:
                return True
        
        return False
