import express from "express";
import { connectDB } from "./utils/features.js";
import dotenv from "dotenv";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  MESSAGE_DELIVERED,
  MESSAGE_READ,
  MESSAGE_EDITED,
  MESSAGE_DELETED,
  STOP_TYPING,
} from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import { mongoose } from "mongoose";
import userRoute from "./routes/user.js";
import chatRoute from "./routes/chat.js";
import adminRoute from "./routes/admin.js";

dotenv.config({
  path: "./.env",
});

const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const adminSecretKey = process.env.ADMIN_SECRET_KEY || "adsasdsdfsdfsdfd";
const userSocketIDs = new Map();
const onlineUsers = new Set();

connectDB(mongoURI);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

// Using Middlewares Here
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.get("/", (req, res) => {
  res.send("Hello server!");
});

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});

io.on("connection", (socket) => {
  const user = socket.user;
  userSocketIDs.set(user._id.toString(), socket.id);

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await Message.create(messageForDB);
    } catch (error) {
      throw new Error(error);
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(MESSAGE_DELIVERED, async (messageId) => {
    try {
      await Message.findByIdAndUpdate(messageId, { status: 'delivered' });
      io.emit(MESSAGE_DELIVERED, { messageId, status: 'delivered' });
    } catch (error) {
      console.error(error);
    }
  });

  socket.on(MESSAGE_READ, async (messageId) => {
    try {
      await Message.findByIdAndUpdate(messageId, { status: 'read' });
      io.emit(MESSAGE_READ, { messageId, status: 'read' });
    } catch (error) {
      console.error(error);
    }
  });

  socket.on(MESSAGE_EDITED, async ({ messageId, newContent , members }) => {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      console.error(`Invalid message ID format form edit: ${messageId}`);
      return;
    }
    
    try {
      const message = await Message.findById(messageId);
      if (message) {
        message.content = newContent;

        await message.save();
        const membersSockets = getSockets(members); 
        io.to(membersSockets).emit(MESSAGE_EDITED, { messageId, newContent: message.content });
      }
    } catch (error) {
      console.error(error);
    }
  });

  socket.on(MESSAGE_DELETED, async ({ messageId, chatId, members }) => {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      console.error(`Invalid message ID format from delete: ${messageId}`);
      return;
    }

    try {
      const message = await Message.findById(messageId);
      if (message) {
        message.isDeleted = true;
        message.attachments = []
        message.content = "this message was deleted";
        await message.save();
        const membersSockets = getSockets(members);  
        io.to(membersSockets).emit(MESSAGE_DELETED, { messageId, chatId, members });
      } else {
        console.error("Message not found");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  });
});

app.use(errorMiddleware);

server.listen(port, () => {
  console.log(`Server is running on port ${port} in ${envMode} Mode`);
});

export { envMode, adminSecretKey, userSocketIDs };
