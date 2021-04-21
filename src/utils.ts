import { camelCase, startCase } from "lodash";

// convert alert-dialog -> AlertDialog, link -> Link
export const generateFilename = (chakraName: string) =>
    chakraName === 'chakra-factory' ? 'chakra' : startCase(camelCase(chakraName)).replace(/\s/g, '');

