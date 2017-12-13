var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
var chatSchema = new Schema({

	
	senderId: {
		type: String
	},
	senderName:{type:String},
    receiverId: {type:String},
    roomId: {type:String},

    messageType:{
    	type:String
    },
    mediaType: {
        	type:String
        },
    media: {
        type:String
    },

	message:{
		type: String
	},

	time:{
		type: Date,
		default:Date.now
	},
    status: {
        type: String,
        default: 'SENT'
    },
    hidden:{
        type:[String]
    }
});
chatSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('chatHistory', chatSchema);