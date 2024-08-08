import { Box, Typography, IconButton, Menu, MenuItem } from "@mui/material";
import React, { memo, useState, useEffect } from "react";
import { lightBlue } from "../../constants/color";
import moment from "moment";
import { fileFormat } from "../../lib/features";
import RenderAttachment from "./RenderAttachment";
import { motion } from "framer-motion";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";

const MessageComponent = ({ message, user, onEdit, onDelete}) => {
  const { sender, content, attachments = [], createdAt, updatedAt, status, isDeleted } = message;

  const sameSender = sender?._id === user?._id;
  const timeAgo = moment(createdAt).fromNow();
  const updatedAgo = moment(updatedAt).fromNow();
  const [anchorEl, setAnchorEl] = useState(null);

  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit(message);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete(message._id);
    handleMenuClose();
  };

  // Determine the status ticks
  const getStatusTicks = () => {
    if (status === "read" ) {
      return "✔️✔️✔️";
    } else if (status === "delivered" ) {
      return "✔️✔️";
    } else {
      return  "✔️" 
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: sameSender ? "100%" : "-100%" }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        alignSelf: sameSender ? "flex-end" : "flex-start",
        backgroundColor: message.isDeleted ? "gray" : "white",
        color: "black",
        borderRadius: "10px",
        padding: ".3rem 2rem",
        width: "fit-content",
        position: "relative",
      }}
    >
      {!sameSender && (
        <Typography color={lightBlue} fontWeight={"600"} variant="caption">
          {sender.name}
        </Typography> 
      )}

      {content && <Typography>{content}</Typography>}

      {attachments.length > 0 &&
        attachments.map((attachment, index) => {
          const url = attachment.url;
          const file = fileFormat(url);

          return (
            <Box key={index}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download
                style={{ color: "black" }}
              >
                {RenderAttachment(file, url)}
              </a>
            </Box>
          );
        })}
      {!message.isDeleted &&  (
        <Typography variant="caption" color={"text.secondary"}>
          {timeAgo}
        </Typography>
      )}
      {sameSender && !message.isDeleted && (
        <Box
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color={"text.secondary"}>
            {getStatusTicks()}
          </Typography>

          <IconButton size="small" onClick={handleMenuOpen}>
            <EditIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleEdit}>Edit</MenuItem>
            <MenuItem onClick={handleDelete}>Delete</MenuItem>
          </Menu>
        </Box>
      )}
    </motion.div>
  );
};

export default memo(MessageComponent);
