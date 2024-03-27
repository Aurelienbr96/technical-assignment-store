import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";
import { Permission } from "./types";

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue = JSONObject | JSONArray | StoreResult | (() => StoreResult);

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

export interface StoreConstructor extends Function {
  _permissions?: Map<string, Permission>;
}

export class Store implements IStore {
  defaultPolicy: Permission = "rw";
  [key: string]: any;

  allowedToRead(key: string): boolean {
    try {
      const permissions = (this.constructor as StoreConstructor)._permissions;
      const permission = permissions ? permissions.get(key) : undefined;
      return permission ? permission.includes("r") : this.defaultPolicy.includes("r");
    } catch (e) {
      throw new Error("Internal Server Error");
    }
  }

  allowedToWrite(key: string): boolean {
    try {
      const permissions = (this.constructor as StoreConstructor)._permissions;
      const permission = permissions ? permissions.get(key) : undefined;

      return permission ? permission.includes("w") : this.defaultPolicy.includes("w");
    } catch (e) {
      throw new Error("Internal Server Error");
    }
  }

  read(path: string): StoreResult {
    const keys = path.split(":");
    const finalKey = keys.pop();
    const firstKey = keys[0];

    if (finalKey === undefined || !this.allowedToRead(firstKey)) {
      throw new Error(`Reading access denied for key: ${firstKey}`);
    }
    let current = this;

    for (const key of keys) {
      current = current[key];
    }

    return current[finalKey];
  }

  write(path: string, value: StoreValue): StoreValue {
    const keys = path.split(":");
    const finalKey = keys.pop();
    const firstKey = keys[0];

    if (finalKey === undefined || !this.allowedToWrite(firstKey)) {
      throw new Error(`Write access denied for key: ${firstKey}`);
    }

    let current = this;
    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      } else if (typeof current[key] !== "object" || current[key] === null) {
        throw new Error(`Cannot create nested property under non-object key: ${key}`);
      }
      current = current[key];
    }

    current[finalKey] = value;

    return current;
  }

  writeEntries(entries: JSONObject): void {
    const _this = this;
    Object.keys(entries).forEach(function (key) {
      _this.write(key, entries[key]);
    });
  }

  entries(): JSONObject {
    const entries: JSONObject = {};
    for (const [key, value] of this as any) {
      if (this.allowedToRead(key)) {
        entries[key] = value;
      }
    }
    return entries;
  }
}
