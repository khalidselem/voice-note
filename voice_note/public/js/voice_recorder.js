// Voice Channel - Global JS (included via hooks.py)
// This file is for any JavaScript that should be available globally

// Voice Recorder utility - can be used elsewhere if needed
frappe.provide('voice_note');

voice_note.VoiceRecorder = class VoiceRecorder {
    constructor(options = {}) {
        this.onRecordingComplete = options.onRecordingComplete || (() => { });
        this.onError = options.onError || ((e) => console.error(e));

        this.mediaRecorder = null;
        this.audioChunks = [];
        this.startTime = null;
    }

    async start() {
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
                const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const duration = (Date.now() - this.startTime) / 1000;
                this.onRecordingComplete(blob, duration);
            };

            this.startTime = Date.now();
            this.mediaRecorder.start();

            return true;
        } catch (error) {
            this.onError(error);
            return false;
        }
    }

    stop() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    isRecording() {
        return this.mediaRecorder && this.mediaRecorder.state === 'recording';
    }
};
