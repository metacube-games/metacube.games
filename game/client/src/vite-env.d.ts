/// <reference types="vite/client" />

declare const __WORKER_BUILD__: number;

declare module "*.glb" {
  const value: string;
  export default value;
}

declare module "*.exr" {
  const value: string;
  export default value;
}
