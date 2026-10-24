import { Router } from "express";
import { validate } from "../../utils/validation-middleware";
import { find } from "./requests.controller";
import { requestIdDTO } from "./requests.dto";

const router = Router();

router.get("/:requestId", validate(requestIdDTO, "params"), find);

export default router;
