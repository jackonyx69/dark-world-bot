function cleanObject(val: any): any {
  if (Array.isArray(val)) {
    return val.map(cleanObject);
  }
  if (val !== null && typeof val === "object") {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === "adTimer" && v === null) {
        // adTimer schema is .optional() so null must be omitted/undefined
        continue;
      }
      res[k] = cleanObject(v);
    }
    return res;
  }
  return val;
}

export function serialize<T>(value: T): unknown {
  const json = JSON.parse(JSON.stringify(value));
  return cleanObject(json);
}
