const asyncHandler = (requestHandeler) =>{
    return (req,res,next)=>{
        Promise.resolve(requestHandeler(req,res,next)).
        catch((err) => next(err))
    }
}

export default asyncHandler


// function passed as an argument
/*
const asyncHandler = (func) => async(req,res,next)=> {
    try {
        await func(req,res,next)
    } catch (error) {
        res.status(err.code || 500).json({
            success:false,
            message:err.message
        })
    }
} 
*/    