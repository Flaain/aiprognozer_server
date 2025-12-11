import { UseGuards } from "@nestjs/common";
import { LimitGuard } from "../guards/auth.limit.guard";

export const Limit = () => UseGuards(LimitGuard);