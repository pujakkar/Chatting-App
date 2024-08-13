const {Mongoose, default: mongoose} =require('mongoose')
const {v2:cloudinary}=require('cloudinary')
const {v4: uuid} =require('uuid')
const {userToSocketIds}=require('./socketMap')
const { REFETCH_CHATS, NEW_REQUEST, NEW_MESSAGE } = require('../events/event')

const connectDb=(uri)=>{
    mongoose.connect(uri,{dbName:'ChatApp'}).then(()=>console.log('db conncted'))
}

const getbase64=(file)=> `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
const uploadToCloudinary= async(files=[])=>{
    const uploadPromises=files.map((file)=>{ 
        return new Promise((resolve,reject)=>{
            cloudinary.uploader.upload(getbase64(file),{
                resource_type:'auto',
                public_id:uuid(),
            },
            (error,result)=>{
                if(error){
                    console.log(error)
                    return reject(error)
                }
                resolve(result)
            }
            )
        }
        )
    })
    try {
        const result=await Promise.all(uploadPromises)
        const formattedResult=result.map((res)=>({
            public_id:res.public_id,
            url:res.secure_url
        }))

        return formattedResult
    } catch (error) {
        console.log(error)
        throw new Error('uploading failed',error)
    }
}

const emitEvents=(req,event,users=[],data)=>{

    const io=req.app.get('io')
    // if(event===NEW_MESSAGE){
    //     console.log('refetching new message',data)
    //     console.log('usersss',users)
    // }
    //console.log(users)
    // if(event===NEW_REQUEST){
    //     console.log(users)
    // }
    const userSockets=users.map((user)=>(userToSocketIds.get(user.toString())))
// console.log('usersockets',userSockets)
    io.to(userSockets).emit(event,data)
    // console.log(userSockets)

}


module.exports={connectDb,uploadToCloudinary,emitEvents}