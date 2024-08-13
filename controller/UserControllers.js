const { Chat } = require('../model/chat')
const { Request } = require('../model/request')
const {User}=require('../model/user')
const {uploadToCloudinary}=require('../utils/features')
const {emitEvents}=require('../utils/features')
const { NEW_REQUEST, REFETCH_CHATS, NEW_REQUEST_ACCEPTED } = require('../events/event')


const handleLogin=async (req,res)=>{
    const {email,password,fullName}=req.body
    if(!email || !password || !fullName){
        return res.json({message:'all fields are required'})
    }
    try {
        const token=await User.matchPassAndGenToken(email,password)
        return res.cookie('token',token).json({message:'loggedin'})
    } catch (error) {
        return res.json({message:'invalid email or password',error})
    }
}
const handleSignUp=async (req,res)=>{
    const {fullName,userName,email,password}=req.body

    const avatar=req.file

    const result=await uploadToCloudinary([avatar])

    const userAvatar={
        public_id:result[0].public_id,
        url:result[0].url,
    }
    if(!fullName || !userName || !email || !password){
        throw new Error('all fields are required')
    }
    const user=await User.findOne({email})
    if (user){
        return res.json({message:'user already exists'})
    }
    try {
        await User.create({
            fullName,
            userName,
            email,
            password,
            avatar:userAvatar,
        })
        return res.json({message:'user created'})
    } catch (error) {
        return res.json({message:'server error',error:error.message})
    }
}
const getMyProfile=(req,res)=>{
    const user=req.user
    if(!user) return res.json({message:'please login'})
// console.log(user)

    const alluser=[]
    alluser.push(user)

    
    return res.json({message:'Welcome',user})
}

const logout=(req,res)=>{
    return res.clearCookie('token').json({message:'logged out'})
}

const searchUser=async (req,res)=>{
    const {name=""}=req.query

    const chats=await Chat.find({groupChat:false,members:req.user})

    const myFriends=chats.map((chat)=>chat.members).flat()
    myFriends.push(req.user._id)

    const allUsersExceptMeMyFriends=await User.find({
        _id:{$nin: myFriends},
        fullName:{$regex:name,$options: 'i'},
    })

    const users=allUsersExceptMeMyFriends.map(({_id,fullName,avatar,groupChat})=>({
        _id,
        fullName,
        avatar:avatar.url,
    }))
    // console.log(users)
    

    return res.json({users})

}

const getMyFriends=async(req,res)=>{
    const chats=await Chat.find({groupChat:false,members:req.user})

    const myFriends=chats.map((chat)=>chat.members).flat()
    const users=await User.find({
        _id:{$in:myFriends},
    })
    // console.log(req.user._id)
    // console.log(users)
    const usersExceptMe=users.filter(({_id})=>(!_id.equals(req.user._id)))
    // console.log(usersExceptMe)
    const transformedChats=usersExceptMe.map(({_id,fullName,avatar})=>({
        _id,
        fullName,
        avatar:avatar.url,
    }))
//console.log(transformedChats)
    return res.json({transformedChats})
}

const sendRequest=async (req,res)=>{
    const {userId}=req.body

    const request=await Request.findOne({
        $or:[
            {sender:req.user,reciever:userId},
            {sender:userId,reciever:req.user},
        ]
    })

    if(request){
        return res.status(400).json({message:'request aready sent'})
    }

    const sendReq=await Request.create({
        sender:req.user._id,
        reciever:userId,
    })
    console.log(userId)

    emitEvents(req,NEW_REQUEST,[userId])

    return res.json({message:'request sent successfully',userId})
}

const acceptRequest=async (req,res)=>{
    const {requestId,accept}=req.body

    const request=await Request.findById(requestId).populate('sender','fullName').populate('reciever','fullName')
    const reciever=[request.reciever._id]

    if(!request){
        return res.json({message:'request not found'})
    }

    if(!accept){
        await request.deleteOne({_id:requestId})
        return res.json({message:'request removed'})
    }

    const members=[request.sender._id,request.reciever._id]

    await Promise.all([
        Chat.create({
            name:request.sender.fullName,
            groupChat:false,
            members,
        }),
        request.deleteOne()
    ])

    emitEvents(req,REFETCH_CHATS,members)
    emitEvents(req,NEW_REQUEST_ACCEPTED,reciever)

    return res.json({message:'req accepted'})
}

const getMyNotifications=async (req,res)=>{
    const requests=await Request.find({reciever:req.user._id}).populate('sender','fullName avatar')

    const allRequest=requests.map(({_id,sender})=>({
        _id,
        sender:{
            _id:sender._id,
            fullName:sender.fullName,
            avatar:sender.avatar.url
        }
    }))
    console.log(allRequest)

    return res.json({message:'all reqs',allRequest})
}
module.exports={handleLogin,handleSignUp,getMyProfile,logout,searchUser,sendRequest,acceptRequest,getMyNotifications,getMyFriends}