const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    chatName: {
        type: String,
        trim: true
    },
    isGroupChat: {
        type: Boolean,
        default: false,
    },
    groupIcon: {
        type: String,
        default: "group-icon.png"
    },
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
    },
    groupAdmins: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }],
    users: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User"
    }],
}, { 
    timestamps: true 
});

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;