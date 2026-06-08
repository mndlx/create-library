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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scaffoldTemplate = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const manifest_1 = require("./manifest");
/** Create a new template skeleton (manifest + minimal payload). Returns its directory. */
const scaffoldTemplate = ({ rootDir, name, title, description }) => {
    const templateDir = path.join(rootDir, name);
    if (fs.existsSync(templateDir))
        throw new Error(`Template already exists: ${templateDir}`);
    const payloadDir = path.join(templateDir, 'template');
    fs.mkdirSync(payloadDir, { recursive: true });
    const manifest = {
        name,
        title: title || name,
        description: description || '',
        version: '1.0.0',
        source: 'template',
        nameVar: 'name',
        prompts: [
            {
                name: 'name',
                message: 'Provide a name for your project',
                type: 'text',
                default: 'my-app',
                token: 'REPLACE',
                validate: 'packageName',
            },
        ],
        detokenize: { exclude: [] },
        packageJson: {},
        hooks: { postGenerate: [] },
        nextSteps: ['cd __REPLACE__', 'npm install'],
    };
    fs.writeFileSync(path.join(templateDir, manifest_1.MANIFEST_FILENAME), JSON.stringify(manifest, null, 2) + '\n');
    fs.writeFileSync(path.join(payloadDir, 'package.json'), JSON.stringify({ name: '__REPLACE__', version: '0.0.0', private: true }, null, 2) + '\n');
    fs.writeFileSync(path.join(payloadDir, 'README.md'), `# __REPLACE__\n\n${description || 'A new project scaffolded by virtuallab-create-library.'}\n`);
    return templateDir;
};
exports.scaffoldTemplate = scaffoldTemplate;
