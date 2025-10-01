const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const process= require("process");

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config= require(__dirname + "/../config/database.js")[env];
const db = {};
//sequelize initialization
//create sequelize instance depending on config
let sequelize;
if (config.use_env_variable) {
    //use environment variable
    sequelize= new Sequelize(process.env[config.use_env_variable], config);
} else {
    sequelize = new Sequelize(
        config.database, 
        config.username, 
        config.password, 
        config,
    );
}

// model loader
//read all files in the current directory and import them as Sequelize models
fs.readdirSync(__dirname)
    .filter((file) => {
        return (
            file.indexOf(".") !== 0 &&
         file !== basename && 
         file.slice(-3) === ".js" &&
        file.indexOf(".test.js") === -1
    );
    })

    .forEach((file) => {
        //import the model definition function
        const model= require(path.join(__dirname, file))(
            sequelize,
             Sequelize.DataTypes,
            );
       db[model.name]= model;
    });

    //associations
    //if a model has defined associations, call the associate method
    //example: User.hasMany(Post), post.belongsTo(User)
Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

//exports
//attach the Sequelize instance and class to the db object
db.sequelize= sequelize;
db.Sequelize= Sequelize;
//export the db object (used in app.js andd controllers )
module.exports= db;