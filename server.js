const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public")); // Serves static files from "public" folder
// could go to shit

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
