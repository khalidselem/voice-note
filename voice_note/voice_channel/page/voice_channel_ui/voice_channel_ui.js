frappe.pages['voice-channel-ui'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Voice Channels',
        single_column: true
    });

    // Initialize the Voice Channel App
    window.VoiceChannelApp = new VoiceChannelAppClass(page);
};

function VoiceChannelAppClass(page) {
    var self = this;
    self.page = page;
    self.currentChannel = null;
    self.mediaRecorder = null;
    self.audioChunks = [];
    self.recordingStartTime = null;
    self.recordingTimer = null;
    self.emojiTargetItem = null;

    // Status labels for picker
    self.emojis = [
        '+1', 'OK', 'Yes', 'No', 'Done', 'WIP', 'Help', 'Urgent',
        'Review', 'Approved', 'Blocked', 'Question', 'Idea', 'Bug', 'Feature', 'Note'
    ];

    self.init();
}

VoiceChannelAppClass.prototype.init = function () {
    var self = this;
    self.setupLayout();
    self.loadChannels();
    self.bindEvents();
    self.setupEmojiPicker();
};

VoiceChannelAppClass.prototype.setupLayout = function () {
    var self = this;
    var html = '<div class="voice-channel-page">' +
        '<aside class="vc-sidebar">' +
        '<div class="vc-sidebar-header">' +
        '<h3><i class="fa fa-bullhorn"></i> Channels</h3>' +
        '<button class="vc-btn vc-btn-icon" id="create-channel-btn" title="Create Channel">' +
        '<i class="fa fa-plus"></i>' +
        '</button>' +
        '</div>' +
        '<div class="vc-channel-list" id="channel-list"></div>' +
        '</aside>' +
        '<main class="vc-main">' +
        '<header class="vc-channel-header" id="channel-header">' +
        '<div class="vc-channel-info">' +
        '<span class="vc-channel-emoji"><i class="fa fa-bullhorn"></i></span>' +
        '<h2 class="vc-channel-name">Select a Channel</h2>' +
        '</div>' +
        '<div class="vc-channel-actions">' +
        '<button class="vc-btn vc-btn-icon" id="channel-members-btn" title="View Members">' +
        '<i class="fa fa-users"></i>' +
        '</button>' +
        '</div>' +
        '</header>' +
        '<div class="vc-timeline" id="timeline">' +
        '<div class="vc-empty-state" id="empty-state">' +
        '<div class="vc-empty-icon"><i class="fa fa-comments fa-3x"></i></div>' +
        '<h3>No messages yet</h3>' +
        '<p>Start a conversation by sending a voice note, text, or creating a todo.</p>' +
        '</div>' +
        '</div>' +
        '<div class="vc-input-area" id="input-area">' +
        '<div class="vc-voice-recorder" id="voice-recorder">' +
        '<button class="vc-record-btn" id="record-btn" title="Record Voice Note">' +
        '<i class="fa fa-microphone"></i>' +
        '</button>' +
        '<div class="vc-recording-indicator" id="recording-indicator" style="display: none;">' +
        '<span class="vc-recording-dot"></span>' +
        '<span class="vc-recording-time" id="recording-time">00:00</span>' +
        '<button class="vc-btn vc-btn-danger" id="stop-record-btn">' +
        '<i class="fa fa-stop"></i> Stop' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<div class="vc-text-input-container" id="text-input-container" style="display: none;">' +
        '<textarea class="vc-text-input" id="text-input" placeholder="Type a message..."></textarea>' +
        '<button class="vc-btn vc-btn-primary" id="send-text-btn">' +
        '<i class="fa fa-paper-plane"></i>' +
        '</button>' +
        '</div>' +
        '<div class="vc-todo-input-container" id="todo-input-container" style="display: none;">' +
        '<input type="text" class="vc-todo-title" id="todo-title" placeholder="Todo title...">' +
        '<input type="date" class="vc-todo-date" id="todo-date">' +
        '<button class="vc-btn vc-btn-success" id="add-todo-btn">' +
        '<i class="fa fa-plus"></i> Add' +
        '</button>' +
        '</div>' +
        '<div class="vc-input-toggles">' +
        '<button class="vc-toggle-btn active" id="toggle-voice" title="Voice Note">' +
        '<i class="fa fa-microphone"></i>' +
        '</button>' +
        '<button class="vc-toggle-btn" id="toggle-text" title="Text Note">' +
        '<i class="fa fa-comment"></i>' +
        '</button>' +
        '<button class="vc-toggle-btn" id="toggle-todo" title="Todo">' +
        '<i class="fa fa-check-square-o"></i>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</main>' +
        '</div>' +
        '<div class="vc-modal" id="emoji-modal" style="display: none;">' +
        '<div class="vc-modal-content">' +
        '<div class="vc-modal-header">' +
        '<h4>Select Emoji</h4>' +
        '<button class="vc-btn vc-btn-icon vc-modal-close">&times;</button>' +
        '</div>' +
        '<div class="vc-emoji-grid" id="emoji-grid"></div>' +
        '</div>' +
        '</div>' +
        '<div class="vc-modal" id="create-channel-modal" style="display: none;">' +
        '<div class="vc-modal-content">' +
        '<div class="vc-modal-header">' +
        '<h4>Create Channel</h4>' +
        '<button class="vc-btn vc-btn-icon vc-modal-close">&times;</button>' +
        '</div>' +
        '<div class="vc-modal-body">' +
        '<div class="vc-form-group">' +
        '<label>Channel Name *</label>' +
        '<input type="text" id="new-channel-name" class="vc-input" placeholder="e.g. General">' +
        '</div>' +
        '<div class="vc-form-group">' +
        '<label>Emoji</label>' +
        '<input type="text" id="new-channel-emoji" class="vc-input" value="#" maxlength="4">' +
        '</div>' +
        '<div class="vc-form-group">' +
        '<label>Description</label>' +
        '<textarea id="new-channel-description" class="vc-input" placeholder="What is this channel about?"></textarea>' +
        '</div>' +
        '<div class="vc-form-group">' +
        '<label><input type="checkbox" id="new-channel-private"> Private Channel</label>' +
        '</div>' +
        '</div>' +
        '<div class="vc-modal-footer">' +
        '<button class="vc-btn" id="cancel-create-channel">Cancel</button>' +
        '<button class="vc-btn vc-btn-primary" id="submit-create-channel">Create</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="vc-modal" id="members-modal" style="display: none;">' +
        '<div class="vc-modal-content">' +
        '<div class="vc-modal-header">' +
        '<h4>Channel Members</h4>' +
        '<button class="vc-btn vc-btn-icon vc-modal-close">&times;</button>' +
        '</div>' +
        '<div class="vc-modal-body">' +
        '<div class="vc-members-list" id="members-list"></div>' +
        '</div>' +
        '</div>' +
        '</div>';

    $(self.page.body).html(html);

    // Apply CSS styles
    if (!$('#voice-channel-styles').length) {
        $('head').append('<link id="voice-channel-styles" rel="stylesheet" href="/assets/voice_note/css/voice_channel_page.css">');
    }
};

