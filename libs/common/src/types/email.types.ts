export interface EmailData {
    template: string;
    context: Record<string, any>;
    subject?: string;
}