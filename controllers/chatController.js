const Joi = require('joi');

const Chat = require("../models/Chat");
const { User } = require("../models/User");

const AppError = require("../utils/AppError");
const { success } = require('../utils/apiResponse');


class ChatController {
    /**
     * @route   POST /api/v1/chats
     * @desc    get or create the chat of the specified user with the current user
     * @access  Protected
     *
     * @param   {Object} req - Express request object.
     * @param   {Object} res - Express response object.
     *
     * @returns {void}
    */

    static async getOrCreateChat(req, res) {
        // Define Joi schema for params validation
        const schema = Joi.string()
            .label('User ID')
            .required()
            .regex(/^[0-9a-fA-F]{24}$/)
            .rule({ message: '{{#label}} is Invalid!' });

        // Validate request param with Joi schema
        const { error, value: userId } = schema.validate(req.body.userId);
        if (error) {
            // If input validation fails, throw AppError with 422 status code and validation errors
            throw new AppError(error.details[0].message, 422);
        }

        // Check if user already exists in database or not
        let checkId = await User.findOne({ _id: userId });
        if (!checkId) throw new AppError("UserId is not registered", 404);

        if (userId == req.user._id.toString()) {
            throw new AppError("Duplicate UserId. User Not able to create chat with itself", 400);
        }

        const chat = await Chat.find({
            isGroupChat: false,
            $and: [
                {
                    users: {
                        $elemMatch: {
                            $eq: req.user._id.toString()
                        }
                    }
                },
                {
                    users: {
                        $elemMatch: {
                            $eq: userId
                        }
                    }
                },
            ],
        })
            .populate({
                path: "users",
                select: "-password",
            })
            .populate({
                path: "latestMessage",
                populate: {
                    path: "sender",
                    select: "username firstName lastName avatar",
                }
            });

        if (chat.length) {
            return res.status(200).json(success("Success", 200, { chat: chat[0] }));
        }
        else {
            const createdChat = await Chat.create({
                chatName: "sender",
                isGroupChat: false,
                users: [req.user._id.toString(), userId],
            });

            const completeChat = await Chat.findOne({ _id: createdChat._id }).populate({
                path: "users",
                select: "-password",
            });

            return res.status(200).json(success("Success", 200, { chat: completeChat }));
        }
    }

    /**
     * @route   GET /api/v1/chats
     * @desc    get all the chats related to the current user
     * @access  Protected
     *
     * @param   {Object} req - Express request object.
     * @param   {Object} res - Express response object.
     *
     * @returns {void}
    */

    static async getAllChats(req, res) {
        const chats = await Chat.aggregate([
            {
                $match: {
                    $or: [
                        {
                            users: {
                                $elemMatch: { $eq: req.user._id }
                            },
                        },
                        {
                            groupAdmins: {
                                $elemMatch: { $eq: req.user._id }
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "users",
                    as: "users"
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "groupAdmins",
                    as: "groupAdmins"
                }
            },
            {
                $lookup: {
                    from: "messages",
                    localField: "latestMessage",
                    foreignField: "_id",
                    as: "latestMessage",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "sender",
                                foreignField: "_id",
                                as: "sender",
                                pipeline: [
                                    {
                                        $project: {
                                            "username": 1,
                                            "firstName": 1,
                                            "lastName": 1,
                                            "avatar": 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $set: {
                                "sender": { $first: "$sender" },
                            }
                        },
                    ]
                }
            },
            {
                $set: {
                    "latestMessage": { $first: "$latestMessage" },
                }
            },
            {
                $lookup: {
                    from: "messages",
                    foreignField: "chat",
                    localField: "_id",
                    as: "messages",
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: { $ne: ["$sender", req.user._id] }
                                    },
                                    {
                                        $expr: {
                                            $not: {
                                                $in: [req.user._id, "$readBy"]
                                            }
                                        }
                                    }
                                ]
                            }
                        },
                    ]
                }
            },
            {
                $addFields: {
                    unReadCount: { $size: "$messages" }
                }
            },
            {
                $project: {
                    "users.password": 0,
                    "groupAdmins.password": 0,
                    "messages": 0
                }
            },
            {
                $sort: {
                    updatedAt: -1
                }
            }
        ]);

