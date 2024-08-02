const express = require("express");
const { google } = require("googleapis");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
const port = 4000;
app.use(cors());
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

app.use(express.json());

const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client,
});

app.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.force-ssl"],
  });
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  console.log("Authorization code:", code);
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Tokens:", tokens);
    oauth2Client.setCredentials(tokens);
    res.redirect(`http://localhost:3000?token=${tokens.access_token}`);
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.status(500).send("Error during authentication");
  }
});

app.get("/activities", async (req, res) => {
  const response = await youtube.activities.list({
    part: "snippet,contentDetails",
    mine: true,
  });
  res.json(response.data);
});

app.post("/comments", async (req, res) => {
  const { videoId, text } = req.body;
  const response = await youtube.commentThreads.insert({
    part: "snippet",
    resource: {
      snippet: {
        videoId,
        topLevelComment: {
          snippet: {
            textOriginal: text,
          },
        },
      },
    },
  });
  res.json(response.data);
});

app.delete("/comments/:commentId", async (req, res) => {
  const { commentId } = req.params;
  try {
    await youtube.comments.delete({
      id: commentId,
    });
    res.status(200).send("Comment deleted successfully");
  } catch (error) {
    res.status(500).send("Error deleting comment");
  }
});

app.post("/comments/reply", async (req, res) => {
  const { commentId, text } = req.body;
  try {
    const response = await youtube.comments.insert({
      part: "snippet",
      resource: {
        snippet: {
          parentId: commentId,
          textOriginal: text,
        },
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).send("Error replying to comment");
  }
});

app.get("/comments", async (req, res) => {
  const { videoId } = req.query;
  try {
    const response = await youtube.commentThreads.list({
      part: "snippet,replies",
      videoId: videoId,
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).send("Error listing comments");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
