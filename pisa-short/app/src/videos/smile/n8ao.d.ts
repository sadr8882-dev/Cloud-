declare module "n8ao" {
  import { Pass } from "postprocessing";
  export class N8AOPostPass extends Pass { constructor(scene: unknown, camera: unknown, w?: number, h?: number); configuration: Record<string, number | boolean>; }
}
