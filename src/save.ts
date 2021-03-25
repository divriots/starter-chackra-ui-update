import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { promises as fs } from 'fs';
import { Doc } from './types';
import path from 'path';

const basePath = '../starter-chakra-ui/';

const docPath = '/doc/index.mdx';

const saveDoc = async (doc: Doc): Promise<boolean> => {
  try {
    await fs.writeFile(path.join(basePath, doc.dsd, docPath), doc.dsdDoc || '');
    return true;
  } catch (error) {
    console.log('error saving doc', doc.chakra, error);
    return false;
  }
};

export const save = async (docsMap: Doc[]): Promise<boolean[]> =>
  Promise.all(docsMap.map(saveDoc));
