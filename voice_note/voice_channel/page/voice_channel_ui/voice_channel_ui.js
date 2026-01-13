frappe.pages['voice-channel-ui'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Voice Channels',
        single_column: true
    });

    // Initialize the Voice Channel App
    new VoiceChannelApp(page);
};

class VoiceChannelApp {
    constructor(page) {
        this.page = page;
        this.currentChannel = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingStartTime = null;
        this.recordingTimer = null;

        // Common emojis for status picker
        this.emojis = [
            '👍', '❤️', '😊', '🎉', '🔥', '✅', '⭐', '💡',
            '🚀', '💪', '👏', '🙌', '💯', '🎯', '📌', '⚡',
            '🔔', '📢', '💬', '📝', '🎤', '🎵', '🎧', '📎'
        ];

        this.init();
    }

    init() {
        this.setupLayout();
        this.loadChannels();
        this.bindEvents();
        this.setupEmojiPicker();
    }

    setupLayout() {
        $(this.page.body).html(frappe.render_template('voice_channel_ui'));
    }

    // ========================================
    // Channel Management
    // ========================================

    async loadChannels() {
        try {
            const response = await frappe.call({
                method: 'voice_note.voice_channel.api.voice.get_channels'
            });

            const channels = response.message || [];
            this.renderChannelList(channels);

            // Select first channel if available
            if (channels.length > 0 && !this.currentChannel) {
                this.selectChannel(channels[0].name);
            }
        } catch (error) {
            console.error('Error loading channels:', error);
            frappe.msgprint(__('Error loading channels'));
        }
    }

    renderChannelList(channels) {
        const $list = $('#channel-list');
        $list.empty();

        if (channels.length === 0) {
            $list.html(`
                <div class="vc-no-channels">
                    <p>No channels yet</p>
                    <small>Create a channel to get started</small>
                </div>
            `);
            return;
        }

        channels.forEach(channel => {
            const isActive = this.currentChannel === channel.name;
            const $item = $(`
                <div class="vc-channel-item ${isActive ? 'active' : ''}" data-channel="${channel.name}">
                    <span class="vc-channel-item-emoji">${channel.emoji || '📢'}</span>
                    <span class="vc-channel-item-name">${channel.channel_name}</span>
                    ${channel.is_private ? '<i class="fa fa-lock vc-private-icon"></i>' : ''}
                </div>
            `);
            $list.append($item);
        });
    }

    async selectChannel(channelName) {
        this.currentChannel = channelName;

        // Update UI
        $('.vc-channel-item').removeClass('active');
        $(`.vc-channel-item[data-channel="${channelName}"]`).addClass('active');

        // Load channel info
        try {
            const doc = await frappe.db.get_doc('Voice Channel', channelName);
            $('#channel-header .vc-channel-emoji').text(doc.emoji || '📢');
            $('#channel-header .vc-channel-name').text(doc.channel_name);

            // Show input area
            $('#input-area').show();

            // Load timeline
            this.loadTimeline();
        } catch (error) {
            console.error('Error loading channel:', error);
        }
    }

    // ========================================
    // Timeline Management
    // ========================================

    async loadTimeline() {
        if (!this.currentChannel) return;

        try {
            const response = await frappe.call({
                method: 'voice_note.voice_channel.api.voice.get_timeline',
                args: { channel: this.currentChannel }
            });

            const items = response.message || [];
            this.renderTimeline(items);
        } catch (error) {
            console.error('Error loading timeline:', error);
        }
    }

    renderTimeline(items) {
        const $timeline = $('#timeline');

        if (items.length === 0) {
            $('#empty-state').show();
            return;
        }

        $('#empty-state').hide();

        // Clear previous items (keep empty state)
        $timeline.find('.vc-timeline-item').remove();

        // Render items in reverse order (oldest first at top)
        items.reverse().forEach(item => {
            const $item = this.createTimelineItem(item);
            $timeline.append($item);
        });

        // Scroll to bottom
        $timeline.scrollTop($timeline[0].scrollHeight);
    }

