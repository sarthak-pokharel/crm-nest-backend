import { Injectable } from "@nestjs/common";


@Injectable()
export class AuthService {
    getStatus() {
        return { status: 'Auth service is running' };
    }
}