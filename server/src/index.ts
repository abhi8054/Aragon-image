import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./env";
import { imagesRouter } from "./routes/images";

const app = express();

app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/images", imagesRouter);

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err?.message === "UNSUPPORTED_FILE_TYPE") {
      return res.status(415).json({ error: "Only JPEG, PNG, and HEIC files are supported" });
    }
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File is too large" });
    }
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Invalid request", details: err.issues });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
