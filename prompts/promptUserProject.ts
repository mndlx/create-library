import { Terminal } from '@virtual-registry/mandolin';
import { ProjectState } from '../types/index';

const DEFAULT_NAME = 'my-react-lib';

/**
 * Normalizza l'input in un nome di pacchetto valido (lowercase, set ridotto di caratteri).
 */
const normalizeName = (raw: string): string => {
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
export const promptUserProject = async (): Promise<ProjectState> => {
    const wizard = new Terminal<ProjectState>();

    wizard.initState({ __name: '' });
    wizard.newLine(`Provide a name for your project (default: ${DEFAULT_NAME})`);
    wizard.newInputLine((input, state) => ({ ...state, __name: normalizeName(input) }));

    await wizard.draw({ clean: true });

    return wizard.state ?? { __name: DEFAULT_NAME };
};
