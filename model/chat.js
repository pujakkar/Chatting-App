const {Schema,model,Types}=require('mongoose')

const schema=new Schema({
    name:{
        type:String,
        required:true,
    },
    groupChat:{
        type:Boolean,
        required:true,
    },
    creator:{
        type:Types.ObjectId,
        ref:'User',
    },
    members:[{
        type:Types.ObjectId,
        ref:'User',
        required:true,
    }],

},{
    timestamps:true,
});

const Chat=model('Chat',schema);
module.exports={Chat}