import { transliterate } from 'transliteration';
import { READ_SA_TOKEN, ADMIN_SA_TOKEN, ADMIN_LIST } from './constants';

interface TokenToHeadersOptions {
  headerPrefix: string;
}

export function tokenToHeaders(
  data: Record<string, unknown>,
  options: TokenToHeadersOptions,
  host: string,
): Record<string, string> {
  const output: Record<string, string> = {};
  function processObject(prefix: string, obj: Record<string, unknown>) {
    Object.entries(obj).forEach(([k, v]) => {
      const formattedKey = formatKey(k);
      let formattedValue = formatSimpleValue(v);
      if (formattedValue === null) {
        if (isObject(v)) {
          processObject(`${prefix + formattedKey}.`, v);
        }
      } else {
        // remove special characters from sn, cn, givenName and login
        if (['sn', 'cn', 'givenname', 'login'].includes(formattedKey.toLowerCase())) {
          formattedValue = transliterate(formattedValue);
        }

        output[prefix + formattedKey] = formattedValue;

        if (formattedKey === "Common-Name") {
          console.log("common-name found: ", formattedValue); 
          console.log("comparing with admin list: ", ADMIN_LIST); 
          console.log(ADMIN_LIST.includes(formattedValue)); 
          if (ADMIN_LIST.includes(formattedValue)) {
            output["Authorization"] = "Bearer".concat(" ", ADMIN_SA_TOKEN); 
          } else {
            output["Authorization"] = "Bearer".concat(" ", READ_SA_TOKEN); 
          }
        }
      }
    });
  }
  console.log("Token to headers");
  processObject(options.headerPrefix, data);

  if (host.includes("headlamp-readonly")) {
    output["Authorization"] = "Bearer".concat(" ", READ_SA_TOKEN); 
  }

  console.log("END token to headers"); 
  console.log("Output headers;");
  console.log(output);

  return output;
}

function formatKey(key: string): string {
  return key
    .split(/[^A-Za-z0-9]+/)
    .map(upperCaseFirst)
    .join('-');
}

function formatSimpleValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value
      .map(formatSimpleValue)
      .filter((x) => x !== null)
      .join(',');
  }
  return null;
}

function upperCaseFirst(str: string): string {
  return str.substring(0, 1).toUpperCase() + str.substring(1);
}

function isObject(obj: unknown): obj is Record<string, unknown> {
  return !!obj && typeof obj === 'object';
}
