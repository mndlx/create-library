import * as p from '@clack/prompts';

/**
 * Richiedi le informazioni per creare un nuovo progetto.
 * @returns Promise con le informazioni del progetto
 */
export const promptUserProject = async () => {
    const __name = () =>
        p.text({
            message: 'Provide a name for your project',
            initialValue: 'my-react-lib',
            validate: (value) => {
                if (!value) return 'Please enter a name.';
                if (!/^[a-z0-9._-]+$/.test(value)) {
                    return 'Use lowercase letters, numbers, dashes, dots or underscores only.';
                }
            },
        });

    const project = await p.group(
        {
            __name,
        },
        {
            onCancel: () => {
                p.cancel('Operation cancelled.');
                process.exit(0);
            },
        }
    );

    return project;
};
