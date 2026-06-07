"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptUserProject = void 0;
const mandolin_1 = require("@virtual-registry/mandolin");
const DEFAULT_NAME = 'my-react-lib';
/**
 * Normalizza l'input in un nome di pacchetto valido (lowercase, set ridotto di caratteri).
 */
const normalizeName = (raw) => {
    const sanitized = (raw || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return sanitized || DEFAULT_NAME;
};
/**
 * Richiedi le informazioni per creare un nuovo progetto.
 * @returns Promise con le informazioni del progetto
 */
const promptUserProject = async () => {
    const wizard = new mandolin_1.Terminal();
    wizard.initState({ __name: '' });
    wizard.newLine(`Provide a name for your project (default: ${DEFAULT_NAME})`);
    wizard.newInputLine((input, state) => ({ ...state, __name: normalizeName(input) }));
    await wizard.draw({ clean: true });
    return wizard.state ?? { __name: DEFAULT_NAME };
};
exports.promptUserProject = promptUserProject;
