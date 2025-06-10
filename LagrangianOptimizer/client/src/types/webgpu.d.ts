/// <reference types="@webgpu/types" />

declare global {
  interface Navigator {
    readonly gpu?: GPU;
  }
}

export {}; 