// ========================================
// Channel Management
// ========================================

VoiceChannelAppClass.prototype.loadChannels = function () {
    var self = this;

    frappe.call({
        method: 'voice_note.voice_channel.api.voice.get_channels',
        callback: function (response) {
            var channels = response.message || [];
            self.renderChannelList(channels);

            // Select first channel if available
            if (channels.length > 0 && !self.currentChannel) {
                self.selectChannel(channels[0].name);
            }
        },
        error: function (error) {
            console.error('Error loading channels:', error);
            frappe.msgprint(__('Error loading channels'));
        }
    });
};

VoiceChannelAppClass.prototype.renderChannelList = function (channels) {
    var self = this;
    var $list = $('#channel-list');
    $list.empty();

    if (channels.length === 0) {
        $list.html(
            '<div class="vc-no-channels">' +
            '<p>No channels yet</p>' +
            '<small>Create a channel to get started</small>' +
            '</div>'
        );
        return;
    }

    channels.forEach(function (channel) {
        var isActive = self.currentChannel === channel.name;
        var privateIcon = channel.is_private ? '<i class="fa fa-lock vc-private-icon"></i>' : '';
        var $item = $(
            '<div class="vc-channel-item ' + (isActive ? 'active' : '') + '" data-channel="' + channel.name + '">' +
            '<span class="vc-channel-item-emoji">' + (channel.emoji || '#') + '</span>' +
            '<span class="vc-channel-item-name">' + channel.channel_name + '</span>' +
            privateIcon +
            '</div>'
        );
        $list.append($item);
    });
};

