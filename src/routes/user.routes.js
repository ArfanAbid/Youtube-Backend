import { Router } from "express";
import { 
    LoginUser,
    LogoutUser,
    refreshAccessToken,
    registerUser,
    changeCurrentPassword,
    updateUserAvatar,getCurrentUser,
    updateAccountDetails,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatcjHistory,
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router=Router();

router.route("/register").post(
    upload.fields([
        {name:"avatar",maxCount:1},
        {name:"coverImage",maxCount:1}
    ]),
    registerUser)
router.route("/login").post(
    LoginUser
)

// secure routes
router.route("/logout").post(verifyJWT,LogoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT,changeCurrentPassword);
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/update-info").patch(verifyJWT,updateAccountDetails);
router.route("/update-avatar").patch(
    verifyJWT,
    upload.single({name:"avatar"}),
    updateUserAvatar
)
router.route("/update-coverImage").patch(
    verifyJWT,
    upload.single({name:"coverImage"}),
    updateUserCoverImage
)
router.route("/c/:username").get(verifyJWT,getUserChannelProfile);
router.route("/watch-history").get(verifyJWT,getWatcjHistory);
export default router;