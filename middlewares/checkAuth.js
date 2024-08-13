const { validateToken } = require("../services/auth");


function checkAuth(cookieName){
    return(req,res,next)=>{
        const cookieVal=req.cookies[cookieName]
        if(!cookieVal) return next();

        try {
            const userPayload=validateToken(cookieVal)
            req.user=userPayload
        } catch (error) {
        }
        return next()

    }
}

module.exports={checkAuth}