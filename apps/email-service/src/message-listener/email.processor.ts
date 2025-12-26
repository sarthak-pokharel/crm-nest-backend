import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TemplateService } from './template.service';
import { MailerService } from './mailer.service';

@Processor('email', {
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
})
export class EmailProcessor extends WorkerHost {
    private readonly logger = new Logger(EmailProcessor.name);

    constructor(
        private readonly templateService: TemplateService,
        private readonly mailerService: MailerService,
        // Add your NotificationLogService here if you've ported it
    ) {
        super();
    }

    async process(job: Job<any>): Promise<any> {
        const { to, subject, templateName, templateData } = job.data;

        try {
            // 1. Generate MJML-powered HTML
            // This uses the memory-cached templates we set up earlier
            const html = this.templateService.compile(templateName, {
                ...templateData,
                year: new Date().getFullYear(),
            });

            // 2. Send via SMTP
            await this.mailerService.send(to, subject, html);

            return { sent: true, to };
        } catch (error) {
            this.logger.error(`Failed job ${job.id} for ${to}: ${error.message}`);
            throw error; // BullMQ will handle the retry based on your backoff config
        }
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.log(`Job ${job.id} completed: Email sent.`);
    }
}