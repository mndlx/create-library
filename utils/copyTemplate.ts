import * as fs from 'fs';

/**
 * Copia ricorsivamente il template nella cartella di destinazione.
 * @param templateDir   Percorso assoluto del template sorgente
 * @param projectPath   Percorso assoluto del progetto da creare
 */
export const copyTemplate = (templateDir: string, projectPath: string) => {
    if (!fs.existsSync(templateDir)) {
        throw new Error(`Template directory not found: ${templateDir}`);
    }
    if (fs.existsSync(projectPath)) {
        throw new Error(`Target directory already exists: ${projectPath}`);
    }
    fs.cpSync(templateDir, projectPath, { recursive: true });
};
