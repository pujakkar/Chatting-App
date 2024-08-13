const {Schema,model}=require('mongoose')
const {randomBytes,createHmac} =require('crypto')
const {gentoken,validateToken}=require('../services/auth')

const schema=new Schema({
    fullName:{
        type:String,
        required:true,
    },
    userName:{
        type:String,
        required:true,
        unique:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    avatar:{
        public_id:{
            type:String,
            required:true,
        },
        url:{
            type:String,
            required:true,
        },
    },
    password:{
        type:String,
        required:true,
    },
    bio:{
        type:String,
    },
    salt:{
        type:String,
    },

},{
    timestamps:true,
});

schema.pre('save',function(next){
    const user=this
    if(!user.isModified('password')) return next()
    const salt=randomBytes(16).toString('hex')
    const hashedPass=createHmac("sha256",salt).update(user.password).digest("hex")
    this.password=hashedPass
    this.salt=salt
    next()

})

schema.static('matchPassAndGenToken',async function(email,password){
    const user=await this.findOne({email})
    const salt=user.salt
    const hashedPass=user.password
    const providedPass=createHmac('sha256',salt).update(password).digest('hex')
    if(providedPass!==hashedPass){
        throw new Error('incorrect password')
    }
    const token=gentoken(user)
    return token
})

const User=model('User',schema);

module.exports={User}
