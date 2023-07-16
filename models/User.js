const Joi = require('joi');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    isVerified: {
        type: Number,
        required: true,
        default: 0,
    },
    avatar: { 
        type: String ,
        required: true
    }
}, {
    timestamps: true,
    collection: "users"
});

userSchema.methods.generateAuthToken = async function () {
    const token = jwt.sign(
        {
            _id: this._id,
            username: this.username,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            isVerified: this.isVerified,
            avatar: this.avatar,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '5d' }
    );
    return token;
}

const User = mongoose.model('User', userSchema);

function validate(user) {
    let userSchema = {
        username: Joi.string().alphanum().min(4).max(25).required(),
        firstName: Joi.string().min(3).required().label("First Name"),
        lastName: Joi.string().min(3).required().label("Last Name"),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(1024).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
          'any.only': 'Passwords do not match',
        }),
    };

    const schema = Joi.object(userSchema);
    
    return schema.validate(user, {
        presence: "required"
    });
}

module.exports = {
    User,
    validate
}