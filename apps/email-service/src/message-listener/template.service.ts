import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import mjml2html from 'mjml';

@Injectable()
export class TemplateService implements OnModuleInit {
    private readonly logger = new Logger(TemplateService.name);

    // Point this to your static folder
    private readonly baseDir = path.join(process.cwd(), 'static', 'email-templates');
    private readonly templateCache = new Map<string, Handlebars.TemplateDelegate>();
    private layoutSource: string;

    onModuleInit() {
        this.registerPartials();
        this.cacheTemplates();
    }

    private registerPartials() {
        const partialsDir = path.join(this.baseDir, 'partials');
        if (!fs.existsSync(partialsDir)) return;

        fs.readdirSync(partialsDir).forEach((file) => {
            if (file.endsWith('.hbs')) {
                const { name } = path.parse(file);
                const source = fs.readFileSync(path.join(partialsDir, file), 'utf8');
                Handlebars.registerPartial(name, source);
                this.logger.log(`Registered partial: {{> ${name} }}`);
            }
        });
    }

    private cacheTemplates() {
        const layoutPath = path.join(this.baseDir, 'layouts', 'main.hbs');
        if (fs.existsSync(layoutPath)) {
            this.layoutSource = fs.readFileSync(layoutPath, 'utf-8');
        }

        // 2. Scan directories for body.hbs files
        const folders = fs.readdirSync(this.baseDir, { withFileTypes: true });

        folders.forEach((dirent) => {
            if (dirent.isDirectory() && dirent.name !== 'partials' && dirent.name !== 'layouts') {
                const bodyPath = path.join(this.baseDir, dirent.name, 'body.hbs');

                if (fs.existsSync(bodyPath)) {
                    const source = fs.readFileSync(bodyPath, 'utf8');
                    // Cache it using the folder name (e.g., 'welcome')
                    this.templateCache.set(dirent.name, Handlebars.compile(source));
                    this.logger.log(`Cached template: ${dirent.name}`);
                }
            }
        });
    }

    compile(templateName: string, context: any): string {
    const hbsTemplate = this.templateCache.get(templateName);
    if (!hbsTemplate) {
        throw new Error(`Email template "${templateName}" not found`);
    }

    // 1. Render the body content (e.g., welcome/body.hbs)
    const bodyContent = hbsTemplate(context);

    // 2. Wrap it in the layout and compile the layout as HBS
    let finalMjml = '';
    if (this.layoutSource) {
        // Compile the layout string into a Handlebars function
        const layoutTemplate = Handlebars.compile(this.layoutSource);
        
        // Inject the bodyContent into the layout's {{{ body }}} placeholder
        finalMjml = layoutTemplate({
            ...context, // pass variables for header/footer (e.g., name, year)
            body: bodyContent
        });
        console.log(finalMjml)
    } else {
        // Fallback if layout fails to load
        finalMjml = `<mjml><mj-body>${bodyContent}</mj-body></mjml>`;
    }

    // 3. Convert the combined MJML string to HTML
    const { html, errors } = mjml2html(finalMjml);
    // console.log(html);

    if (errors.length > 0) {
        this.logger.error(`MJML Errors in ${templateName}: ${JSON.stringify(errors)}`);
        // Log the final MJML to see why it's breaking
        this.logger.debug(`Final MJML generated:\n${finalMjml}`);
    }
    return html;
}
}