import asyncHandler from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary, deleteOnCloudinary} from "../utils/cloudinaryService.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user= await User.findById(userId);
        const accessToken= user.generateAccessToken();
        const refreshToken= user.generateRefreshToken();

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}


// User registration API Controller

const registerUser = asyncHandler(async (req, res) => {
    const { username,fullName, email, password } = req.body;
    if([username,fullName, email, password].some((field)=> field?.trim() === "")){
        throw new ApiError(400, "Please fill all the fields");
    }

    const existingUser =await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    // console.log(req.files)

    const avatarLocalPath = req.files?.avatar?.[0]?.path; // req.file frovided by multer middleware
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Please upload avatar image");
    }
    if(!coverImageLocalPath){
        throw new ApiError(400, "Please upload coverImage image");
    }

    // let coverImageLocalPath;
    // if (req.files && Array.isArray(req.files.coverImage) && req.files.length > 0) {
    //     coverImageLocalPath = req.files.coverImage[0].path;
    // }else{
    //     throw new ApiError(400, "Please upload coverImage image");
    // }
    

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    const user =await User.create({
        username:username.toLowerCase(),
        fullName,
        email,
        password,
        avatar:avatar.url,
        coverImage:coverImage.url,
        // coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500, "Something went wrong with registration");
    }

    return res.status(201).json(new ApiResponse(200,createdUser,"User created successfully"));


});




// User Login API Controller

const LoginUser=asyncHandler(async(req,res)=>{
    const {username,email,password}=req.body;

    if(!(username || email)){
        throw new ApiError(400, "Please provide username or email");
    }

    const user=await User.findOne({$or:[{username},{email}]});
    if(!user){
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordCorrect=await user.isPasswordCorrect(password);
    if(!isPasswordCorrect){
        throw new ApiError(401, "Incorrect password");
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);

    // uptill now 'user' doesn't have refresh token cauz we used 'user' before calling generateAccessAndRefreshToken method ans also we update user with refersh Tolken entry in that method so :

    const LoggedInUser=await User.findById(user._id).select("-password -refreshToken"); // this will get latest with having refreh token entry 

    const options={
        httpOnly:true, // cookies can only be modified using server side scripts
        secure:true,
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{
        user:LoggedInUser,accessToken,refreshToken
    },
    "User logged in successfully"));

 
});


// User Logout API Controller

const LogoutUser=asyncHandler(async(req,res)=>{
    // req.user is done through the middleware auth.middleware.js called in logout route
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true, // cookies can only be modified using server side scripts
        secure:true,
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,null,"User logged out successfully"));
});


// User Refresh Token API Controller

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incommingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if(!incommingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken=jwt.verify(incommingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        
        const user=await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401, "Invalid RefreshToken");
        }
    
        if(incommingRefreshToken!== user.refreshToken){
            throw new ApiError(401, "RefreshToken is expired or Used");
        }
    
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id);
        
        const options={
            httpOnly:true, // cookies can only be modified using server side scripts
            secure:true,
        }
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new ApiResponse(
            200,
            {accessToken,refreshToken:newRefreshToken},
            "Access Token refreshed successfully"
        ));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid RefreshToken");
    }

});


// User Change Password API Controller

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body;
    
    const user=await User.findById(req.user?._id);

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(401, "Old password is incorrect");
    }

    user.password=newPassword;
    await user.save({validateBeforeSave:false});

    return res.status(200).json(new ApiResponse(200,null,"Password changed successfully"));
});


// User Get Current User API Controller


const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"Current user fetched successfully"));
});


// User Update Account Details API Controller

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,username,email}=req.body;
    if(!fullName || !username || !email){
        throw new ApiError(400, "Please provide all fields");
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                username:username,
                email
            }
        },
        {
            new:true,
        }
    ).select("-password");

    return res.status(200).json(new ApiResponse(200,user,"Account details updated successfully"));
});


// User Update Avatar API Controller

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Please provide avatar");
    }
    const user=await User.findById(req.user?._id).select("-password");
    if(!user){
        throw new ApiError(404, "User not found");
    }
    // delete old image from cloudinary
    if(user.avatar){
        const oldPublicId=user.avatar.split('/').pop().split('.')[0]; // Extract public ID from URL
        deleteOnCloudinary(oldPublicId);
    }
    // upload new image on cloudinary
    const avatar=uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400, "Unable to upload avatar");
    }

    user.avatar=avatar.url;
    await user.save({validateBeforeSave:false});
    
    /* this can be done if i don't want to delete file and just update it
    
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true,
        }
    ).select("-password");
    */
    return res.status(200).json(new ApiResponse(200,user,"User Avatar Image updated successfully"));
});


// User Update Cover Image API Controller

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "Please provide Cover Image");
    }

    const user=await User.findById(req.user?._id).select("-password");
    if(!user){
        throw new ApiError(404, "User not found");
    }
    // delete old image from cloudinary
    if(user.coverImage){
        const oldPublicId=user.coverImage.split('/').pop().split('.')[0]; // Extract public ID from URL
        deleteOnCloudinary(oldPublicId);
    }
    // upload new image on cloudinary
    const coverImage=uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400, "Unable to upload coverImage");
    }

    user.coverImage=coverImage.url;
    await user.save({validateBeforeSave:false});

    return res.status(200).json(new ApiResponse(200,user,"User coverImage  updated successfully"));
});


// User Get Channel Profile API Controller

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params;
    if(!username?.trim()){
        throw new ApiError(400, "Please provide username");
    }
    const channel=User.aggregate([
        { // Find user
            $match:{
                username:username.toLowerCase()
            }
        },
        { // Find subscribers i.e my subscribers
            $lookup:{
                from:"subscriptions", // from which collection it is written in lower case
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        { // Find subscribedTo i.e the channels i subscribed to 
            $lookup:{
                from:"subscriptions", // from which collection it is written in lower case
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        { // Add count of subscribers and subscribedTo
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                subscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        { // return only required fields response
            $project:{
                fullName:1,
                username:1,
                avatar:1,
                coverImage:1,
                subscribersCount:1,
                subscribedToCount:1,
                isSubscribed:1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404, "Channel does not found");
    }
    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"Channel profile fetched successfully"));
});


const getWatcjHistory=asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        { // actually ._id gives us string and in mongoos builtin it convert it to ObjectId similarlt in aggration pipelines mongoos is not here to convert it to objectId so we use 
            $match:{
                _id:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    { // now we are at the video level now look for owner of the video with user model
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerData",
                            pipeline:[ // now we get all the data of owner mean all entities in user model
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    { // for easyness of assessing the data we add fields
                        $addFields:{
                            owner:{
                                // $arrayElemAt:["$ownerData",0]
                                $first:"$ownerData"
                            }
                        }
                    }
                ]
            }
        },

    ])

    return res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfully"));
});

export { 
    registerUser,
    LoginUser,
    LogoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatcjHistory,
    
}