VoiceChannelAppClass.prototype.selectChannel = function (channelName) {
    var self = this;
    self.currentChannel = channelName;

    // Update UI
    $('.vc-channel-item').removeClass('active');
    $('.vc-channel-item[data-channel="' + channelName + '"]').addClass('active');

    // Load channel info
    frappe.db.get_doc('Voice Channel', channelName).then(function (doc) {
        $('#channel-header .vc-channel-emoji').text(doc.emoji || '#');
        $('#channel-header .vc-channel-name').text(doc.channel_name);

        // Show input area
        $('#input-area').show();

        // Load timeline
        self.loadTimeline();
    }).catch(function (error) {
        console.error('Error loading channel:', error);
    });
};

// ========================================
// Timeline Management
// ========================================

VoiceChannelAppClass.prototype.loadTimeline = function () {
    var self = this;
    if (!self.currentChannel) return;

    frappe.call({
        method: 'voice_note.voice_channel.api.voice.get_timeline',
        args: { channel: self.currentChannel },
        callback: function (response) {
            var items = response.message || [];
            self.renderTimeline(items);
        },
        error: function (error) {
            console.error('Error loading timeline:', error);
        }
    });
};

VoiceChannelAppClass.prototype.renderTimeline = function (items) {
    var self = this;
    var $timeline = $('#timeline');

    if (items.length === 0) {
        $('#empty-state').show();
        return;
    }

    $('#empty-state').hide();

    // Clear previous items (keep empty state)
    $timeline.find('.vc-timeline-item').remove();

    // Render items in reverse order (oldest first at top)
    items.reverse().forEach(function (item) {
        var $item = self.createTimelineItem(item);
        $timeline.append($item);
    });

    // Scroll to bottom
    $timeline.scrollTop($timeline[0].scrollHeight);
};

VoiceChannelAppClass.prototype.createTimelineItem = function (item) {
    var self = this;
    var timeAgo = frappe.datetime.prettyDate(item.creation);
    var avatarUrl = item.owner_image || '/assets/frappe/images/default-avatar.png';

    var contentHtml = '';
    var typeIcon = '';
    var typeClass = '';

    if (item.item_type === 'Voice Note') {
        typeIcon = '🎤';
        typeClass = 'voice-note';
        contentHtml =
            '<div class="vc-voice-player">' +
            '<audio controls src="' + item.voice_file + '"></audio>' +
            '<span class="vc-voice-duration">' + self.formatDuration(item.voice_duration) + '</span>' +
            '</div>';
    } else if (item.item_type === 'Text Note') {
        typeIcon = '📝';
        typeClass = 'text-note';
        contentHtml = '<div class="vc-text-content">' + (item.content || '') + '</div>';
    } else if (item.item_type === 'Todo') {
        typeIcon = '✅';
        typeClass = 'todo';
        var completedClass = item.is_completed ? 'completed' : '';
        var checkedAttr = item.is_completed ? 'checked' : '';
        var assignedHtml = item.assigned_name ? '<span class="vc-todo-assigned">@' + item.assigned_name + '</span>' : '';
        var dueDateHtml = item.due_date ? '<span class="vc-todo-due">' + frappe.datetime.str_to_user(item.due_date) + '</span>' : '';

        contentHtml =
            '<div class="vc-todo-content ' + completedClass + '">' +
            '<label class="vc-todo-checkbox">' +
            '<input type="checkbox" ' + checkedAttr + ' data-item="' + item.name + '">' +
            '<span class="vc-todo-title">' + item.todo_title + '</span>' +
            '</label>' +
            assignedHtml + dueDateHtml +
            '</div>';
    }

    var statusEmojiHtml = item.status_emoji ? '<span class="vc-item-emoji">' + item.status_emoji + '</span>' : '';

    return $(
        '<div class="vc-timeline-item ' + typeClass + '" data-item="' + item.name + '">' +
        '<div class="vc-timeline-item-avatar">' +
        '<img src="' + avatarUrl + '" alt="' + item.owner_name + '">' +
        '</div>' +
        '<div class="vc-timeline-item-content">' +
        '<div class="vc-timeline-item-header">' +
        '<span class="vc-item-type-icon">' + typeIcon + '</span>' +
        '<span class="vc-item-owner">' + item.owner_name + '</span>' +
        '<span class="vc-item-time">' + timeAgo + '</span>' +
        statusEmojiHtml +
        '<button class="vc-btn vc-btn-icon vc-emoji-btn" data-item="' + item.name + '" title="Add Emoji">' +
        '<i class="fa fa-smile-o"></i>' +
        '</button>' +
        '<button class="vc-btn vc-btn-icon vc-delete-btn" data-item="' + item.name + '" title="Delete">' +
        '<i class="fa fa-trash-o"></i>' +
        '</button>' +
        '</div>' +
        '<div class="vc-timeline-item-body">' + contentHtml + '</div>' +
        '</div>' +
        '</div>'
    );
};