        return res.status(200).json(success("Success", 200, { chats }));
    }


    /**
     * @route   POST /api/v1/chats/group
     * @desc    Create the group chat for at least two users
     * @access  Protected
     *
     * @param   {Object} req - Express request object.
     * @param   {Object} res - Express response object.
     *
     * @returns {void}
    */

    static async createGroupChat(req, res) {
        // Joi Schema for input validation
        const schema = Joi.object({
            users: Joi.array()
                .items(
                    Joi.string()
                        .label('User ID')
                        .regex(/^[0-9a-fA-F]{24}$/)
                        .rule({ message: 'Any {{#label}} is Invalid!' })
                )
                .min(1)
                .unique()
                .required(),

            chatName: Joi.string().min(3).max(50).trim().required(),
        });

        // Validate request body with Joi schema
        const { error, value } = schema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 422);
        }

        const checkCurrentUserId = value.users.some((userId) => userId === req.user._id.toString());
        if (checkCurrentUserId) {
            throw new AppError("Duplicate UserId. Current LoggedIn User Id present in users Array", 400);
        }

        for (let i = 0; i < value.users.length; i++) {
            const userId = value.users[i];

            // Check if user already exists in database or not
            let checkId = await User.findOne({ _id: userId });
            if (!checkId) throw new AppError(`"users[${i}]" is not found on database`, 404);
        }

        const groupChat = await Chat.create({
            isGroupChat: true,
            chatName: value.chatName,
            groupAdmins: [req.user._id.toString()],
            users: [...value.users],
        });

        const fullGroupChat = await Chat
            .findOne({ _id: groupChat._id })
            .populate({
                path: "users",
                select: "-password",
            })
            .populate({
                path: "groupAdmins",
                select: "-password",
            })
            .populate({
                path: "latestMessage",
                populate: {
                    path: "sender",
                    select: "username firstName lastName avatar",
                }
            })

        return res.status(200).json(success("Success", 200, { chat: fullGroupChat }));
    }

    /**
     * @route   PUT /api/v1/chats/group/rename
     * @desc    Rename the Group chat name
     * @access  Protected
     *
     * @param   {Object} req - Express request object.
     * @param   {Object} res - Express response object.
     *
     * @returns {void}
     */

    static async renameGroupChat(req, res) {
        // Joi Schema for input validation
        const schema = Joi.object({
            chatId: Joi.string()
                .label('Chat ID')
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .rule({ message: '{{#label}} is Invalid!' }),

            chatName: Joi.string().min(3).max(50).trim().required()
        });

        // Validate request body with Joi schema
        const { error, value } = schema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 422);
        }

        // Check if chat Id already exists in database or not
        let checkId = await Chat.findOne({ _id: value.chatId, isGroupChat: true });
        if (!checkId) throw new AppError("ChatId is Not Valid or Not found on database", 404);

        const updatedChat = await Chat.findByIdAndUpdate(
            value.chatId,
            { chatName: value.chatName },
            { new: true }
        )
            .populate({
                path: "users",
                select: "-password",
            })
            .populate({
                path: "groupAdmins",
                select: "-password",
            })
            .populate({
                path: "latestMessage",
                populate: {
                    path: "sender",
                    select: "username firstName lastName avatar",
                }
            })

        return res.status(200).json(success("Success", 200, { chat: updatedChat }));
    }


    /**
     * @route   PUT /api/v1/chats/group/add-member
     * @desc    Add the user to the group
     * @access  Protected
     *
     * @param   {Object} req - Express request object.
     * @param   {Object} res - Express response object.
     *
     * @returns {void}
    */

    static async addtoGroup(req, res) {
        // Joi Schema for input validation
        const schema = Joi.object({
            chatId: Joi.string()
                .label('Chat ID')
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .rule({ message: '{{#label}} is Invalid!' }),

            userId: Joi.string()
                .label('User ID')
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .rule({ message: '{{#label}} is Invalid!' }),
        });

        // Validate request body with Joi schema
        const { error, value } = schema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 422);
        }

        // Check if chat Id already exists in database or not
        let checkChatId = await Chat.findOne({ _id: value.chatId, isGroupChat: true });
        if (!checkChatId) throw new AppError("chatId is not found on database", 404);

        // Check if user already exists in database or not
        let checkUserId = await User.findOne({ _id: value.userId });
        if (!checkUserId) throw new AppError("userId is not found on database", 404);

        // Check if userId already attached to the chatId
        let checkUserExistOnChat = await Chat.findOne({
            _id: value.chatId,
            isGroupChat: true,
            $or: [
                {
                    users: {
                        $elemMatch: { $eq: value.userId }
                    },
                },
                {
                    groupAdmins: {
                        $elemMatch: { $eq: value.userId }
                    }
                }
            ]
        });
        if (checkUserExistOnChat) throw new AppError("This User Already Added on this group", 404);

        const updatedChat = await Chat.findByIdAndUpdate(
            value.chatId,
            { $push: { users: value.userId } },
            { new: true }
        )
            .populate({
                path: "users",
                select: "-password",
            })
            .populate({
                path: "groupAdmins",
                select: "-password",
            })
            .populate({
                path: "latestMessage",
                populate: {
                    path: "sender",
                    select: "username firstName lastName avatar",
                }
            })

        return res.status(200).json(success("Success", 200, { chat: updatedChat }));
    }


    /**
     * @route   PUT /api/v1/chats/group/users
     * @desc    Update all the users of the group
     * @access  Protected
     *
     * @param   {Object} req - Express request object.
     * @param   {Object} res - Express response object.
     *
     * @returns {void}
     */

    static async updateGroupUsers(req, res) {
        // Joi Schema for input validation
        const schema = Joi.object({
            chatId: Joi.string()
                .label('Chat ID')
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .rule({ message: '{{#label}} is Invalid!' }),

            users: Joi.array()
                .items(
                    Joi.string()
                        .label('User ID')
                        .regex(/^[0-9a-fA-F]{24}$/)
                        .rule({ message: 'Any {{#label}} is Invalid!' })
                )
                .min(1)
                .unique()
                .required(),
        });

        // Validate request body with Joi schema
        const { error, value } = schema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 422);
        }

        // Check if chat Id already exists in database or not
        let checkChatId = await Chat.findOne({ _id: value.chatId, isGroupChat: true });
        if (!checkChatId) throw new AppError("chatId is not found on database", 404);

        if (!checkChatId.groupAdmins.some((user) => user._id.toString() === req.user._id.toString())) {
            throw new AppError("Admin can only update the members of the Group!", 404);
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            value.chatId,
            { $set: { users: value.users } },
            { new: true }
        )
            .populate({
                path: "users",
                select: "-password",
            })
            .populate({
                path: "groupAdmins",
                select: "-password",
            })
            .populate({
                path: "latestMessage",
                populate: {
                    path: "sender",
                    select: "username firstName lastName avatar",
                }
            })

        return res.status(200).json(success("Success", 200, { chat: updatedChat }));
    }


    /**
     * @route   PUT /api/v1/chats/group/admins
     * @desc    Update all the admins of the group
     * @access  Protected
     *
     * @param   {Object} req - Express request object.
     * @param   {Object} res - Express response object.
     *
     * @returns {void}
     */

    static async updateAdminUsers(req, res) {
        // Joi Schema for input validation
        const schema = Joi.object({
            chatId: Joi.string()
                .label('Chat ID')
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .rule({ message: '{{#label}} is Invalid!' }),

            users: Joi.array()
                .items(
                    Joi.string()
                        .label('User ID')
                        .regex(/^[0-9a-fA-F]{24}$/)
                        .rule({ message: 'Any {{#label}} is Invalid!' })
                )
                .min(1)
                .unique()
                .required(),
        });

        // Validate request body with Joi schema
        const { error, value } = schema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 422);
        }

        // Check if chat Id already exists in database or not
        let checkChatId = await Chat.findOne({ _id: value.chatId, isGroupChat: true });
        if (!checkChatId) throw new AppError("chatId is not found on database", 404);

        if (!checkChatId.groupAdmins.some((user) => user._id.toString() === req.user._id.toString())) {
            throw new AppError("Admin can only update the members of the Group!", 404);
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            value.chatId,
            { $set: { users: value.users } },
            { new: true }
        )
            .populate({
                path: "users",
                select: "-password",
            })
            .populate({
                path: "groupAdmins",
                select: "-password",
            })
            .populate({
                path: "latestMessage",
                populate: {
                    path: "sender",
                    select: "username firstName lastName avatar",
                }
            });

        return res.status(200).json(success("Success", 200, { chat: updatedChat }));
    }


    /**
     * @route   PUT /api/v1/chats/group/remove-member
     * @desc    Remove the user from the group
     * @access  Protected
     *
     * @param   {Object} req - Express request object.
     * @param   {Object} res - Express response object.
     *
     * @returns {void}
     */

    static async removeFromGroup(req, res) {
        // Joi Schema for input validation
        const schema = Joi.object({
            chatId: Joi.string()
                .label('Chat ID')
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .rule({ message: '{{#label}} is Invalid!' }),

            userId: Joi.string()
                .label('User ID')
                .required()
                .regex(/^[0-9a-fA-F]{24}$/)
                .rule({ message: '{{#label}} is Invalid!' }),
        });

        // Validate request body with Joi schema
        const { error, value } = schema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 422);
        }

        // Check if user already exists in database or not
        let checkUserId = await User.findOne({ _id: value.userId });
        if (!checkUserId) throw new AppError("userId is not found on database", 404);

        // Check if chat Id already exists in database or not
        let checkChatId = await Chat.findOne({ _id: value.chatId, isGroupChat: true });
        if (!checkChatId) throw new AppError("chatId is not found on database", 404);

        const isLoggedInUserAdmin = checkChatId.groupAdmins.some((user) => user._id.toString() === req.user._id.toString());

        if (!isLoggedInUserAdmin && (value.userId !== req.user._id.toString())) {
            throw new AppError("Admin can only remove the member of the Group!", 400);
        }

        if (
            (isLoggedInUserAdmin) &&
            (checkChatId.groupAdmins.length === 1) &&
            (value.userId === req.user._id.toString())
        ) {
            throw new AppError("Unable to leave the group. As the sole admin, you must first assign another user as an admin before leaving", 400);
        }

        // Check if userId already attached to the chatId
        let checkUserExistOnChat = await Chat.findOne({
            _id: value.chatId,
            isGroupChat: true,
            users: { $elemMatch: { $eq: value.userId } }
        });
        if (!checkUserExistOnChat) throw new AppError("This User Already Added on this group", 404);

        const updatedChat = await Chat.findByIdAndUpdate(
            value.chatId,
            { $pull: { users: value.userId } },
            { new: true }
        )
            .populate({
                path: "users",
                select: "-password",
            })
            .populate({
                path: "groupAdmins",
                select: "-password",
            })
            .populate({
                path: "latestMessage",
                populate: {
                    path: "sender",
                    select: "username firstName lastName avatar",
                }
            })

        return res.status(200).json(success("Success", 200, { chat: updatedChat }));
    }
}

module.exports = ChatController;