import { StoreConstructor } from "../store";
import { Permission } from "../types";

export function Restrict(permission: Permission = "none"): any {
  return function (target: any, propertyKey: string | symbol): void {
    const constructor = target.constructor as StoreConstructor;
    if (!constructor._permissions) {
      constructor._permissions = new Map<string, Permission>();
    }
    constructor._permissions.set(propertyKey as string, permission);
  };
}
