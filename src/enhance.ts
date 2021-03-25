import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { Doc } from './types';

export const enhanceDoc = (chakraDoc?: string): Promise<string> => {
  // transformation goes here
  return Promise.resolve(chakraDoc || '');
};

export const enhance = async (docsMap: Doc[]): Promise<Doc[]> =>
  Promise.all(
    docsMap.map(async (doc: Doc) => ({
      dsdDoc: await enhanceDoc(doc.chakraDoc),
      ...doc,
    }))
  );
