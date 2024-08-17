import asyncHandler from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinaryService.js";
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





export { 
    registerUser,
    LoginUser,
    LogoutUser,
    refreshAccessToken

}