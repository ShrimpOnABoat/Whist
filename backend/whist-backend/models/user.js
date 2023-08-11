const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    hashedPassword: {
        type: String,
        required: true
    }
});

UserSchema.methods.comparePassword = function(password, callback) {
    bcrypt.compare(password, this.hashedPassword, callback);
};

module.exports = mongoose.model('User', UserSchema);
