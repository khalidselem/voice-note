# Copyright (c) 2026, ITQAN LLC
# For license information, please see license.txt

import frappe

no_cache = 1

def get_context(context):
    context.no_cache = 1
    
    if frappe.session.user == "Guest":
        frappe.local.flags.redirect_location = "/login?redirect-to=/voice-channels"
        raise frappe.Redirect
    
    context.title = "Voice Channels"
