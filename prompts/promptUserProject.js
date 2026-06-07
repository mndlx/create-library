"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptUserProject = void 0;
const p = __importStar(require("@clack/prompts"));
/**
 * Richiedi le informazioni per creare un nuovo progetto.
 * @returns Promise con le informazioni del progetto
 */
const promptUserProject = async () => {
    const __name = () => p.text({
        message: 'Provide a name for your project',
        initialValue: 'my-react-lib',
        validate: (value) => {
            if (!value)
                return 'Please enter a name.';
            if (!/^[a-z0-9._-]+$/.test(value)) {
                return 'Use lowercase letters, numbers, dashes, dots or underscores only.';
            }
        },
    });
    const project = await p.group({
        __name,
    }, {
        onCancel: () => {
            p.cancel('Operation cancelled.');
            process.exit(0);
        },
    });
    return project;
};
exports.promptUserProject = promptUserProject;