    createTimelineItem(item) {
        const timeAgo = frappe.datetime.prettyDate(item.creation);
        const avatarUrl = item.owner_image || '/assets/frappe/images/default-avatar.png';

        let contentHtml = '';
        let typeIcon = '';
        let typeClass = '';

        switch (item.item_type) {
            case 'Voice Note':
                typeIcon = '🎤';
                typeClass = 'voice-note';
                contentHtml = `
                    <div class="vc-voice-player">
                        <audio controls src="${item.voice_file}"></audio>
                        <span class="vc-voice-duration">${this.formatDuration(item.voice_duration)}</span>
                    </div>
                `;
                break;

            case 'Text Note':
                typeIcon = '📝';
                typeClass = 'text-note';
                contentHtml = `<div class="vc-text-content">${item.content || ''}</div>`;
                break;

            case 'Todo':
                typeIcon = '✅';
                typeClass = 'todo';
                contentHtml = `
                    <div class="vc-todo-content ${item.is_completed ? 'completed' : ''}">
                        <label class="vc-todo-checkbox">
                            <input type="checkbox" ${item.is_completed ? 'checked' : ''} data-item="${item.name}">
                            <span class="vc-todo-title">${item.todo_title}</span>
                        </label>
                        ${item.assigned_name ? `<span class="vc-todo-assigned">@${item.assigned_name}</span>` : ''}
                        ${item.due_date ? `<span class="vc-todo-due">${frappe.datetime.str_to_user(item.due_date)}</span>` : ''}
                    </div>
                `;
                break;
        }

        return $(`
            <div class="vc-timeline-item ${typeClass}" data-item="${item.name}">
                <div class="vc-timeline-item-avatar">
                    <img src="${avatarUrl}" alt="${item.owner_name}">
                </div>
                <div class="vc-timeline-item-content">
                    <div class="vc-timeline-item-header">
                        <span class="vc-item-type-icon">${typeIcon}</span>
                        <span class="vc-item-owner">${item.owner_name}</span>
                        <span class="vc-item-time">${timeAgo}</span>
                        ${item.status_emoji ? `<span class="vc-item-emoji">${item.status_emoji}</span>` : ''}
                        <button class="vc-btn vc-btn-icon vc-emoji-btn" data-item="${item.name}" title="Add Emoji">
                            <i class="fa fa-smile-o"></i>
                        </button>
                        <button class="vc-btn vc-btn-icon vc-delete-btn" data-item="${item.name}" title="Delete">
                            <i class="fa fa-trash-o"></i>
                        </button>
                    </div>
                    <div class="vc-timeline-item-body">
                        ${contentHtml}
                    </div>
                </div>
            </div>
        `);
    }

    formatDuration(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ========================================
    // Voice Recording
    // ========================================

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                this.uploadRecording();
            };

            this.mediaRecorder.start();
            this.recordingStartTime = Date.now();
            this.startRecordingTimer();

