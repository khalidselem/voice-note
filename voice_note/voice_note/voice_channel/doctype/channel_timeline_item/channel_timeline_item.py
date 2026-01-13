# Copyright (c) 2026, Voice Note Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ChannelTimelineItem(Document):
    def validate(self):
        self.validate_item_type_fields()
    
    def validate_item_type_fields(self):
        """Validate that required fields are set based on item type"""
        if self.item_type == "Voice Note":
            if not self.voice_file:
                frappe.throw("Voice File is required for Voice Note items")
        elif self.item_type == "Text Note":
            if not self.content:
                frappe.throw("Content is required for Text Note items")
        elif self.item_type == "Todo":
            if not self.todo_title:
                frappe.throw("Todo Title is required for Todo items")
    
    def before_insert(self):
        """Set owner if not set"""
        if not self.owner:
            self.owner = frappe.session.user
