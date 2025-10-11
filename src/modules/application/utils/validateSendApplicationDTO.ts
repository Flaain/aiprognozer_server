import { BadRequestException } from "@nestjs/common";
import { SendApplicationDTO } from "../types";

export const validateSendAppliactionDTO = (dto: SendApplicationDTO): SendApplicationDTO => {
    if (!dto) throw new BadRequestException('Missing application details');

    const onewin_id = Number(dto.onewin_id);

    if (!onewin_id) throw new BadRequestException('Missing 1win id');

    if (isNaN(onewin_id)) throw new BadRequestException('1win id must be a number');

    return { onewin_id };
}