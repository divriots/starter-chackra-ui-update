import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { promises as fs } from 'fs';
import { Doc } from './types';
import path from 'path';
import { generateFilename } from './utils';

const basePath = '../starter-chakra-ui/';

const indexJs = { fileName: 'index.js', dir: '' };
const indexTs = { fileName: 'index.ts', dir: '/src' };
const component = { fileName: '${name}.tsx', dir: '/src' };
const documentation = { fileName: 'index.mdx', dir: '/doc' };
const stories = { fileName: 'index.stories.tsx', dir: '/stories' };

const saveDoc = async (doc: Doc): Promise<boolean> => {
  try {
    const tsxPath = path.join(basePath, doc.dsd, component.dir);
    await fs.mkdir(tsxPath, { recursive: true });
    await fs.writeFile(path.join(tsxPath, component.fileName.replace('${name}', generateFilename(doc.dsd))), doc.tsx || '');

    const indexTsPath = path.join(basePath, doc.dsd, indexTs.dir);
    await fs.mkdir(indexTsPath, { recursive: true });
    await fs.writeFile(path.join(indexTsPath, indexTs.fileName), doc.indexTs || '');

    const indexJsPath = path.join(basePath, doc.dsd, indexJs.dir);
    await fs.mkdir(indexJsPath, { recursive: true });
    await fs.writeFile(path.join(indexJsPath, indexJs.fileName), doc.indexJs || '');

    const docPath = path.join(basePath, doc.dsd, documentation.dir);
    await fs.mkdir(docPath, { recursive: true });
    await fs.writeFile(path.join(docPath, documentation.fileName), doc.dsdDoc || '');

    if (doc.storyDoc) {
      const storiesPath = path.join(basePath, doc.dsd, stories.dir);
      await fs.mkdir(storiesPath, { recursive: true });
      await fs.writeFile(path.join(storiesPath, stories.fileName), doc.storyDoc || '');
    }

    return true;
  } catch (error) {
    console.log('error saving doc', doc.chakra, error);
    return false;
  }
};

export const save = async (docsMap: Doc[]): Promise<boolean[]> =>
  Promise.all(docsMap.map(saveDoc));
