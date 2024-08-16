import asyncHandler from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinaryService.js";

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

export { registerUser }