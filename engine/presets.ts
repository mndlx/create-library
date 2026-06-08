import * as fs from 'fs';
import { GenerationConfig } from './types';

/** Persist a generation config (preset) to disk. */
export const savePreset = (file: string, config: GenerationConfig): void =>
    fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');

/** Read a generation config (preset) from disk. */
export const loadPreset = (file: string): GenerationConfig =>
    JSON.parse(fs.readFileSync(file, 'utf8')) as GenerationConfig;
