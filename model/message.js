const {Schema,model,Types}=require('mongoose')

const schema=new Schema({
    content:{
        type:String,
    },
    attachments:[{
        public_id:{
            type:String,
        },
        url:{
            type:String,
        },
    }],
    sender:{
        type:Types.ObjectId,
        ref:'User',
        required:true,
    },
    chat:{
        type:Types.ObjectId,
        ref:'Chat',
        required:true,
    },

},{
    timestamps:true,
});

const Message=model('message',schema);
module.exports={Message}