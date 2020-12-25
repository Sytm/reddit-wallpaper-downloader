declare module "home" {
  declare function home(): string;

  declare namespace home {
    export function resolve(...paths: string[]): string;
  }

  export = home
}