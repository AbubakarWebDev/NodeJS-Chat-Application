const Joi = require('joi');

const Chat = require("../models/Chat");
const Message = require("../models/Message");

const AppError = require("../utils/AppError");
const { success } = require('../utils/apiResponse');




/**
 * @route   GET /api/v1/messages
 * @desc    Get all the messages that send by the current user on the inputted chatId
 * @access  Protected
 *
 * @param   {Object} req - Express request object.
 * @param   {Object} res - Express response object.
 *
 * @returns {void}
 */

const getAllMessages = async (req, res) => {
    // Joi Schema for input validation
    const schema = Joi.string()
        .label('Chat ID')
        .required()
        .regex(/^[0-9a-fA-F]{24}$/)
        .rule({ message: '{{#label}} is Invalid!' });

    // Validate request param with Joi schema
    const { error, value: chatId } = schema.validate(req.query.chatId);
    if (error) {
        // If input validation fails, throw AppError with 422 status code and validation errors
        throw new AppError(error.details[0].message, 422);
    }

    // Check if userId already attached to the chatId
    let checkUserExistOnChat = await Chat.findOne({
        _id: chatId,
        $or: [
            {
                users: {
                    $elemMatch: { $eq: req.user._id.toString() }
                },
            },
            {
                groupAdmins: {
                    $elemMatch: { $eq: req.user._id.toString() }
                }
            }
        ]
    });
    if (!checkUserExistOnChat) throw new AppError("This User is not attached with this chat", 400);

    const messages = await Message.find({
        chat: chatId,
    })
        .populate({
            path: "sender",
            select: "-password",
        })
        .populate({
            path: "chat"
        })

    return res.status(200).json(success("Success", 200, { messages }));
}




/**
 * @route   POST /api/v1/messages
 * @desc    Create Message record with the loggedin user Id as sender and inputted chatId as chat
 * @access  Protected
 *
 * @param   {Object} req - Express request object.
 * @param   {Object} res - Express response object.
 *
 * @returns {void}
 */

const sendMessage = async (req, res) => {
    // Joi Schema for input validation
    const schema = Joi.object({
        chatId: Joi.string()
            .label('Chat ID')
            .required()
            .regex(/^[0-9a-fA-F]{24}$/)
            .rule({ message: '{{#label}} is Invalid!' }),
        message: Joi.string().required()
    });

    // Validate request param with Joi schema
    const { error, value } = schema.validate(req.body);
    if (error) {
        // If input validation fails, throw AppError with 422 status code and validation errors
        throw new AppError(error.details[0].message, 422);
    }

    // Check if userId already attached to the chatId
    let checkUserExistOnChat = await Chat.findOne({
        _id: value.chatId,
        users: { $elemMatch: { $eq: req.user._id } }
    });
    if (!checkUserExistOnChat) throw new AppError("This User is not attached with this chat", 404);

    const createdMessage = await Message.create({
        content: value.message,
        chat: value.chatId,
        sender: req.user._id
    });

    await Chat.findByIdAndUpdate(value.chatId, { latestMessage: createdMessage._id });

    const completeMessage = await Message.findOne({ _id: createdMessage._id })
        .populate({
            path: "sender",
            select: "-password",
        })
        .populate({
            path: "chat",
        })
        .populate({
            path: "readBy",
            select: "-password",
        })

    return res.status(200).json(success("Success", 200, { message: completeMessage }));
}



/**
 * @route   PUT /api/v1/messages/readby
 * @desc    Update readby array of the message
 * @access  Protected
 *
 * @param   {Object} req - Express request object.
 * @param   {Object} res - Express response object.
 *
 * @returns {void}
 */

const updateReadBy = async (req, res) => {
    // Joi Schema for input validation
    const schema = Joi.object({
        messageId: Joi.string()
            .label('Message ID')
            .required()
            .regex(/^[0-9a-fA-F]{24}$/)
            .rule({ message: '{{#label}} is Invalid!' }),
    });

    // Validate request param with Joi schema
    const { error, value } = schema.validate(req.body);
    if (error) {
        // If input validation fails, throw AppError with 422 status code and validation errors
        throw new AppError(error.details[0].message, 422);
    }

    // Check if userId already attached to the chatId
    let checkMessageExist = await Message.findOne({ 
        _id: value.messageId,
        $ne: { sender: req.user._id.toString() },
        readBy: { $nin: [req.user._id] }
    });
    if (!checkMessageExist) throw new AppError("Invalid Message Id or Message update", 400);

    // Check if userId already attached to the chatId
    let checkUserExistOnChat = await Chat.findOne({
        _id: checkMessageExist.chat,
        users: { $elemMatch: { $eq: req.user._id } }
    });
    if (!checkUserExistOnChat) throw new AppError("This User is not attached with this chat", 404);

    const updatedMessage = await Message.findByIdAndUpdate(checkMessageExist._id, { $push: { readBy: req.user._id } }, { new: true });

    const completeMessage = await Message.findOne({ _id: updatedMessage._id })
        .populate({
            path: "sender",
            select: "-password",
        })
        .populate({
            path: "chat",
        })
        .populate({
            path: "readBy",
            select: "-password",
        })

    return res.status(200).json(success("Success", 200, { message: completeMessage }));
}


module.exports = {
    getAllMessages,
    sendMessage,
    updateReadBy
};