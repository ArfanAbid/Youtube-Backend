import { Router } from "express";
import { 
    LoginUser,
    LogoutUser,
    refreshAccessToken,
    registerUser,
    changeCurrentPassword,
    updateUserAvatar,getCurrentUser,
    updateAccountDetails,
    updateUserCoverImage
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
router.route("/update-info").post(verifyJWT,updateAccountDetails);
router.route("/update-avatar").post(
    verifyJWT,
    upload.single({name:"avatar"}),
    updateUserAvatar
)
router.route("/update-coverImage").post(
    verifyJWT,
    upload.single({name:"coverImage"}),
    updateUserCoverImage
)

export default router;