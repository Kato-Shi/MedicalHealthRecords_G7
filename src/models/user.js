"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcryptjs");
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // define association here
        }
        async validatePassword(password) {
            return bcrypt.compare(password, this.password);
        }
        toJSON() {
            const values = { ...this.get() };
            delete values.password;
            return values;
        }   
    }
    User.init(
        {
            username: {
                type: DataTypes.STRING,
                allowNull: false,
                unique:{
                    msg: 'Username already exists.'
                },
                validate: {
                    len: {
                        args: [3, 50],
                        msg: "Username must be between 3 and 50 characters.",
                    },
                },
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique:{
                    msg: 'Email already exists.'
                },
                validate: {
                    isEmail: {
                        msg: "Must be a valid email address.",
                    },
                },
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: {
                        args: [6, 100],
                        msg: "Password must be at least 6 characters long.",
                    },
                },
            },
            role: {
                type: DataTypes.ENUM("admin", "manager", "staff"),
                allowNull: false,
                defaultValue: "staff",
                validate: {
                    isIn: {
                        args: [["admin", "manager", "staff"]],
                        msg: "Role must be either admin, manager, or staff.",
                    },
                },
            },
        },
        {
        sequelize,
        modelName: "User",
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
    },
);
    return User;
};