VoiceChannelAppClass.prototype.formatDuration = function (seconds) {
    if (!seconds) return '0:00';
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
};

// ========================================
// Voice Recording
// ========================================

VoiceChannelAppClass.prototype.startRecording = function () {
    var self = this;

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            self.audioChunks = [];
            self.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            self.mediaRecorder.ondataavailable = function (e) {
                if (e.data.size > 0) {
                    self.audioChunks.push(e.data);
                }
            };

            self.mediaRecorder.onstop = function () {
                stream.getTracks().forEach(function (track) { track.stop(); });
                self.uploadRecording();
            };

            self.mediaRecorder.start();
            self.recordingStartTime = Date.now();
            self.startRecordingTimer();

            // Update UI
            $('#record-btn').hide();
            $('#recording-indicator').show();
        })
        .catch(function (error) {
            console.error('Error starting recording:', error);
            frappe.msgprint(__('Could not access microphone. Please ensure microphone permissions are granted.'));
        });
};

VoiceChannelAppClass.prototype.stopRecording = function () {
    var self = this;
    if (self.mediaRecorder && self.mediaRecorder.state !== 'inactive') {
        self.mediaRecorder.stop();
    }

    self.stopRecordingTimer();

    // Update UI
    $('#record-btn').show();
    $('#recording-indicator').hide();
};

