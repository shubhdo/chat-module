var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userschema = new Schema({

	
	userName: {
		type: String
	},

	userId : {
		type: String
	}, 
    deviceType:{
        type:String
    },
	deviceToken : {
		type : String,
		default : null
	},
	profilePic:{
		type:String,

	},
	createdAt:{
		type:Date,
		default:Date.now()
	}
});

var chatUsers = mongoose.model('chatUsers', userschema);

module.exports = chatUsers;
