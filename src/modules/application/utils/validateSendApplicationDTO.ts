import { BadRequestException } from "@nestjs/common";
import { SendApplicationDTO } from "../types";
import { MAX_1WIN_NAME_LENGTH, MIN_1WIN_NAME_LENGTH } from "../constants";

export const validateSendAppliactionDTO = (dto: SendApplicationDTO): SendApplicationDTO => {
    if (!dto) throw new BadRequestException('Missing application details');

    const one_win_name = dto.one_win_name?.trim();

    if (!one_win_name) throw new BadRequestException('Missing 1win name');

    if (typeof one_win_name !== 'string') throw new BadRequestException('1win name must be a string');

    if (one_win_name.length < MIN_1WIN_NAME_LENGTH) throw new BadRequestException(`1win name must be at least ${MIN_1WIN_NAME_LENGTH} characters long`);

    if (one_win_name.length > MAX_1WIN_NAME_LENGTH) throw new BadRequestException(`1win name must be at most ${MAX_1WIN_NAME_LENGTH} characters long`);

    return { one_win_name };
}