import { createParamDecorator } from "@nestjs/common";
import { User } from "./user.entity";


export const GetUser = createParamDecorator(
    (data, ctx): User=>{
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        return data ? user?.[data] : user; 
    }
)