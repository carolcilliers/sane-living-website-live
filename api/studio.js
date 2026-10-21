"use strict";
const login = require("./_dashlib"),
  service = require("./_studio/service");
module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "POST"].includes(req.method))
    return res.status(405).json({ error: "Method not allowed" });
  if (!login.requireLogin(req, res)) return;
  if (!process.env.CMS_GITHUB_TOKEN)
    return res
      .status(503)
      .json({
        error:
          "Website publishing is not configured (CMS_GITHUB_TOKEN missing).",
      });
  if (req.method === "POST" && req.headers.origin) {
    try {
      const origin = new URL(req.headers.origin);
      if (origin.host !== req.headers.host)
        return res
          .status(403)
          .json({ error: "Publish from the dashboard on this website." });
    } catch {
      return res.status(400).json({ error: "Invalid request origin." });
    }
  }
  try {
    return res
      .status(200)
      .json(
        req.method === "GET"
          ? await service.bootstrap()
          : await service.publish(login.readJsonBody(req)),
      );
  } catch (e) {
    return res
      .status(e.status || 500)
      .json({
        error:
          e.message || "The operation failed. Your private draft is retained.",
      });
  }
};
