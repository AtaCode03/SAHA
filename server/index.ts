import { app } from "./app.js";
import { db } from "./db.js";
import express from "express";
import path from "node:path";
if (process.env.NODE_ENV === "production") {
  if (!process.env.APP_ORIGIN?.startsWith("https://"))
    throw Error("Production APP_ORIGIN HTTPS olmalı.");
  app.use(express.static(path.resolve("dist")));
  app.get("/{*splat}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
}
const server = app.listen(Number(process.env.PORT ?? 3001), "127.0.0.1", () =>
  console.log("Saha API hazır."),
);
async function stop() {
  server.close();
  await db.$disconnect();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
