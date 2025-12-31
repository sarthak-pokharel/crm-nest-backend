import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailerService.name);

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST'),
            port: this.configService.get<number>('SMTP_PORT', 587),
            secure: this.configService.get<number>('SMTP_PORT') === 465,
            auth: {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
        });
    }

    async send(to: string, subject: string, html: string) {
        const from = this.configService.get<string>('SMTP_FROM', '"My App" <noreply@myapp.com>');

        try {
            const info = await this.transporter.sendMail({
                from,
                to,
                subject,
                html,
            });

            this.logger.log(`📧 Email sent to ${to}: ${info.messageId}`);
            return info;
        } catch (error) {
            this.logger.error(`❌ Failed to send email to ${to}`, error.stack);
            throw error;
        }
    }
}