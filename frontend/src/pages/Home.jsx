import React from "react";
import AppLayout from "../components/layout/AppLayout";
import { Box, Typography } from "@mui/material";

const Home = () => {
  return (
    <Box
      sx={{
        textAlign: "center",
        height:"90vh",
        background: `url('https://img.freepik.com/free-vector/chat-concept-illustration_114360-129.jpg?t=st=1722962104~exp=1722965704~hmac=c4b62d12a24cc14cd02a17476ad34f4ed4ee13c2db3e610d4b5ede6982bb760b&w=740') no-repeat center`, 
      }}
    >
      <Box
      >
        <Typography p={"2rem"} variant="h5" >
          Select a friend to chat
        </Typography>
      </Box>
    </Box>
  );
};

export default AppLayout()(Home);

