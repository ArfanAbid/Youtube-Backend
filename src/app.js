import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// Cors settings
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
}));

app.use(express.json({limit:"16kb"})); // For parsing application/json
app.use(express.urlencoded({extended:true,limit:"16kb"})); // For parsing application/x-www-form-urlencoded
app.use(express.static("public")); // For serving static files
app.use(cookieParser()); // For parsing cookies


// routes import 
import userRouter from "./routes/user.routes.js";


// routes declaration
app.use("/api/v1/users",userRouter);

export {app}



// (error,req,res,next)