            // Update UI
            $('#record-btn').hide();
            $('#recording-indicator').show();

        } catch (error) {
            console.error('Error starting recording:', error);
            frappe.msgprint(__('Could not access microphone. Please ensure microphone permissions are granted.'));
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        this.stopRecordingTimer();

        // Update UI
        $('#record-btn').show();
        $('#recording-indicator').hide();
    }

    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            $('#recording-time').text(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        }, 100);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        $('#recording-time').text('00:00');
    }

    async uploadRecording() {
        if (this.audioChunks.length === 0) return;

        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const duration = (Date.now() - this.recordingStartTime) / 1000;

        try {
            // Upload file first
            const formData = new FormData();
            formData.append('file', blob, `voice_${Date.now()}.webm`);
            formData.append('is_private', '1');
            formData.append('doctype', 'Channel Timeline Item');

            const uploadResponse = await fetch('/api/method/upload_file', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Frappe-CSRF-Token': frappe.csrf_token
                }
            });

            const uploadResult = await uploadResponse.json();

            if (uploadResult.message && uploadResult.message.file_url) {
                // Create voice note
                await frappe.call({
                    method: 'voice_note.voice_channel.api.voice.create_voice_note',
                    args: {
                        channel: this.currentChannel,
                        voice_file: uploadResult.message.file_url,
                        voice_duration: duration
                    }
                });

                // Reload timeline
                this.loadTimeline();
                frappe.show_alert({ message: __('Voice note sent!'), indicator: 'green' });
            }
        } catch (error) {
            console.error('Error uploading recording:', error);
            frappe.msgprint(__('Error uploading voice note'));
        }
    }

    // ========================================
    // Text & Todo Input
    // ========================================

    async sendTextNote() {
        const content = $('#text-input').val().trim();
        if (!content) return;

        try {
            await frappe.call({
                method: 'voice_note.voice_channel.api.voice.create_text_note',
                args: {
                    channel: this.currentChannel,
                    content: content
                }
            });

            $('#text-input').val('');
            this.loadTimeline();
            frappe.show_alert({ message: __('Message sent!'), indicator: 'green' });
        } catch (error) {
            console.error('Error sending text note:', error);
        }
    }

    async addTodo() {
        const title = $('#todo-title').val().trim();
        if (!title) return;

        const dueDate = $('#todo-date').val();

        try {
            await frappe.call({
                method: 'voice_note.voice_channel.api.voice.create_todo',
                args: {
                    channel: this.currentChannel,
                    todo_title: title,
                    due_date: dueDate || null
                }
            });

            $('#todo-title').val('');
            $('#todo-date').val('');
            this.loadTimeline();
            frappe.show_alert({ message: __('Todo added!'), indicator: 'green' });
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    }

    async toggleTodo(itemName) {
        try {
            await frappe.call({
                method: 'voice_note.voice_channel.api.voice.toggle_todo',
                args: { item_name: itemName }
            });

            this.loadTimeline();
        } catch (error) {
            console.error('Error toggling todo:', error);
        }
    }

    // ========================================
    // Emoji Status
    // ========================================

    setupEmojiPicker() {
        const $grid = $('#emoji-grid');
        this.emojis.forEach(emoji => {
            $grid.append(`<span class="vc-emoji-option">${emoji}</span>`);
        });
    }

    showEmojiPicker(itemName) {
        this.emojiTargetItem = itemName;
        $('#emoji-modal').show();
    }

    async selectEmoji(emoji) {
        if (!this.emojiTargetItem) return;

        try {
            await frappe.call({
                method: 'voice_note.voice_channel.api.voice.update_status_emoji',
                args: {
                    item_name: this.emojiTargetItem,
                    emoji: emoji
                }
            });

            $('#emoji-modal').hide();
            this.loadTimeline();
        } catch (error) {
            console.error('Error updating emoji:', error);
        }
    }

    // ========================================
    // Channel Creation
    // ========================================

    showCreateChannelModal() {
        $('#create-channel-modal').show();
    }

    async createChannel() {
        const name = $('#new-channel-name').val().trim();
        const emoji = $('#new-channel-emoji').val().trim();
        const description = $('#new-channel-description').val().trim();
        const isPrivate = $('#new-channel-private').is(':checked');

        if (!name) {
            frappe.msgprint(__('Channel name is required'));
            return;
        }

        try {
            const doc = await frappe.db.insert({
                doctype: 'Voice Channel',
                channel_name: name,
                emoji: emoji || '📢',
                description: description,
                is_private: isPrivate,
                members: [{
                    user: frappe.session.user,
                    is_admin: 1
                }]
            });

            $('#create-channel-modal').hide();
            $('#new-channel-name').val('');
            $('#new-channel-emoji').val('📢');
            $('#new-channel-description').val('');
            $('#new-channel-private').prop('checked', false);

            await this.loadChannels();
            this.selectChannel(doc.name);

            frappe.show_alert({ message: __('Channel created!'), indicator: 'green' });
        } catch (error) {
            console.error('Error creating channel:', error);
            frappe.msgprint(__('Error creating channel'));
        }
    }

    // ========================================
    // Delete Item
    // ========================================

    async deleteItem(itemName) {
        frappe.confirm(
            __('Are you sure you want to delete this item?'),
            async () => {
                try {
                    await frappe.call({
                        method: 'voice_note.voice_channel.api.voice.delete_timeline_item',
                        args: { item_name: itemName }
                    });

                    this.loadTimeline();
                    frappe.show_alert({ message: __('Item deleted'), indicator: 'green' });
                } catch (error) {
                    console.error('Error deleting item:', error);
                }
            }
        );
    }

    // ========================================
    // Members Modal
    // ========================================

    async showMembersModal() {
        if (!this.currentChannel) return;

        try {
            const response = await frappe.call({
                method: 'voice_note.voice_channel.api.voice.get_channel_members',
                args: { channel: this.currentChannel }
            });

            const members = response.message || [];
            const $list = $('#members-list');
            $list.empty();

            members.forEach(member => {
                const avatarUrl = member.user_image || '/assets/frappe/images/default-avatar.png';
                $list.append(`
                    <div class="vc-member-item">
                        <img src="${avatarUrl}" class="vc-member-avatar">
                        <span class="vc-member-name">${member.full_name}</span>
                        ${member.is_admin ? '<span class="vc-admin-badge">Admin</span>' : ''}
                    </div>
                `);
            });

            $('#members-modal').show();
        } catch (error) {
            console.error('Error loading members:', error);
        }
    }

    // ========================================
    // Event Bindings
    // ========================================

    bindEvents() {
        const self = this;

        // Channel selection
        $(document).on('click', '.vc-channel-item', function () {
            const channelName = $(this).data('channel');
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
        $('#record-btn').on('click', () => this.startRecording());
        $('#stop-record-btn').on('click', () => this.stopRecording());

        // Text note
        $('#send-text-btn').on('click', () => this.sendTextNote());
        $('#text-input').on('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendTextNote();
            }
        });

        // Todo
        $('#add-todo-btn').on('click', () => this.addTodo());
        $('#todo-title').on('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTodo();
            }
        });

        // Todo checkbox
        $(document).on('change', '.vc-todo-checkbox input', function () {
            const itemName = $(this).data('item');
            self.toggleTodo(itemName);
        });

        // Emoji
        $(document).on('click', '.vc-emoji-btn', function () {
            const itemName = $(this).data('item');
            self.showEmojiPicker(itemName);
        });

        $(document).on('click', '.vc-emoji-option', function () {
            const emoji = $(this).text();
            self.selectEmoji(emoji);
        });

        // Delete item
        $(document).on('click', '.vc-delete-btn', function () {
            const itemName = $(this).data('item');
            self.deleteItem(itemName);
        });

        // Create channel
        $('#create-channel-btn').on('click', () => this.showCreateChannelModal());
        $('#submit-create-channel').on('click', () => this.createChannel());
        $('#cancel-create-channel').on('click', () => $('#create-channel-modal').hide());

        // Members modal
        $('#channel-members-btn').on('click', () => this.showMembersModal());

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
    }
}
