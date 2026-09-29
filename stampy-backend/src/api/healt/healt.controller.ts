import { Response, NextFunction } from "express";
import { TypedRequest } from "../../utils/typed-request";
import { pool } from "../../db";

export const healt = async (req: TypedRequest, res: Response, next: NextFunction) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "up" });
  } catch (err) {
    console.log("Healt check DB fallito", err);
    res.status(503).json({ status: "error", db: "down" });
  }
};
