const jwt=require('jsonwebtoken')
const secret="Pujak@12345"

function gentoken(user){
    const payload={
        _id:user._id,
        fullName:user.fullName,
        email:user.email,
        avatar:user.avatar.url,
        userName:user.userName
    }
    const token=jwt.sign(payload,secret)
    return token
}

function validateToken(token){
    if(!token) return null;
    return jwt.verify(token,secret)
}

module.exports={gentoken,validateToken}