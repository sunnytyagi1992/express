import express from 'express';
const app = express();

app.get("/", (res) => res.send("Express on Vercel"));

app.listen(3005, () => console.log("Server ready on port 3000."));

module.exports = app;