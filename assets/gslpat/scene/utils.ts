import { director, gfx } from "cc";


export function uploadTextureData(texture, data) {
    const device = director.root!.device
    let region = new gfx.BufferTextureCopy(undefined, undefined, texture.height, undefined, new gfx.Extent(texture.width, texture.height));
    device.copyBuffersToTexture([data], texture, [region]);
}
