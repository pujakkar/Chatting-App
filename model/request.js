const {Schema,model,Types}=require('mongoose')

const schema=new Schema({
    status:{
        type:String,
        default:'pending',
        enum:['pending','accepted','rejected'],
    },
    sender:{
        type:Types.ObjectId,
        ref:'User',
        required:true,
    },
    reciever:{
        type:Types.ObjectId,
        ref:'User',
        required:true,
    },

},{
    timestamps:true,
});

const Request=model('request',schema);

module.exports={Request}