VoiceChannelAppClass.prototype.startRecordingTimer = function () {
    var self = this;
    self.recordingTimer = setInterval(function () {
        var elapsed = Date.now() - self.recordingStartTime;
        var seconds = Math.floor(elapsed / 1000);
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        $('#recording-time').text((mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs);
    }, 100);
};

VoiceChannelAppClass.prototype.stopRecordingTimer = function () {
    var self = this;
    if (self.recordingTimer) {
        clearInterval(self.recordingTimer);
        self.recordingTimer = null;
    }
    $('#recording-time').text('00:00');
};

VoiceChannelAppClass.prototype.uploadRecording = function () {
    var self = this;
    if (self.audioChunks.length === 0) return;

    var blob = new Blob(self.audioChunks, { type: 'audio/webm' });
    var duration = (Date.now() - self.recordingStartTime) / 1000;

    // Upload file first
    var formData = new FormData();
    formData.append('file', blob, 'voice_' + Date.now() + '.webm');
    formData.append('is_private', '1');
    formData.append('doctype', 'Channel Timeline Item');

    fetch('/api/method/upload_file', {
        method: 'POST',
        body: formData,
        headers: {
            'X-Frappe-CSRF-Token': frappe.csrf_token
        }
    })
        .then(function (response) { return response.json(); })
        .then(function (uploadResult) {
            if (uploadResult.message && uploadResult.message.file_url) {
                // Create voice note
                frappe.call({
                    method: 'voice_note.voice_channel.api.voice.create_voice_note',
                    args: {
                        channel: self.currentChannel,
                        voice_file: uploadResult.message.file_url,
                        voice_duration: duration
                    },
                    callback: function () {
                        self.loadTimeline();
                        frappe.show_alert({ message: __('Voice note sent!'), indicator: 'green' });
                    }
                });
            }
        })
        .catch(function (error) {
            console.error('Error uploading recording:', error);
            frappe.msgprint(__('Error uploading voice note'));
        });
};

// ========================================
// Text & Todo Input
// ========================================

VoiceChannelAppClass.prototype.sendTextNote = function () {
    var self = this;
    var content = $('#text-input').val().trim();
    if (!content) return;

    frappe.call({
        method: 'voice_note.voice_channel.api.voice.create_text_note',
        args: {
            channel: self.currentChannel,
            content: content
        },
        callback: function () {
            $('#text-input').val('');
            self.loadTimeline();
            frappe.show_alert({ message: __('Message sent!'), indicator: 'green' });
        },
        error: function (error) {
            console.error('Error sending text note:', error);
        }
    });
};

VoiceChannelAppClass.prototype.addTodo = function () {
    var self = this;
    var title = $('#todo-title').val().trim();
    if (!title) return;

    var dueDate = $('#todo-date').val();

    frappe.call({
        method: 'voice_note.voice_channel.api.voice.create_todo',
        args: {
            channel: self.currentChannel,
            todo_title: title,
            due_date: dueDate || null
        },
        callback: function () {
            $('#todo-title').val('');
            $('#todo-date').val('');
            self.loadTimeline();
            frappe.show_alert({ message: __('Todo added!'), indicator: 'green' });
        },
        error: function (error) {
            console.error('Error adding todo:', error);
        }
    });
};

VoiceChannelAppClass.prototype.toggleTodo = function (itemName) {
    var self = this;

    frappe.call({
        method: 'voice_note.voice_channel.api.voice.toggle_todo',
        args: { item_name: itemName },
        callback: function () {
            self.loadTimeline();
        },
        error: function (error) {
            console.error('Error toggling todo:', error);
        }
    });
};

// ========================================
// Emoji Status
// ========================================

VoiceChannelAppClass.prototype.setupEmojiPicker = function () {
    var self = this;
    var $grid = $('#emoji-grid');
    self.emojis.forEach(function (emoji) {
        $grid.append('<span class="vc-emoji-option">' + emoji + '</span>');
    });
};

VoiceChannelAppClass.prototype.showEmojiPicker = function (itemName) {
    var self = this;
    self.emojiTargetItem = itemName;
    $('#emoji-modal').show();
};

VoiceChannelAppClass.prototype.selectEmoji = function (emoji) {
    var self = this;
    if (!self.emojiTargetItem) return;

    frappe.call({
        method: 'voice_note.voice_channel.api.voice.update_status_emoji',
        args: {
            item_name: self.emojiTargetItem,
            emoji: emoji
        },
        callback: function () {
            $('#emoji-modal').hide();
            self.loadTimeline();
        },
        error: function (error) {
            console.error('Error updating emoji:', error);
        }
    });
};

// ========================================
// Channel Creation
// ========================================

VoiceChannelAppClass.prototype.showCreateChannelModal = function () {
    $('#create-channel-modal').show();
};

VoiceChannelAppClass.prototype.createChannel = function () {
    var self = this;
    var name = $('#new-channel-name').val().trim();
    var emoji = $('#new-channel-emoji').val().trim();
    var description = $('#new-channel-description').val().trim();
    var isPrivate = $('#new-channel-private').is(':checked');

    if (!name) {
        frappe.msgprint(__('Channel name is required'));
        return;
    }

    frappe.db.insert({
        doctype: 'Voice Channel',
        channel_name: name,
        emoji: emoji || '#',
        description: description,
        is_private: isPrivate,
        members: [{
            user: frappe.session.user,
            is_admin: 1
        }]
    }).then(function (doc) {
        $('#create-channel-modal').hide();
        $('#new-channel-name').val('');
        $('#new-channel-emoji').val('#');
        $('#new-channel-description').val('');
        $('#new-channel-private').prop('checked', false);

        self.loadChannels();
        setTimeout(function () {
            self.selectChannel(doc.name);
        }, 500);

        frappe.show_alert({ message: __('Channel created!'), indicator: 'green' });
    }).catch(function (error) {
        console.error('Error creating channel:', error);
        frappe.msgprint(__('Error creating channel'));
    });
};

// ========================================
// Delete Item
// ========================================

VoiceChannelAppClass.prototype.deleteItem = function (itemName) {
    var self = this;

    frappe.confirm(
        __('Are you sure you want to delete this item?'),
        function () {
            frappe.call({
                method: 'voice_note.voice_channel.api.voice.delete_timeline_item',
                args: { item_name: itemName },
                callback: function () {
                    self.loadTimeline();
                    frappe.show_alert({ message: __('Item deleted'), indicator: 'green' });
                },
                error: function (error) {
                    console.error('Error deleting item:', error);
                }
            });
        }
    );
};

// ========================================
// Members Modal
// ========================================

VoiceChannelAppClass.prototype.showMembersModal = function () {
    var self = this;
    if (!self.currentChannel) return;

    frappe.call({
        method: 'voice_note.voice_channel.api.voice.get_channel_members',
        args: { channel: self.currentChannel },
        callback: function (response) {
            var members = response.message || [];
            var $list = $('#members-list');
            $list.empty();

            members.forEach(function (member) {
                var avatarUrl = member.user_image || '/assets/frappe/images/default-avatar.png';
                var adminBadge = member.is_admin ? '<span class="vc-admin-badge">Admin</span>' : '';
                $list.append(
                    '<div class="vc-member-item">' +
                    '<img src="' + avatarUrl + '" class="vc-member-avatar">' +
                    '<span class="vc-member-name">' + member.full_name + '</span>' +
                    adminBadge +
                    '</div>'
                );
            });

            $('#members-modal').show();
        },
        error: function (error) {
            console.error('Error loading members:', error);
        }
    });
};

// ========================================
// Event Bindings
// ========================================

VoiceChannelAppClass.prototype.bindEvents = function () {
    var self = this;

    // Channel selection
    $(document).on('click', '.vc-channel-item', function () {
        var channelName = $(this).data('channel');
        self.selectChannel(channelName);
    });

    // Input mode toggles
    $('#toggle-voice').on('click', function () {
        $('.vc-toggle-btn').removeClass('active');
        $(this).addClass('active');
        $('#voice-recorder').show();
        $('#text-input-container').hide();
        $('#todo-input-container').hide();
    });

    $('#toggle-text').on('click', function () {
        $('.vc-toggle-btn').removeClass('active');
        $(this).addClass('active');
        $('#voice-recorder').hide();
        $('#text-input-container').show();
        $('#todo-input-container').hide();
    });

    $('#toggle-todo').on('click', function () {
        $('.vc-toggle-btn').removeClass('active');
        $(this).addClass('active');
        $('#voice-recorder').hide();
        $('#text-input-container').hide();
        $('#todo-input-container').show();
    });

    // Voice recording
    $('#record-btn').on('click', function () { self.startRecording(); });
    $('#stop-record-btn').on('click', function () { self.stopRecording(); });

    // Text note
    $('#send-text-btn').on('click', function () { self.sendTextNote(); });
    $('#text-input').on('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            self.sendTextNote();
        }
    });

    // Todo
    $('#add-todo-btn').on('click', function () { self.addTodo(); });
    $('#todo-title').on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            self.addTodo();
        }
    });

    // Todo checkbox
    $(document).on('change', '.vc-todo-checkbox input', function () {
        var itemName = $(this).data('item');
        self.toggleTodo(itemName);
    });

    // Emoji
    $(document).on('click', '.vc-emoji-btn', function () {
        var itemName = $(this).data('item');
        self.showEmojiPicker(itemName);
    });

    $(document).on('click', '.vc-emoji-option', function () {
        var emoji = $(this).text();
        self.selectEmoji(emoji);
    });

    // Delete item
    $(document).on('click', '.vc-delete-btn', function () {
        var itemName = $(this).data('item');
        self.deleteItem(itemName);
    });

    // Create channel
    $('#create-channel-btn').on('click', function () { self.showCreateChannelModal(); });
    $('#submit-create-channel').on('click', function () { self.createChannel(); });
    $('#cancel-create-channel').on('click', function () { $('#create-channel-modal').hide(); });

    // Members modal
    $('#channel-members-btn').on('click', function () { self.showMembersModal(); });

    // Modal close buttons
    $(document).on('click', '.vc-modal-close', function () {
        $(this).closest('.vc-modal').hide();
    });

    // Close modal on outside click
    $(document).on('click', '.vc-modal', function (e) {
        if (e.target === this) {
            $(this).hide();
        }
    });
};
