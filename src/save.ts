import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { promises as fs } from 'fs';
import { Doc } from './types';
import path from 'path';

const basePath = '../starter-chakra-ui/';

const docDir = '/doc';
const docName = 'index.mdx';

const saveDoc = async (doc: Doc): Promise<boolean> => {
  try {
    const docPath = path.join(basePath, doc.dsd, docDir);
    await fs.mkdir(docPath, { recursive: true });
    await fs.writeFile(path.join(docPath, docName), doc.dsdDoc || '');
    return true;
  } catch (error) {
    console.log('error saving doc', doc.chakra, error);
    return false;
  }
};

export const save = async (docsMap: Doc[]): Promise<boolean[]> =>
  Promise.all(docsMap.map(saveDoc));
