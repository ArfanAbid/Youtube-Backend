import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'; // A library for interacting with the file system in nodejs

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary = async (file) => {
    try {
        if(!file) return null;
        // upload file on cloudinary
        const response= cloudinary.uploader.upload(file,{
            resource_type: "auto",
        })
        // File has been uploaded Successfully
        console.log("File has been uploaded Successfully on Cloudinary", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(file);// remove the locally saved temporary file as the upload failed
        return null;
    }
}


export {uploadOnCloudinary}